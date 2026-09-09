import { supervisionExpenseContextSchema } from '#shared/expenses'
import type { SupervisionExpenseGroup, SupervisionExpensesResponse } from '#shared/expenses'
import { expenseRecordInclude, toSupervisionExpenseRecord } from '../../utils/expenses'
import { requireUserSession } from '../../utils/session'

export default defineEventHandler(async (event): Promise<SupervisionExpensesResponse> => {
  await requireUserSession(event, ['staff'])
  const parsed = supervisionExpenseContextSchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'SUPERVISION_CONTEXT_INVALID' })
  const round = parsed.data.round === 1 ? 'ROUND_1' as const : 'ROUND_2' as const
  const prisma = usePrisma()
  const [groups, records] = await Promise.all([
    prisma.supervisionGroup.findMany({
      where: { cycleId: parsed.data.cycleId, round },
      select: {
        id: true, name: true, cycleId: true, round: true,
        companies: { select: { companySiteId: true } },
        lecturers: {
          select: { lecturer: { select: { id: true, namePrefix: true, firstName: true, lastName: true, gender: true } } },
          orderBy: { lecturerId: 'asc' },
        },
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: 1000,
    }),
    prisma.supervisionExpense.findMany({
      where: { group: { cycleId: parsed.data.cycleId, round } },
      include: expenseRecordInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: 1000,
    }),
  ])
  return {
    groups: groups.map((group): SupervisionExpenseGroup => ({
      id: group.id,
      name: group.name,
      cycleId: group.cycleId,
      round: group.round === 'ROUND_1' ? 1 : 2,
      companyCount: group.companies.length,
      lecturers: group.lecturers.map(({ lecturer }) => ({
        id: lecturer.id,
        name: `${lecturer.namePrefix}${lecturer.firstName} ${lecturer.lastName}`.trim(),
        gender: lecturer.gender === 'MALE' ? 'male' : lecturer.gender === 'FEMALE' ? 'female' : null,
      })),
    })),
    records: records.map(toSupervisionExpenseRecord),
  }
})
