import { Prisma } from '@prisma/client'
import { assignGroupLecturersSchema } from '#shared/supervision-groups'
import { requireUserSession } from '../../../../../utils/session'
import { toSupervisionGroupDto } from '../../../../../utils/supervisionGroups'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['staff'])
  const groupId = getRouterParam(event, 'id')
  if (!groupId) throw createError({ statusCode: 400, statusMessage: 'SUPERVISION_GROUP_ID_REQUIRED' })
  const parsed = assignGroupLecturersSchema.safeParse(await readBody(event))
  if (!parsed.success || new Set(parsed.data.lecturerIds).size !== parsed.data.lecturerIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'LECTURER_ASSIGNMENT_INVALID' })
  }
  const prisma = usePrisma()
  try {
    const group = await prisma.$transaction(async (transaction) => {
      const current = await transaction.supervisionGroup.findUnique({
        where: { id: groupId },
        select: { id: true, cycleId: true, round: true, name: true },
      })
      if (!current) throw createError({ statusCode: 404, statusMessage: 'SUPERVISION_GROUP_NOT_FOUND' })
      const eligible = await transaction.user.count({
        where: { id: { in: parsed.data.lecturerIds }, role: 'LECTURER', status: 'ACTIVE', recordStatus: 'ACTIVE' },
      })
      const conflicts = await transaction.supervisionGroupLecturer.count({
        where: {
          groupId: { not: current.id }, cycleId: current.cycleId, round: current.round,
          lecturerId: { in: parsed.data.lecturerIds },
        },
      })
      if (eligible !== parsed.data.lecturerIds.length || conflicts) {
        throw createError({ statusCode: 409, statusMessage: 'LECTURER_NOT_AVAILABLE' })
      }
      await transaction.supervisionGroupLecturer.deleteMany({ where: { groupId: current.id } })
      await transaction.supervisionGroupLecturer.createMany({
        data: parsed.data.lecturerIds.map(lecturerId => ({
          groupId: current.id, cycleId: current.cycleId, round: current.round, lecturerId,
        })),
      })
      await transaction.notification.create({
        data: {
          type: 'SUPERVISION_GROUP_ASSIGNED',
          severity: 'INFO',
          title: 'ได้รับมอบหมายกลุ่มนิเทศ',
          body: `คุณได้รับมอบหมายให้ ${current.name}`,
          deepLink: '/lecturer/supervision',
          createdById: user.id,
          recipients: { create: parsed.data.lecturerIds.map(accountId => ({ accountId })) },
        },
      })
      return transaction.supervisionGroup.findUniqueOrThrow({
        where: { id: current.id },
        include: {
          lecturers: { select: { lecturerId: true }, orderBy: { lecturerId: 'asc' } },
          companies: { select: { companySiteId: true }, orderBy: { companySiteId: 'asc' } },
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return toSupervisionGroupDto(group)
  }
  catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'LECTURER_NOT_AVAILABLE' })
    }
    throw cause
  }
})
