import { Prisma } from '@prisma/client'
import { updateSupervisionResultSchema } from '#shared/supervision-appointments'
import { requireUserSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['staff', 'lecturer'])
  const appointmentId = getRouterParam(event, 'id')
  if (!appointmentId) throw createError({ statusCode: 400, statusMessage: 'APPOINTMENT_ID_REQUIRED' })
  const parsed = updateSupervisionResultSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'SUPERVISION_RESULT_INVALID' })

  const prisma = usePrisma()
  const appointment = await prisma.supervisionAppointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true, status: true,
      groupCompany: { select: { group: { select: { lecturers: { select: { lecturerId: true } } } } } },
      lecturers: { select: { lecturerId: true } },
      students: { select: { placementRequest: { select: { enrollment: { select: { studentId: true } } } } } },
    },
  })
  if (!appointment) throw createError({ statusCode: 404, statusMessage: 'SUPERVISION_APPOINTMENT_NOT_FOUND' })
  const plannedLecturerIds = new Set(appointment.lecturers.map(lecturer => lecturer.lecturerId))
  const assignedLecturerIds = new Set([
    ...plannedLecturerIds,
    ...appointment.groupCompany.group.lecturers.map(lecturer => lecturer.lecturerId),
  ])
  if (user.role === 'lecturer' && !assignedLecturerIds.has(user.id)) throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  if (appointment.status === 'CANCELLED') throw createError({ statusCode: 409, statusMessage: 'SUPERVISION_APPOINTMENT_LOCKED' })

  if (parsed.data.action === 'update-schedule') {
    const schedule = parsed.data
    if (appointment.status === 'COMPLETED') throw createError({ statusCode: 409, statusMessage: 'SUPERVISION_APPOINTMENT_LOCKED' })
    const lecturerIds = [...new Set(schedule.lecturerIds)]
    if (lecturerIds.length !== schedule.lecturerIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'LECTURERS_INVALID' })
    }
    const activeLecturers = await prisma.user.findMany({
      where: { id: { in: lecturerIds }, role: 'LECTURER', status: 'ACTIVE' },
      select: { id: true },
      take: 21,
    })
    if (activeLecturers.length !== lecturerIds.length) throw createError({ statusCode: 400, statusMessage: 'LECTURERS_INVALID' })
    await prisma.$transaction(async (transaction) => {
      await transaction.supervisionAppointmentLecturer.deleteMany({ where: { appointmentId: appointment.id } })
      await transaction.supervisionAppointmentLecturer.createMany({
        data: lecturerIds.map((lecturerId, index) => ({
          appointmentId: appointment.id,
          lecturerId,
          source: 'MANUAL',
          role: index === 0 ? 'LEAD' as const : 'PARTICIPANT' as const,
        })),
      })
      await transaction.supervisionAppointment.update({
        where: { id: appointment.id },
        data: {
          scheduledDate: new Date(`${schedule.date}T00:00:00.000Z`),
          period: schedule.period === 'morning' ? 'MORNING' : 'AFTERNOON',
          status: appointment.status === 'POSTPONED' ? 'PUBLISHED' : appointment.status,
        },
      })
      if (user.role === 'staff' && appointment.status === 'POSTPONED') {
        await transaction.notification.create({
          data: {
            type: 'SUPERVISION_SCHEDULE_PUBLISHED',
            severity: 'INFO',
            title: 'เผยแพร่ตารางนิเทศแล้ว',
            body: `อัปเดตกำหนดนิเทศวันที่ ${schedule.date} ${schedule.period === 'morning' ? 'ช่วงเช้า' : 'ช่วงบ่าย'}`,
            deepLink: '/student/supervision',
            appointmentId: appointment.id,
            createdById: user.id,
            recipients: { create: appointment.students.map(student => ({ accountId: student.placementRequest.enrollment.studentId })) },
          },
        })
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return { id: appointment.id, status: appointment.status === 'POSTPONED' ? 'published' : appointment.status.toLowerCase() }
  }

  const commonData = {
    resultSummary: parsed.data.summary || null,
    resultIssues: parsed.data.issues || null,
    resultSuggestions: parsed.data.suggestions || null,
    companyRequirements: parsed.data.companyRequirements || null,
    resultRecordedById: user.id,
    resultRecordedAt: new Date(),
  }
  if (parsed.data.action === 'save-result') {
    await prisma.supervisionAppointment.update({ where: { id: appointment.id }, data: commonData })
    return { id: appointment.id, status: appointment.status.toLowerCase(), completedAt: null }
  }

  if (!['PUBLISHED', 'POSTPONED'].includes(appointment.status)) {
    throw createError({ statusCode: 409, statusMessage: 'SUPERVISION_APPOINTMENT_NOT_COMPLETABLE' })
  }
  const actualLecturerIds = [...new Set(parsed.data.actualLecturerIds)]
  if (actualLecturerIds.length !== parsed.data.actualLecturerIds.length || actualLecturerIds.some(id => !plannedLecturerIds.has(id))) {
    throw createError({ statusCode: 400, statusMessage: 'ACTUAL_LECTURERS_INVALID' })
  }
  const completedAt = new Date()
  await prisma.$transaction(async (transaction) => {
    await transaction.supervisionAppointmentLecturer.updateMany({
      where: { appointmentId: appointment.id },
      data: { isActual: false },
    })
    await transaction.supervisionAppointmentLecturer.updateMany({
      where: { appointmentId: appointment.id, lecturerId: { in: actualLecturerIds } },
      data: { isActual: true, confirmedAt: completedAt },
    })
    await transaction.supervisionAppointment.update({
      where: { id: appointment.id },
      data: {
        ...commonData,
        status: 'COMPLETED',
        completedAt,
        lockedAt: completedAt,
      },
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  return { id: appointment.id, status: 'completed', completedAt: completedAt.toISOString() }
})
