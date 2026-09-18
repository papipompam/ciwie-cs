import { beforeEach, describe, expect, it, vi } from 'vitest'

const staff = { id: 'staff-001', username: 'staff001', role: 'staff' as const, name: 'เจ้าหน้าที่', status: 'active' as const, sessionVersion: 1 }
let body: Record<string, unknown> = {}

const createCycle = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
  id: 'CYCLE-NEW',
  ...data,
}))
const findCycle = vi.fn(async () => null)
let currentCycle = {
  id: 'CYCLE-1', code: '2569-SECOND-2566', label: 'ภาคเรียนที่ 2/2569', academicYear: 2569,
  term: 'SECOND', termLabel: 'ภาคเรียนที่ 2', targetCohortYear: 2566,
  requestStartDate: new Date('2026-06-01T00:00:00.000Z'), requestEndDate: new Date('2026-09-30T00:00:00.000Z'),
  trainingStartDate: new Date('2026-11-01T00:00:00.000Z'), trainingEndDate: new Date('2027-02-28T00:00:00.000Z'),
  status: 'OPEN_FOR_REQUESTS', closedAt: null,
}
const findCycleById = vi.fn(async () => currentCycle)
const updateCycle = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...currentCycle, ...data }))
const createStatusHistory = vi.fn(async () => ({ id: 1n }))
const prisma = {
  coopCycle: { create: createCycle, findFirst: findCycle, findUnique: findCycleById, update: updateCycle },
  coopCycleStatusHistory: { create: createStatusHistory },
  $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback(prisma)),
}

vi.mock('../server/utils/session', () => ({ requireUserSession: vi.fn(async () => staff) }))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('readBody', async () => body)
vi.stubGlobal('getRouterParam', () => 'CYCLE-1')
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))
vi.stubGlobal('usePrisma', () => prisma)

const { default: createCoopCycle } = await import('../server/api/staff/coop-cycles.post')
const { default: updateCoopCycle } = await import('../server/api/staff/coop-cycles/[id].patch')
const { default: changeCoopCycleStatus } = await import('../server/api/staff/coop-cycles/[id]/status.patch')

beforeEach(() => {
  body = {
    academicYear: 2570,
    term: 'SECOND',
    targetCohortYear: 2567,
    requestStart: '2027-06-01',
    requestEnd: '2027-09-30',
    trainingStart: '2027-11-01',
    trainingEnd: '2028-02-28',
  }
  currentCycle = { ...currentCycle, status: 'OPEN_FOR_REQUESTS', closedAt: null }
  vi.clearAllMocks()
})

describe('staff cooperative cycle management API', () => {
  it('creates an open cycle from year, term, cohort and date ranges', async () => {
    const result = await createCoopCycle({} as Parameters<typeof createCoopCycle>[0])

    expect(createCycle).toHaveBeenCalledWith({ data: expect.objectContaining({
      code: '2570-SECOND-2567',
      label: 'ภาคเรียนที่ 2/2570',
      academicYear: 2570,
      term: 'SECOND',
      termLabel: 'ภาคเรียนที่ 2',
      targetCohortYear: 2567,
      status: 'OPEN_FOR_REQUESTS',
    }) })
    expect(result).toMatchObject({ id: 'CYCLE-NEW', status: 'open' })
  })

  it('allows a cycle without training dates', async () => {
    body.trainingStart = undefined
    body.trainingEnd = undefined
    await createCoopCycle({} as Parameters<typeof createCoopCycle>[0])

    expect(createCycle).toHaveBeenCalledWith({ data: expect.objectContaining({ trainingStartDate: null, trainingEndDate: null }) })
  })

  it('rejects a training period that starts before requests close', async () => {
    body.trainingStart = '2027-09-01'
    await expect(createCoopCycle({} as Parameters<typeof createCoopCycle>[0])).rejects.toBeTruthy()
    expect(createCycle).not.toHaveBeenCalled()
  })

  it('updates cycle details after the cycle is open', async () => {
    const result = await updateCoopCycle({} as Parameters<typeof updateCoopCycle>[0])

    expect(updateCycle).toHaveBeenCalledWith({
      where: { id: 'CYCLE-1' },
      data: expect.objectContaining({ academicYear: 2570, term: 'SECOND', targetCohortYear: 2567 }),
    })
    expect(result).toMatchObject({ id: 'CYCLE-1', academicYear: 2570, status: 'open' })
  })

  it('moves an open cycle to closed for requests and records the reason atomically', async () => {
    body = { status: 'closed_to_requests', reason: 'ครบกำหนดรับคำร้อง' }
    const result = await changeCoopCycleStatus({} as Parameters<typeof changeCoopCycleStatus>[0])

    expect(updateCycle).toHaveBeenCalledWith({ where: { id: 'CYCLE-1' }, data: { status: 'CLOSED_TO_REQUESTS', closedAt: null } })
    expect(createStatusHistory).toHaveBeenCalledWith({ data: expect.objectContaining({
      cycleId: 'CYCLE-1', fromStatus: 'OPEN_FOR_REQUESTS', toStatus: 'CLOSED_TO_REQUESTS', changedById: 'staff-001',
    }) })
    expect(result).toMatchObject({ status: 'closed_to_requests' })
  })

  it('changes status without requiring a reason from the staff user', async () => {
    body = { status: 'closed_to_requests' }
    await changeCoopCycleStatus({} as Parameters<typeof changeCoopCycleStatus>[0])

    expect(createStatusHistory).toHaveBeenCalledWith({ data: expect.objectContaining({ reason: 'เปลี่ยนสถานะโดยเจ้าหน้าที่' }) })
  })

  it('allows staff to correct a cycle status back to an earlier state', async () => {
    currentCycle = { ...currentCycle, status: 'TRAINING' }
    body = { status: 'open' }
    const result = await changeCoopCycleStatus({} as Parameters<typeof changeCoopCycleStatus>[0])

    expect(updateCycle).toHaveBeenCalledWith({ where: { id: 'CYCLE-1' }, data: { status: 'OPEN_FOR_REQUESTS', closedAt: null } })
    expect(result).toMatchObject({ status: 'open' })
  })
})
