import type { SupervisionExpenseRecord } from '#shared/expenses'

interface PersistedExpense {
  id: string
  fuelAmount: unknown
  roomRate: unknown
  nights: number
  allowanceRate: unknown
  allowanceDays: number
  roomCapacity: number
  lecturerCount: number
  maleLecturerCount: number
  femaleLecturerCount: number
  maleRoomCount: number
  femaleRoomCount: number
  accommodationAmount: unknown
  allowanceAmount: unknown
  totalAmount: unknown
  lecturerSnapshot: unknown
  createdAt: Date
  updatedAt: Date
  group: { id: string, name: string, cycleId: string, round: 'ROUND_1' | 'ROUND_2', companies?: unknown[] | { _count?: number } }
  createdBy: { namePrefix: string, firstName: string, lastName: string }
}

export const expenseRecordInclude = {
  group: { include: { companies: { select: { id: true } } } },
  createdBy: { select: { namePrefix: true, firstName: true, lastName: true } },
} as const

export const toSupervisionExpenseRecord = (expense: PersistedExpense): SupervisionExpenseRecord => {
  const lecturers = Array.isArray(expense.lecturerSnapshot) ? expense.lecturerSnapshot : []
  const companyCount = Array.isArray(expense.group.companies) ? expense.group.companies.length : 0
  return {
    id: expense.id,
    groupId: expense.group.id,
    groupName: expense.group.name,
    cycleId: expense.group.cycleId,
    round: expense.group.round === 'ROUND_1' ? 1 : 2,
    companyCount,
    fuel: Number(expense.fuelAmount),
    roomRate: Number(expense.roomRate),
    nights: expense.nights,
    allowanceRate: Number(expense.allowanceRate),
    allowanceDays: expense.allowanceDays,
    roomCapacity: expense.roomCapacity,
    lecturerCount: expense.lecturerCount,
    maleLecturerCount: expense.maleLecturerCount,
    femaleLecturerCount: expense.femaleLecturerCount,
    maleRoomCount: expense.maleRoomCount,
    femaleRoomCount: expense.femaleRoomCount,
    roomCount: expense.maleRoomCount + expense.femaleRoomCount,
    amounts: {
      fuel: Number(expense.fuelAmount),
      accommodation: Number(expense.accommodationAmount),
      allowance: Number(expense.allowanceAmount),
    },
    total: Number(expense.totalAmount),
    lecturers: lecturers as SupervisionExpenseRecord['lecturers'],
    createdBy: `${expense.createdBy.namePrefix}${expense.createdBy.firstName} ${expense.createdBy.lastName}`.trim(),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  }
}
