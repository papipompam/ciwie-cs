import { beforeEach, describe, expect, it, vi } from 'vitest'

let body = {
  fuel: 1000,
  roomRate: 1200,
  nights: 2,
  allowanceRate: 500,
  allowanceDays: 2,
  roomCapacity: 2,
}

const group = {
  id: 'GROUP-1', name: 'สายบุรีรัมย์ 1', cycleId: 'CYCLE-1', round: 'ROUND_1',
  lecturers: [
    { lecturer: { id: 'LECTURER-M', namePrefix: 'อาจารย์', firstName: 'ชาย', lastName: 'ทดสอบ', gender: 'MALE' } },
    { lecturer: { id: 'LECTURER-F', namePrefix: 'อาจารย์', firstName: 'หญิง', lastName: 'ทดสอบ', gender: 'FEMALE' } },
  ],
  companies: [{ companySiteId: 'SITE-1' }, { companySiteId: 'SITE-2' }],
}

const findGroup = vi.fn(async () => group)
const upsertExpense = vi.fn(async ({ create }: { create: Record<string, unknown> }) => ({
  ...create,
  id: 'EXPENSE-1',
  createdAt: new Date('2026-09-09T10:00:00.000Z'),
  updatedAt: new Date('2026-09-09T10:00:00.000Z'),
  createdBy: { namePrefix: 'นางสาว', firstName: 'พิมพ์ชนก', lastName: 'ใจดี' },
  group: { id: group.id, name: group.name, cycleId: group.cycleId, round: group.round },
}))
const createAudit = vi.fn(async () => ({ id: 1n }))
const findExpenses = vi.fn(async () => [])

vi.mock('../server/utils/session', () => ({
  requireUserSession: vi.fn(async () => ({ id: 'STAFF-1', username: 'staff', role: 'staff' })),
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', () => 'GROUP-1')
vi.stubGlobal('readBody', async () => body)
vi.stubGlobal('getQuery', () => ({ cycleId: 'CYCLE-1', round: '1' }))
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))
vi.stubGlobal('usePrisma', () => ({
  supervisionGroup: { findFirst: findGroup, findMany: vi.fn(async () => [group]) },
  supervisionExpense: { upsert: upsertExpense, findMany: findExpenses },
  auditLog: { create: createAudit },
  $transaction: vi.fn(async (callback: (transaction: unknown) => unknown) => callback({
    supervisionGroup: { findFirst: findGroup },
    supervisionExpense: { upsert: upsertExpense },
    auditLog: { create: createAudit },
  })),
}))

const { default: saveExpense } = await import('../server/api/staff/expenses/[groupId].put')
const { default: listExpenses } = await import('../server/api/staff/expenses.get')

beforeEach(() => {
  vi.clearAllMocks()
  group.lecturers[0]!.lecturer.gender = 'MALE'
  body = { fuel: 1000, roomRate: 1200, nights: 2, allowanceRate: 500, allowanceDays: 2, roomCapacity: 2 }
})

describe('staff supervision expense API', () => {
  it('calculates and stores expenses from the lecturers assigned to an AI supervision line', async () => {
    const result = await saveExpense({} as Parameters<typeof saveExpense>[0])

    expect(result).toMatchObject({
      groupId: 'GROUP-1', groupName: 'สายบุรีรัมย์ 1', lecturerCount: 2,
      maleRoomCount: 1, femaleRoomCount: 1, roomCount: 2,
      amounts: { fuel: 1000, accommodation: 4800, allowance: 2000 }, total: 7800,
    })
    expect(upsertExpense).toHaveBeenCalledWith(expect.objectContaining({
      where: { groupId: 'GROUP-1' },
      create: expect.objectContaining({ groupId: 'GROUP-1', maleRoomCount: 1, femaleRoomCount: 1, totalAmount: 7800 }),
    }))
    expect(createAudit).toHaveBeenCalled()
  })

  it('rejects saving when an assigned lecturer has no gender', async () => {
    group.lecturers[0]!.lecturer.gender = null as unknown as 'MALE'
    await expect(saveExpense({} as Parameters<typeof saveExpense>[0])).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'LECTURER_GENDER_REQUIRED',
    })
    expect(upsertExpense).not.toHaveBeenCalled()
  })

  it('lists AI supervision lines with their lecturer gender allocation', async () => {
    const result = await listExpenses({} as Parameters<typeof listExpenses>[0])
    expect(result).toEqual({
      groups: [{
        id: 'GROUP-1', name: 'สายบุรีรัมย์ 1', cycleId: 'CYCLE-1', round: 1, companyCount: 2,
        lecturers: [
          { id: 'LECTURER-M', name: 'อาจารย์ชาย ทดสอบ', gender: 'male' },
          { id: 'LECTURER-F', name: 'อาจารย์หญิง ทดสอบ', gender: 'female' },
        ],
      }],
      records: [],
    })
    expect(findExpenses).toHaveBeenCalledWith(expect.objectContaining({
      where: { group: { cycleId: 'CYCLE-1', round: 'ROUND_1' } },
    }))
  })
})
