import { describe, expect, it, vi } from 'vitest'

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => ({ id: 'staff-001', role: 'staff' })) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getQuery', () => ({ cycleId: 'CYCLE-1' }))
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const prisma = {
  cycleEnrollment: { findMany: vi.fn(async () => [
    { id: 'E1', placementRequests: [{ status: 'CONFIRMED' }], trackedApplications: [{ status: 'COMPLETED' }] },
    { id: 'E2', placementRequests: [{ status: 'SUBMITTED' }], trackedApplications: [{ status: 'COMPLETED' }] },
    { id: 'E3', placementRequests: [], trackedApplications: [] },
  ]) },
  placementRequest: {
    count: vi.fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2),
    findMany: vi.fn(async () => [{ companySiteId: 'SITE-1' }, { companySiteId: 'SITE-2' }]),
  },
  supervisionGroupCompany: { findMany: vi.fn(async () => [{ companySiteId: 'SITE-1' }]) },
  supervisionAppointment: { count: vi.fn(async () => 4) },
  $transaction: vi.fn(async (items: Promise<unknown>[]) => Promise.all(items)),
}
vi.stubGlobal('usePrisma', () => prisma)

const { default: staffDashboard } = await import('../server/api/staff/dashboard.get')

describe('staff dashboard API', () => {
  it('returns mutually exclusive student donut data and operational counts', async () => {
    const result = await staffDashboard({} as Parameters<typeof staffDashboard>[0])
    expect(result.students).toEqual({ confirmed: 1, pending: 1, notStarted: 1, total: 3 })
    expect(result.cards).toEqual({ waitingLetters: 1, waitingReview: 2, unassignedRoundOne: 1, publishedAppointments: 4 })
  })
})
