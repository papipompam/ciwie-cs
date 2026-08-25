import type { PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { SessionActor } from '../../shared/types/api'
import type { DomainError } from '../../server/domain/errors'
import { authorizeExportDownload, createExportJob, generateExport, processNextExportJob } from '../../server/services/export-service'
import { confirmStudentImport } from '../../server/services/student-import-service'

const admin: SessionActor = { userId: 'admin-1', role: 'ADMIN', active: true, sessionVersion: 1 }
const lecturer: SessionActor = { userId: 'lecturer-1', role: 'LECTURER', active: true, sessionVersion: 1, lecturerId: 'profile-1' }

describe('data job concurrency contracts', () => {
  it('queues export generation instead of doing storage work in the request', async () => {
    const db = {
      coopTerm: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
      exportJob: { create: vi.fn().mockResolvedValue({ id: 'export-1', status: 'PENDING', expiresAt: null }) },
    } as unknown as PrismaClient
    await expect(createExportJob(db, admin, { kind: 'STUDENT_ROSTER', format: 'CSV', coopTermId: 'term-1', filters: { search: '6501' } }))
      .resolves.toEqual({ id: 'export-1', status: 'PENDING', expiresAt: null })
    expect(db.exportJob.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'PENDING', filterSnapshot: { coopTermId: 'term-1', filters: { search: '6501' } } }), select: expect.any(Object) })
  })

  it('does not process an export when another worker won the atomic claim', async () => {
    const db = {
      exportJob: {
        findFirst: vi.fn().mockResolvedValue({ id: 'export-1', status: 'PENDING', createdAt: new Date(), filterSnapshot: {} }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as PrismaClient
    await expect(processNextExportJob(db, { region: 'test', bucket: 'private' })).resolves.toBe(true)
    expect(db.exportJob.updateMany).toHaveBeenCalledWith({ where: { id: 'export-1', status: 'PENDING' }, data: { status: 'PROCESSING', failureReason: null } })
  })

  it('applies internship status and location filters together in the database query', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    const db = { coopTerm: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) }, studentTermEnrollment: { findMany } } as unknown as PrismaClient
    await generateExport(db, admin, { kind: 'INTERNSHIP', format: 'CSV', coopTermId: 'term-1', filters: { status: 'ACTIVE', province: 'เชียงใหม่' } })
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      coopTermId: 'term-1',
      AND: [
        { placement: { status: 'ACTIVE' } },
        { placement: { currentWorkSite: { province: 'เชียงใหม่' } } },
      ],
    }) }))
  })

  it('rejects a concurrent import confirmation that did not win the job claim', async () => {
    const rowData = { studentCode: '65000001', firstNameTh: 'เอ', lastNameTh: 'บี' }
    const db = {
      importJob: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ id: 'import-1', requestedById: 'admin-1', kind: 'STUDENT:term-1', status: 'PREVIEW_READY', processedRows: 0, rows: [{ id: 'row-1', rowNo: 2, status: 'NEW', normalizedData: rowData }] })
          .mockResolvedValueOnce({ status: 'CONFIRMING', processedRows: 0 }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      coopTerm: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
    } as unknown as PrismaClient
    const { hashNormalizedRows } = await import('../../server/services/import-export-service')
    await confirmStudentImport(db, admin, { importId: 'import-1', previewHash: hashNormalizedRows([rowData]), acceptedRowNumbers: [2], coopTermId: 'term-1' })
      .then(() => expect.fail('expected conflict'), error => expect(error).toMatchObject<Partial<DomainError>>({ code: 'CONFLICT' }))
    expect(db.$transaction).toBeUndefined()
  })

  it('revalidates a NEW row inside the import transaction before creating a user', async () => {
    const rowData = { studentCode: '65000001', firstNameTh: 'เอ', lastNameTh: 'บี' }
    const tx = {
      studentProfile: { findUnique: vi.fn().mockResolvedValue({ id: 'student-created-after-preview' }) },
      user: { create: vi.fn() }, importRow: { update: vi.fn() }, importJob: { update: vi.fn() },
    }
    const db = {
      importJob: {
        findUnique: vi.fn().mockResolvedValue({ id: 'import-1', requestedById: 'admin-1', kind: 'STUDENT:term-1', status: 'PREVIEW_READY', processedRows: 0, rows: [{ id: 'row-1', rowNo: 2, status: 'NEW', normalizedData: rowData }] }),
        updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }),
      },
      coopTerm: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => await work(tx)),
    } as unknown as PrismaClient
    const { hashNormalizedRows } = await import('../../server/services/import-export-service')
    await confirmStudentImport(db, admin, { importId: 'import-1', previewHash: hashNormalizedRows([rowData]), acceptedRowNumbers: [2], coopTermId: 'term-1' })
      .then(() => expect.fail('expected conflict'), error => expect(error).toMatchObject<Partial<DomainError>>({ code: 'CONFLICT' }))
    expect(tx.user.create).not.toHaveBeenCalled()
  })

  it('reauthorizes export kind and active term before returning a private file', async () => {
    const fileVersion = { id: 'file-1', objectKey: 'exports/lecturer-1/file.csv' }
    const db = {
      exportJob: { findFirst: vi.fn().mockResolvedValue({ fileVersion, kind: 'STUDENT_ROSTER', filterSnapshot: { coopTermId: 'term-1', filters: {} } }) },
      coopTerm: { findUnique: vi.fn().mockResolvedValue({ isActive: true }) },
    } as unknown as PrismaClient
    await expect(authorizeExportDownload(db, lecturer, 'export-1')).resolves.toBe(fileVersion)
    expect(db.coopTerm.findUnique).toHaveBeenCalledWith({ where: { id: 'term-1' }, select: { isActive: true } })
  })

  it('denies a lecturer download after the export term becomes inactive', async () => {
    const db = {
      exportJob: { findFirst: vi.fn().mockResolvedValue({ fileVersion: { id: 'file-1' }, kind: 'STUDENT_ROSTER', filterSnapshot: { coopTermId: 'term-old', filters: {} } }) },
      coopTerm: { findUnique: vi.fn().mockResolvedValue({ isActive: false }) },
    } as unknown as PrismaClient
    await authorizeExportDownload(db, lecturer, 'export-1')
      .then(() => expect.fail('expected forbidden'), error => expect(error).toMatchObject<Partial<DomainError>>({ code: 'FORBIDDEN' }))
  })
})
