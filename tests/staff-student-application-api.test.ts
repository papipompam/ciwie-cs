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

const now = new Date('2026-09-09T01:00:00.000Z')
const application = {
  id: 'APP-001', enrollmentId: 'ENROLLMENT-001', companySiteId: null, companyNameSnapshot: 'บริษัททดสอบ',
  companyLocation: 'บุรีรัมย์', recipientNameSnapshot: 'ผู้จัดการฝ่ายบุคคล', letterAddressSnapshot: 'บุรีรัมย์ 31000',
  latitude: 14.99, longitude: 103.1, provinceSnapshot: 'บุรีรัมย์', positionTitle: 'Backend Intern',
  appliedDate: new Date('2026-09-09T00:00:00.000Z'), status: 'SUBMITTED', activeSlotKey: 'ENROLLMENT-001',
  details: null, responseDate: null, createdAt: now, updatedAt: now,
  enrollment: { student: { username: '66123456701' } },
}
const prisma = {
  studentApplication: { findMany: vi.fn(async () => [application]), count: vi.fn(async () => 1) },
  $transaction: vi.fn(async (items: Promise<unknown>[]) => Promise.all(items)),
}
vi.stubGlobal('usePrisma', () => prisma)

const { default: listApplications } = await import('../server/api/staff/student-applications.get')

describe('staff student application API', () => {
  it('lists applications across students with the owning student code', async () => {
    const result = await listApplications({} as Parameters<typeof listApplications>[0])
    expect(result).toEqual([expect.objectContaining({ id: 'APP-001', studentId: '66123456701', companyName: 'บริษัททดสอบ' })])
    expect(setResponseHeaders).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ 'x-total-count': '1' }))
  })
})
