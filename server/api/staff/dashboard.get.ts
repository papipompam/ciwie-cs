import { z } from 'zod'
import { requireUserSession } from '../../utils/session'

const querySchema = z.object({ cycleId: z.string().trim().min(1).max(30) }).strict()

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff'])
  const parsed = querySchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'DASHBOARD_QUERY_INVALID' })
  const { cycleId } = parsed.data
  const prisma = usePrisma()
  const [enrollments, waitingLetters, waitingReview, confirmedSites, assignedSites, publishedAppointments] = await prisma.$transaction([
    prisma.cycleEnrollment.findMany({
      where: { cycleId, enrollmentStatus: 'ACTIVE' },
      select: {
        id: true,
        placementRequests: { select: { status: true }, where: { status: { notIn: ['CANCELLED', 'NOT_ACCEPTED'] } }, take: 10 },
        trackedApplications: { select: { status: true }, where: { status: { notIn: ['REJECTED', 'CANCELLED'] } }, take: 10 },
      },
      orderBy: { id: 'asc' },
      take: 5001,
    }),
    prisma.placementRequest.count({ where: { enrollment: { cycleId }, status: 'SUBMITTED' } }),
    prisma.placementRequest.count({ where: { enrollment: { cycleId }, status: 'WAITING_REVIEW' } }),
    prisma.placementRequest.findMany({
      where: { enrollment: { cycleId }, status: 'CONFIRMED', companySiteId: { not: null } },
      select: { companySiteId: true }, distinct: ['companySiteId'], take: 5001,
    }),
    prisma.supervisionGroupCompany.findMany({
      where: { cycleId, round: 'ROUND_1' }, select: { companySiteId: true }, take: 5001,
    }),
    prisma.supervisionAppointment.count({ where: { groupCompany: { cycleId }, status: 'PUBLISHED' } }),
  ])
  if (enrollments.length > 5000 || confirmedSites.length > 5000 || assignedSites.length > 5000) {
    throw createError({ statusCode: 422, statusMessage: 'DASHBOARD_DATA_TOO_LARGE' })
  }
  const confirmed = enrollments.filter(enrollment => enrollment.placementRequests.some(request => request.status === 'CONFIRMED')).length
  const pending = enrollments.filter(enrollment => !enrollment.placementRequests.some(request => request.status === 'CONFIRMED')
    && (enrollment.placementRequests.length > 0 || enrollment.trackedApplications.length > 0)).length
  const total = enrollments.length
  const assigned = new Set(assignedSites.map(site => site.companySiteId))
  const unassignedRoundOne = confirmedSites.filter(site => site.companySiteId && !assigned.has(site.companySiteId)).length
  return {
    students: { confirmed, pending, notStarted: total - confirmed - pending, total },
    cards: { waitingLetters, waitingReview, unassignedRoundOne, publishedAppointments },
  }
})
