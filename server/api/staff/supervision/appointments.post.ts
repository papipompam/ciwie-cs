import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { createSupervisionAppointmentSchema } from '#shared/supervision-appointments'
import { requireUserSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['staff'])
  const parsed = createSupervisionAppointmentSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'SUPERVISION_APPOINTMENT_INVALID' })
  const input = parsed.data
  const studentIds = [...new Set(input.studentIds)]
  const lecturerIds = [...new Set(input.lecturerIds)]
  if (studentIds.length !== input.studentIds.length || lecturerIds.length !== input.lecturerIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'SUPERVISION_PARTICIPANTS_DUPLICATED' })
  }
  const round = input.round === 1 ? 'ROUND_1' as const : 'ROUND_2' as const
  const prisma = usePrisma()
  const [groupCompany, lecturers, requests] = await Promise.all([
    prisma.supervisionGroupCompany.findFirst({
      where: { groupId: input.groupId, cycleId: input.cycleId, round, companySiteId: input.companyId },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: { id: { in: lecturerIds }, role: 'LECTURER', status: 'ACTIVE', recordStatus: 'ACTIVE' },
      select: { id: true },
      take: 21,
    }),
    prisma.placementRequest.findMany({
      where: {
        status: 'CONFIRMED',
        companySiteId: input.companyId,
        enrollment: { cycleId: input.cycleId, student: { username: { in: studentIds } } },
      },
      select: { id: true, enrollment: { select: { studentId: true, student: { select: { username: true } } } } },
      take: 201,
    }),
  ])
  if (!groupCompany) throw createError({ statusCode: 404, statusMessage: 'SUPERVISION_GROUP_COMPANY_NOT_FOUND' })
  if (lecturers.length !== lecturerIds.length) throw createError({ statusCode: 422, statusMessage: 'SUPERVISION_LECTURERS_INVALID' })
  if (requests.length !== studentIds.length || new Set(requests.map(request => request.enrollment.student.username)).size !== studentIds.length) {
    throw createError({ statusCode: 422, statusMessage: 'SUPERVISION_STUDENTS_INVALID' })
  }

  const scheduledDate = new Date(`${input.date}T00:00:00.000Z`)
  const status = input.publish ? 'PUBLISHED' as const : 'DRAFT' as const
  const created = await prisma.$transaction(async (transaction) => {
    const appointment = await transaction.supervisionAppointment.create({
      data: {
        appointmentNo: `SUP-${input.cycleId}-${input.round}-${randomUUID().slice(0, 8)}`.slice(0, 50),
        groupCompanyId: groupCompany.id,
        scheduledDate,
        period: input.period === 'morning' ? 'MORNING' : 'AFTERNOON',
        status,
        splitReason: input.splitReason || null,
        createdById: user.id,
        publishedAt: input.publish ? new Date() : null,
        publishedById: input.publish ? user.id : null,
        lecturers: {
          create: lecturerIds.map((lecturerId, index) => ({
            lecturerId,
            source: 'MANUAL' as const,
            role: index === 0 ? 'LEAD' as const : 'PARTICIPANT' as const,
          })),
        },
        students: { create: requests.map(request => ({ placementRequestId: request.id })) },
      },
    })
    if (input.publish) {
      await transaction.notification.create({
        data: {
          type: 'SUPERVISION_SCHEDULE_PUBLISHED',
          severity: 'INFO',
          title: 'เผยแพร่ตารางนิเทศแล้ว',
          body: `นิเทศครั้งที่ ${input.round} วันที่ ${input.date} ${input.period === 'morning' ? 'ช่วงเช้า' : 'ช่วงบ่าย'}`,
          deepLink: '/student/supervision',
          appointmentId: appointment.id,
          createdById: user.id,
          recipients: { create: requests.map(request => ({ accountId: request.enrollment.studentId })) },
        },
      })
    }
    return appointment
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  setResponseStatus(event, 201)
  return { id: created.id, status: status === 'PUBLISHED' ? 'published' : 'draft' }
})
