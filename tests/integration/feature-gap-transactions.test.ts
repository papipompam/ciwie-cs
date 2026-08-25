import type { PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../../server/domain/errors'
import { changeUserStatus } from '../../server/services/admin-identity-service'
import { createEvaluationTemplate, publishEvaluationTemplateVersion } from '../../server/services/evaluation-template-service'
import { createStudentApplication, mergeOrganization, previewOrganizationMerge } from '../../server/services/organization-service'

const admin: SessionActor = { userId: 'admin-user', role: 'ADMIN', active: true, sessionVersion: 1 }
const lecturer: SessionActor = { userId: 'lecturer-user', role: 'LECTURER', active: true, sessionVersion: 1, lecturerId: 'lecturer-1' }
const student: SessionActor = { userId: 'student-user', role: 'STUDENT', active: true, sessionVersion: 1, studentTermId: 'student-term-1' }

function databaseWithTransaction(tx: Record<string, unknown>, outer: Record<string, unknown> = {}): PrismaClient {
  return { ...outer, $transaction: vi.fn(async (work: (client: unknown) => unknown) => await work(tx)) } as unknown as PrismaClient
}

function expectDomainCode(error: unknown, code: string): void {
  expect(error).toBeInstanceOf(DomainError)
  expect((error as DomainError).code).toBe(code)
}

describe('FR-003 admin identity transaction', () => {
  it('suspends with optimistic status/version, revokes sessions and audits', async () => {
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'user-1', status: 'ACTIVE', sessionVersion: 3 }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      userSession: { updateMany: vi.fn() },
      auditLog: { create: vi.fn() },
    }
    await expect(changeUserStatus(databaseWithTransaction(tx), admin, 'user-1', 'SUSPEND', 'Left the program'))
      .resolves.toEqual({ id: 'user-1', status: 'SUSPENDED' })
    expect(tx.user.updateMany).toHaveBeenCalledWith({ where: { id: 'user-1', status: 'ACTIVE', sessionVersion: 3 }, data: { status: 'SUSPENDED', sessionVersion: { increment: 1 } } })
    expect(tx.userSession.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-1', revokedAt: null }, data: { revokedAt: expect.any(Date) } })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'USER_SUSPENDED', reason: 'Left the program' }) })
  })

  it('rejects non-admin before opening a transaction', async () => {
    const transaction = vi.fn()
    await changeUserStatus({ $transaction: transaction } as unknown as PrismaClient, lecturer, 'user-1', 'SUSPEND', 'No access')
      .then(() => expect.fail('expected forbidden'), error => expectDomainCode(error, 'FORBIDDEN'))
    expect(transaction).not.toHaveBeenCalled()
  })
})

describe('FR-010 student application transaction', () => {
  it('creates application, initial history and audit for the actor active term', async () => {
    const tx = {
      studentTermEnrollment: { findFirst: vi.fn().mockResolvedValue({ id: 'student-term-1', coopTermId: 'term-1' }) },
      workSite: { findFirst: vi.fn().mockResolvedValue({ id: 'site-1', organizationId: 'org-1' }) },
      organizationContact: { findFirst: vi.fn().mockResolvedValue({ id: 'contact-1', organizationId: 'org-1', workSiteId: 'site-1', name: 'HR' }) },
      fileVersion: { findMany: vi.fn().mockResolvedValue([{ id: 'file-version-1' }]) },
      application: { create: vi.fn().mockResolvedValue({ id: 'application-1', status: 'SUBMITTED' }) },
      applicationStatusHistory: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    }
    await expect(createStudentApplication(databaseWithTransaction(tx), student, { studentTermId: 'student-term-1', workSiteId: 'site-1', contactId: 'contact-1', positionTitle: 'Software Developer', appliedAt: '2026-08-01', evidenceFileVersionIds: ['file-version-1'] }))
      .resolves.toEqual({ id: 'application-1', status: 'SUBMITTED' })
    expect(tx.fileVersion.findMany).toHaveBeenCalledWith({ where: { id: { in: ['file-version-1'] }, createdById: 'student-user', scanStatus: 'CLEAN' }, select: { id: true } })
    expect(tx.application.create).toHaveBeenCalledWith({ data: expect.objectContaining({ positionTitle: 'Software Developer', appliedAt: new Date('2026-08-01T00:00:00.000Z'), evidenceFiles: { create: [{ fileVersionId: 'file-version-1' }] } }), select: { id: true, status: true } })
    expect(tx.applicationStatusHistory.create).toHaveBeenCalled()
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'APPLICATION_CREATED', actorId: 'student-user' }) })
  })

  it('hides another student term without querying the database', async () => {
    const transaction = vi.fn()
    await createStudentApplication({ $transaction: transaction } as unknown as PrismaClient, student, { studentTermId: 'student-term-other', workSiteId: 'site-1', positionTitle: 'Developer', appliedAt: '2026-08-01', evidenceFileVersionIds: [] })
      .then(() => expect.fail('expected not found'), error => expectDomainCode(error, 'NOT_FOUND'))
    expect(transaction).not.toHaveBeenCalled()
  })

  it('rejects evidence that is not both clean and owned by the student before creating the application', async () => {
    const tx = {
      studentTermEnrollment: { findFirst: vi.fn().mockResolvedValue({ id: 'student-term-1', coopTermId: 'term-1' }) },
      workSite: { findFirst: vi.fn().mockResolvedValue({ id: 'site-1', organizationId: 'org-1' }) },
      fileVersion: { findMany: vi.fn().mockResolvedValue([]) },
      application: { create: vi.fn() },
    }
    await createStudentApplication(databaseWithTransaction(tx), student, { studentTermId: 'student-term-1', workSiteId: 'site-1', positionTitle: 'Developer', appliedAt: '2026-08-01', evidenceFileVersionIds: ['foreign-file'] })
      .then(() => expect.fail('expected validation failure'), error => expectDomainCode(error, 'VALIDATION_FAILED'))
    expect(tx.application.create).not.toHaveBeenCalled()
  })
})

