import { Prisma } from '@prisma/client'
import { supervisionLineExpenseInputSchema } from '#shared/expenses'
import { calculateSupervisionLineExpense } from '#shared/expense-calculation'
import { expenseRecordInclude, toSupervisionExpenseRecord } from '../../../utils/expenses'
import { requireUserSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const staff = await requireUserSession(event, ['staff'])
  const groupId = getRouterParam(event, 'groupId')
  if (!groupId) throw createError({ statusCode: 400, statusMessage: 'SUPERVISION_GROUP_REQUIRED' })
  const parsed = supervisionLineExpenseInputSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'EXPENSE_INPUT_INVALID', data: parsed.error.flatten().fieldErrors })
  const prisma = usePrisma()
  const expense = await prisma.$transaction(async (transaction) => {
    const group = await transaction.supervisionGroup.findFirst({
      where: { id: groupId },
      select: {
        id: true, name: true, cycleId: true, round: true,
        lecturers: {
          select: { lecturer: { select: { id: true, namePrefix: true, firstName: true, lastName: true, gender: true } } },
          orderBy: { lecturerId: 'asc' },
        },
        companies: { select: { companySiteId: true } },
      },
    })
    if (!group) throw createError({ statusCode: 404, statusMessage: 'SUPERVISION_GROUP_NOT_FOUND' })
    if (!group.lecturers.length) throw createError({ statusCode: 409, statusMessage: 'SUPERVISION_LECTURER_REQUIRED' })
    const lecturers = group.lecturers.map(({ lecturer }) => ({
      id: lecturer.id,
      name: `${lecturer.namePrefix}${lecturer.firstName} ${lecturer.lastName}`.trim(),
      gender: lecturer.gender === 'MALE' ? 'male' as const : lecturer.gender === 'FEMALE' ? 'female' as const : null,
    }))
    let calculation
    try { calculation = calculateSupervisionLineExpense(parsed.data, lecturers) }
    catch (cause) {
      if (cause instanceof Error && cause.message === 'LECTURER_GENDER_REQUIRED') {
        throw createError({ statusCode: 409, statusMessage: cause.message })
      }
      throw cause
    }
    const calculatedData = {
      fuelAmount: calculation.amounts.fuel,
      roomRate: parsed.data.roomRate,
      nights: parsed.data.nights,
      allowanceRate: parsed.data.allowanceRate,
      allowanceDays: parsed.data.allowanceDays,
      roomCapacity: parsed.data.roomCapacity,
      lecturerCount: calculation.lecturerCount,
      maleLecturerCount: calculation.maleLecturerCount,
      femaleLecturerCount: calculation.femaleLecturerCount,
      maleRoomCount: calculation.maleRoomCount,
      femaleRoomCount: calculation.femaleRoomCount,
      accommodationAmount: calculation.amounts.accommodation,
      allowanceAmount: calculation.amounts.allowance,
      totalAmount: calculation.total,
      lecturerSnapshot: lecturers,
    }
    const saved = await transaction.supervisionExpense.upsert({
      where: { groupId: group.id },
      create: {
        groupId: group.id,
        ...calculatedData,
        createdById: staff.id,
      },
      update: calculatedData,
      include: expenseRecordInclude,
    })
    await transaction.auditLog.create({
      data: {
        actorAccountId: staff.id,
        action: 'บันทึกค่าใช้จ่ายสายการนิเทศ',
        entityType: 'SupervisionExpense',
        entityId: saved.id,
        metadata: { groupId: group.id, total: calculation.total },
      },
    })
    return saved
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  return toSupervisionExpenseRecord(expense)
})
