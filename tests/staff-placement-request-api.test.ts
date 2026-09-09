import { describe, expect, it, vi } from 'vitest'

vi.mock('../server/utils/session', () => ({
  requireUserSession: vi.fn(async (_event: unknown, roles?: readonly string[]) => {
    if (!roles?.includes('staff')) throw Object.assign(new Error('FORBIDDEN'), { statusCode: 403 })
    return { id: 'staff-001', username: 'staff001', role: 'staff', status: 'active', sessionVersion: 1 }
  }),
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getQuery', () => ({ page: '1', pageSize: '20' }))
vi.stubGlobal('setResponseHeaders', vi.fn())
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const submittedAt = new Date('2026-09-09T03:00:00.000Z')
const request = {
  id: 'REQUEST-001',
  enrollmentId: 'ENROLLMENT-001',
  companyNameSnapshot: 'บริษัททดสอบ', companyLocationSnapshot: 'บุรีรัมย์', provinceSnapshot: 'บุรีรัมย์',
  positionTitle: 'Backend Intern', recipientName: 'ผู้จัดการฝ่ายบุคคล', letterAddress: 'บุรีรัมย์ 31000',
  latitude: 14.99, longitude: 103.1, status: 'SUBMITTED', submittedAt, updatedAt: submittedAt,
  studentApplication: { id: 'APP-001', appliedDate: new Date('2026-09-09T00:00:00.000Z') },
  enrollment: { cycleId: 'CYCLE-2569-2', student: { username: '66123456701', namePrefix: 'นาย', firstName: 'ธนกฤต', lastName: 'พูนทรัพย์' } },
}
const prisma = {
  placementRequest: {
    findMany: vi.fn(async () => [request]),
    count: vi.fn(async () => 1),
  },
  $transaction: vi.fn(async (items: Promise<unknown>[]) => Promise.all(items)),
}
vi.stubGlobal('usePrisma', () => prisma)

const { default: listRequests } = await import('../server/api/staff/placement-requests.get')

describe('staff placement request API', () => {
  it('lists submitted student confirmations from persisted snapshots', async () => {
    const result = await listRequests({} as Parameters<typeof listRequests>[0])
    expect(result).toEqual([expect.objectContaining({
      id: 'REQUEST-001', cycleId: 'CYCLE-2569-2', studentName: 'นายธนกฤต พูนทรัพย์', status: 'submitted',
      application: expect.objectContaining({ studentId: '66123456701', companyName: 'บริษัททดสอบ', position: 'Backend Intern' }),
    })])
    expect(setResponseHeaders).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ 'x-total-count': '1' }))
  })
})
