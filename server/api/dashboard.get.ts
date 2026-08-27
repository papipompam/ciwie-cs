import { defineEventHandler } from 'h3'
import { getCorrelationId, getSessionActor, toHttpError } from '../utils/http'
import { prisma } from '../utils/prisma'
import { countUnscheduledRounds } from '../services/visit-service'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    if (actor.role === 'STUDENT') {
      const studentTermId = actor.studentTermId!
      const [applications, documents, upcomingVisits] = await prisma.$transaction([
        prisma.application.count({ where: { studentTermId, status: { notIn: ['REJECTED', 'CANCELLED'] } } }),
        prisma.documentRequest.count({ where: { studentTermId, status: { in: ['REQUESTED', 'IN_PROGRESS', 'READY_TO_SEND'] } } }),
        prisma.visitStudent.count({ where: { studentTermId, visit: { status: 'SCHEDULED', visitDate: { gte: new Date() } } } }),
      ])
      return { applications, documents, upcomingVisits }
    }
    if (actor.role === 'LECTURER') {
      const lecturerId = actor.lecturerId!
      const [pendingResponses, assignedVisits, evaluationVisits] = await prisma.$transaction([
        prisma.responseForm.count({ where: { status: 'PENDING_REVIEW', batch: { coopTerm: { isActive: true } } } }),
        prisma.visitLecturer.count({ where: { lecturerId, visit: { status: 'SCHEDULED', visitDate: { gte: new Date() } } } }),
        prisma.supervisionVisit.findMany({ where: { status: { in: ['SCHEDULED', 'COMPLETED'] }, lecturers: { some: { lecturerId } } }, select: { students: { select: { evaluations: { select: { status: true } } } }, organizationEvaluations: { select: { status: true } } } }),
      ])
      const pendingEvaluations = evaluationVisits.reduce((total, visit) => total
        + visit.students.filter(student => !student.evaluations.some(evaluation => evaluation.status === 'SUBMITTED')).length
        + (visit.organizationEvaluations.some(evaluation => evaluation.status === 'SUBMITTED') ? 0 : 1), 0)
      return { pendingResponses, assignedVisits, pendingEvaluations }
    }
    const [students, organizations, applications, documents, applicationStatuses, pendingResponses, recentAudit, placements] = await prisma.$transaction([
      prisma.studentTermEnrollment.count({ where: { coopTerm: { isActive: true } } }),
      prisma.organization.count({ where: { isActive: true } }),
      prisma.application.count({ where: { coopTerm: { isActive: true } } }),
      prisma.documentRequest.count({ where: { coopTerm: { isActive: true } } }),
      prisma.application.groupBy({ by: ['status'], where: { coopTerm: { isActive: true } }, orderBy: { status: 'asc' }, _count: { id: true } }),
      prisma.responseForm.count({ where: { status: 'PENDING_REVIEW', batch: { coopTerm: { isActive: true } } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } } }),
      prisma.placement.findMany({ where: { status: 'ACTIVE', studentTerm: { coopTerm: { isActive: true } } }, select: { currentWorkSiteId: true, studentTerm: { select: { visitStudents: { where: { visit: { status: { notIn: ['CANCELLED', 'POSTPONED'] } } }, select: { visit: { select: { round: true, workSiteId: true } } } } } } } }),
    ])
    const unscheduled = placements.reduce((total, placement) => total + countUnscheduledRounds({
      currentWorkSiteId: placement.currentWorkSiteId,
      visits: placement.studentTerm.visitStudents.map(member => member.visit),
    }), 0)
    const expenseSummary = await prisma.expense.aggregate({ where: { visit: { coopTerm: { isActive: true } } }, _sum: { totalAmount: true } })
    const statusCount = Object.fromEntries(applicationStatuses.map(item => [item.status, typeof item._count === 'object' ? item._count.id ?? 0 : 0]))
    return { students, organizations, applications, documents, placements: placements.length, expenses: Number(expenseSummary._sum.totalAmount ?? 0), unscheduled, pendingResponses, recentAudit, submitted: statusCount.SUBMITTED ?? 0, waitingResponse: statusCount.WAITING_RESPONSE ?? 0, interviewPending: statusCount.INTERVIEW_PENDING ?? 0, preliminaryAccepted: statusCount.PRELIMINARY_ACCEPTED ?? 0, rejected: statusCount.REJECTED ?? 0, cancelled: statusCount.CANCELLED ?? 0 }
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
