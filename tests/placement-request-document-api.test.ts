import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const storageRoot = await mkdtemp(join(tmpdir(), 'cwie-documents-'))
const requestContext = { id: 'REQUEST-001', documentId: 'DOCUMENT-001', kind: 'company-response' }
const student = { id: 'student-001', username: '66123456701', role: 'student' as const, name: 'นักศึกษาทดสอบ', status: 'active' as const, sessionVersion: 1 }
let currentStatus = 'WAITING_RESPONSE'
let createdDocument: Record<string, unknown> | null = null
let fileMime = 'application/pdf'

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => student) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', (_event: unknown, name: string) => name === 'documentId' ? requestContext.documentId : requestContext.id)
vi.stubGlobal('getRequestHeader', vi.fn(() => 'multipart/form-data; boundary=test'))
vi.stubGlobal('readMultipartFormData', vi.fn(async () => [
  { name: 'kind', data: Buffer.from(requestContext.kind) },
  { name: 'file', filename: 'หนังสือตอบรับ.pdf', type: fileMime, data: Buffer.from('%PDF-1.4\ntest document') },
]))
vi.stubGlobal('useRuntimeConfig', () => ({ fileStorageRoot: storageRoot }))
vi.stubGlobal('setResponseHeader', vi.fn())
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const prisma = {
  placementRequest: {
    findFirst: vi.fn(async () => ({ id: requestContext.id, status: currentStatus, companyNameSnapshot: 'บริษัททดสอบ', enrollment: { studentId: student.id, student: { namePrefix: 'นาย', firstName: 'นักศึกษา', lastName: 'ทดสอบ' } } })),
    update: vi.fn(async ({ data }: { data: { status: string } }) => { currentStatus = data.status; return { id: requestContext.id } }),
  },
  user: {
    findMany: vi.fn(async () => [{ id: 'staff-001' }, { id: 'staff-002' }]),
  },
  notification: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'NOTIFICATION-001', ...data })),
  },
  letterDocumentVersion: {
    findFirst: vi.fn(async ({ where }: { where: { id?: string } }) => where.id && createdDocument
      ? { ...createdDocument, placementRequest: { enrollment: { studentId: student.id } } }
      : null),
    updateMany: vi.fn(async () => ({ count: 0 })),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      createdDocument = { id: 'DOCUMENT-001', ...data, uploadedAt: new Date('2026-09-09T03:00:00.000Z') }
      return createdDocument
    }),
  },
  $transaction: vi.fn(async (work: (client: typeof prisma) => Promise<unknown>) => work(prisma)),
}
vi.stubGlobal('usePrisma', () => prisma)

const { default: uploadDocument } = await import('../server/api/placement-requests/[id]/documents.post')
const { default: downloadDocument } = await import('../server/api/placement-requests/[id]/documents/[documentId].get')

beforeEach(() => {
  currentStatus = 'WAITING_RESPONSE'
  createdDocument = null
  fileMime = 'application/pdf'
  prisma.letterDocumentVersion.create.mockClear()
  prisma.notification.create.mockClear()
})
afterAll(() => rm(storageRoot, { recursive: true, force: true }))

describe('placement request document API', () => {
  it('stores a validated company response and advances it to staff review', async () => {
    const result = await uploadDocument({ node: { req: { headers: {} } } } as Parameters<typeof uploadDocument>[0])
    expect(result).toMatchObject({ id: 'DOCUMENT-001', name: 'หนังสือตอบรับ.pdf' })
    expect(currentStatus).toBe('WAITING_REVIEW')
    expect(prisma.letterDocumentVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ documentType: 'COMPANY_RESPONSE', validationStatus: 'VALID', versionNumber: 1 }),
    }))
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: 'COMPANY_RESPONSE_SUBMITTED',
        placementRequestId: requestContext.id,
        recipients: { create: [{ accountId: 'staff-001' }, { accountId: 'staff-002' }] },
      }),
    }))
    const storageKey = String(createdDocument?.storageKey)
    await expect(readFile(join(storageRoot, storageKey), 'utf8')).resolves.toContain('%PDF-1.4')
    const downloaded = await downloadDocument({} as Parameters<typeof downloadDocument>[0])
    expect(downloaded.toString('utf8')).toContain('%PDF-1.4')
    expect(setResponseHeader).toHaveBeenCalledWith(expect.anything(), 'content-type', 'application/pdf')
  })

  it('rejects a response before staff has issued the outgoing request', async () => {
    currentStatus = 'SUBMITTED'
    await expect(uploadDocument({ node: { req: { headers: {} } } } as Parameters<typeof uploadDocument>[0])).rejects.toMatchObject({ statusCode: 409, statusMessage: 'DOCUMENT_UPLOAD_NOT_ALLOWED' })
    expect(prisma.letterDocumentVersion.create).not.toHaveBeenCalled()
  })

  it('accepts a generic binary upload when its extension and PDF signature are valid', async () => {
    fileMime = 'application/octet-stream'
    await expect(uploadDocument({ node: { req: { headers: {} } } } as Parameters<typeof uploadDocument>[0])).resolves.toMatchObject({ id: 'DOCUMENT-001' })
  })
})
