import { supervisionAppointmentsQuerySchema } from '#shared/supervision-appointments'
import { requireUserSession } from '../../utils/session'
import { toSupervisionAppointmentDto } from '../../utils/supervisionAppointments'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['staff', 'lecturer', 'student'])
  const parsed = supervisionAppointmentsQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'SUPERVISION_CONTEXT_INVALID' })
  const appointments = await usePrisma().supervisionAppointment.findMany({
    where: {
      groupCompany: {
        cycleId: parsed.data.cycleId,
        round: parsed.data.round === 1 ? 'ROUND_1' : 'ROUND_2',
      },
      ...(user.role === 'lecturer'
        ? {
            OR: [
              { lecturers: { some: { lecturerId: user.id } } },
              { groupCompany: { group: { lecturers: { some: { lecturerId: user.id } } } } },
            ],
          }
        : user.role === 'student'
          ? {
              status: { not: 'DRAFT' as const },
              students: { some: { placementRequest: { enrollment: { studentId: user.id } } } },
            }
          : {}),
    },
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
    orderBy: [{ scheduledDate: 'asc' }, { id: 'asc' }],
    take: 5001,
  })
  if (appointments.length > 5000) throw createError({ statusCode: 422, statusMessage: 'SUPERVISION_APPOINTMENTS_TOO_LARGE' })
  return { appointments: appointments.map(toSupervisionAppointmentDto) }
})
