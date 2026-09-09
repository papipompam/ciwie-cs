import { beforeEach, describe, expect, it, vi } from 'vitest'

const input = { outcome: 'confirm', reason: '' }
const staff = { id: 'staff-001', username: 'staff001', role: 'staff' as const, name: 'เจ้าหน้าที่ทดสอบ', status: 'active' as const, sessionVersion: 1 }
const auth = vi.hoisted(() => ({ role: 'staff' as 'staff' | 'lecturer' }))
let requestStatus = 'WAITING_REVIEW'

vi.mock('../server/utils/session', () => ({
  requireUserSession: vi.fn(async (_event: unknown, roles?: readonly string[]) => {
    if (roles && !roles.includes(auth.role)) throw Object.assign(new Error('FORBIDDEN'), { statusCode: 403, statusMessage: 'FORBIDDEN' })
    return { ...staff, role: auth.role }
  }),
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', () => 'REQUEST-001')
vi.stubGlobal('readBody', async () => input)
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const prisma = {
  placementRequest: {
    findFirst: vi.fn(async () => ({
      id: 'REQUEST-001', studentApplicationId: 'APPLICATION-001', enrollmentId: 'ENROLLMENT-001', companySiteId: null,
      companyNameSnapshot: 'บริษัททดสอบ', companyLocationSnapshot: '88 ถนนจิระ', provinceSnapshot: 'บุรีรัมย์',
      latitude: 15, longitude: 103, recipientName: 'ฝ่ายบุคคล', status: requestStatus, positionTitle: 'Backend Intern',
      enrollment: { studentId: 'student-001' }, documents: [{ id: 'DOCUMENT-001' }],
    })),
    updateMany: vi.fn(async ({ where, data }: { where: { status: string }, data: { status: string } }) => {
      if (requestStatus !== where.status) return { count: 0 }
      requestStatus = data.status
      return { count: 1 }
    }),
  },
  province: { upsert: vi.fn(async () => ({ id: 1 })) },
  company: { upsert: vi.fn(async () => ({ id: 'COMPANY-001' })) },
  companySite: { upsert: vi.fn(async () => ({ id: 'SITE-001' })) },
  studentApplication: { update: vi.fn(async () => ({ id: 'APPLICATION-001' })) },
  letterDocumentVersion: { update: vi.fn(async () => ({ id: 'DOCUMENT-001' })) },
  placementRequestStatusHistory: { create: vi.fn(async () => ({})) },
  notification: { create: vi.fn(async () => ({ id: 'NOTIFICATION-001' })) },
  $transaction: vi.fn(async (work: (client: typeof prisma) => Promise<unknown>) => work(prisma)),
}
vi.stubGlobal('usePrisma', () => prisma)

const { default: reviewRequest } = await import('../server/api/placement-requests/[id]/review.patch')

beforeEach(() => {
  input.outcome = 'confirm'
  input.reason = ''
  auth.role = 'staff'
  requestStatus = 'WAITING_REVIEW'
  vi.clearAllMocks()
})

describe('placement request review API', () => {
  it('rejects lecturers because request and document review belongs to staff', async () => {
    auth.role = 'lecturer'
    await expect(reviewRequest({} as Parameters<typeof reviewRequest>[0])).rejects.toMatchObject({ statusCode: 403, statusMessage: 'FORBIDDEN' })
    expect(prisma.placementRequest.findFirst).not.toHaveBeenCalled()
  })

  it('confirms a valid company response and notifies its student', async () => {
    await expect(reviewRequest({} as Parameters<typeof reviewRequest>[0])).resolves.toMatchObject({ status: 'confirmed' })
    expect(requestStatus).toBe('CONFIRMED')
    expect(prisma.placementRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companySiteId: 'SITE-001' }),
    }))
    expect(prisma.studentApplication.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { companySiteId: 'SITE-001' },
    }))
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'COMPANY_RESPONSE_CONFIRMED', recipients: { create: [{ accountId: 'student-001' }] } }),
    }))
  })

  it('requires a reason when returning a response for correction', async () => {
    input.outcome = 'return'
    input.reason = ' '
    await expect(reviewRequest({} as Parameters<typeof reviewRequest>[0])).rejects.toMatchObject({ statusCode: 400, statusMessage: 'RETURN_REASON_REQUIRED' })
  })
})