describe('FR-011/012 organization duplicate preview and merge', () => {
  it('shows deterministic work-site conflicts without writing', async () => {
    const organization = { findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => where.id === 'source'
      ? Promise.resolve({ id: 'source', nameTh: 'ต้นทาง', isActive: true, workSites: [{ name: 'สำนักงานใหญ่', normalizedName: 'สำนักงานใหญ่' }], _count: { contacts: 2, aliases: 1 } })
      : Promise.resolve({ id: 'target', nameTh: 'ปลายทาง', isActive: true, workSites: [{ name: 'สำนักงานใหญ่', normalizedName: 'สำนักงานใหญ่' }] })) }
    await expect(previewOrganizationMerge({ organization } as unknown as PrismaClient, admin, 'source', 'target'))
      .resolves.toEqual(expect.objectContaining({ affected: { workSites: 1, contacts: 2, aliases: 1 }, conflicts: ['สำนักงานใหญ่'] }))
  })

  it('repoints source data, deactivates source and appends merge history/audit atomically', async () => {
    const sourcePreview = { id: 'source', nameTh: 'ต้นทาง', normalizedName: 'ต้นทาง', isActive: true, workSites: [], _count: { contacts: 1, aliases: 0 } }
    const targetPreview = { id: 'target', nameTh: 'ปลายทาง', normalizedName: 'ปลายทาง', isActive: true, workSites: [] }
    const sourceDetail = { ...sourcePreview, contacts: [], aliases: [] }
    const outer = { organization: { findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => Promise.resolve(where.id === 'source' ? sourcePreview : targetPreview)) } }
    const tx = {
      $queryRaw: vi.fn(),
      organization: {
        findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) => Promise.resolve(where.id === 'source' ? sourceDetail : targetPreview)),
        update: vi.fn(),
      },
      organizationAlias: { findUnique: vi.fn().mockResolvedValue(null), updateMany: vi.fn(), create: vi.fn(), update: vi.fn() },
      workSite: { updateMany: vi.fn() },
      organizationContact: { updateMany: vi.fn() },
      organizationMergeHistory: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    }
    await expect(mergeOrganization(databaseWithTransaction(tx, outer), admin, 'source', 'target', 'Duplicate record'))
      .resolves.toEqual({ sourceId: 'source', targetId: 'target' })
    expect(tx.workSite.updateMany).toHaveBeenCalledWith({ where: { organizationId: 'source' }, data: { organizationId: 'target' } })
    expect(tx.organization.update).toHaveBeenCalledWith({ where: { id: 'source' }, data: { isActive: false, updatedById: 'admin-user' } })
    expect(tx.organizationMergeHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sourceOrganizationId: 'source', targetOrganizationId: 'target', reason: 'Duplicate record' }) })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'ORGANIZATION_MERGED' }) })
  })
})

describe('FR-050 immutable template version workflow', () => {
  it('creates a draft version with normalized item code, content hash and audit', async () => {
    const tx = {
      evaluationTemplate: { create: vi.fn().mockResolvedValue({ id: 'template-1', versions: [{ id: 'version-1', version: 1 }] }) },
      auditLog: { create: vi.fn() },
    }
    const input = { code: 'student_main', subject: 'STUDENT' as const, name: 'แบบประเมิน', items: [{ code: 'q1', label: 'คะแนน', answerType: 'SCORE' as const, required: true, maxScore: 5, weight: 1 }] }
    await expect(createEvaluationTemplate(databaseWithTransaction(tx), admin, input)).resolves.toEqual({ id: 'template-1', versionId: 'version-1', version: 1 })
    expect(tx.evaluationTemplate.create).toHaveBeenCalledWith({ data: expect.objectContaining({ code: 'STUDENT_MAIN', versions: { create: expect.objectContaining({ version: 1, contentHash: expect.stringMatching(/^[a-f0-9]{64}$/), items: { create: [expect.objectContaining({ code: 'Q1', sortOrder: 1 })] } }) } }), include: expect.any(Object) })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'EVALUATION_TEMPLATE_CREATED' }) })
  })

  it('refuses to publish an already published immutable version', async () => {
    const tx = {
      $queryRaw: vi.fn(),
      evaluationTemplateVersion: {
        findUnique: vi.fn().mockResolvedValue({ id: 'version-1', status: 'PUBLISHED', templateId: 'template-1', items: [{}], template: { isActive: true } }),
        updateMany: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    }
    await publishEvaluationTemplateVersion(databaseWithTransaction(tx), admin, 'version-1')
      .then(() => expect.fail('expected invalid state'), error => expectDomainCode(error, 'INVALID_STATE'))
    expect(tx.evaluationTemplateVersion.updateMany).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })
})
