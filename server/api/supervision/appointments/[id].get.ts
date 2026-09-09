import { requireUserSession } from '../../../utils/session'
import { toSupervisionAppointmentDto } from '../../../utils/supervisionAppointments'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['staff', 'lecturer'])
  const appointmentId = getRouterParam(event, 'id')
  if (!appointmentId) throw createError({ statusCode: 400, statusMessage: 'APPOINTMENT_ID_REQUIRED' })

  const appointment = await usePrisma().supervisionAppointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true, scheduledDate: true, period: true, status: true, splitReason: true,
      completedAt: true, resultSummary: true, resultIssues: true, resultSuggestions: true,
      companyRequirements: true, createdAt: true,
      groupCompany: {
        select: {
          groupId: true, cycleId: true, round: true, companySiteId: true,
          group: { select: { name: true, lecturers: { select: { lecturerId: true } } } },
          companySite: { select: { branchName: true, address: true, company: { select: { legalName: true } }, province: { select: { nameTh: true } } } },
        },
      },
      lecturers: { select: { lecturerId: true, isActual: true, lecturer: { select: { namePrefix: true, firstName: true, lastName: true } } }, orderBy: { lecturerId: 'asc' } },
      students: {
        select: { placementRequest: { select: { positionTitle: true, enrollment: { select: { student: { select: { username: true, namePrefix: true, firstName: true, lastName: true } } } } } } },
        orderBy: { placementRequestId: 'asc' },
      },
    },
  })
  if (!appointment) throw createError({ statusCode: 404, statusMessage: 'SUPERVISION_APPOINTMENT_NOT_FOUND' })
  const accessibleLecturerIds = new Set([
    ...appointment.lecturers.map(lecturer => lecturer.lecturerId),
    ...appointment.groupCompany.group.lecturers.map(lecturer => lecturer.lecturerId),
  ])
  if (user.role === 'lecturer' && !accessibleLecturerIds.has(user.id)) {
    throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  }
  return { appointment: toSupervisionAppointmentDto(appointment) }
})
