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
    const [students, pendingResponses, recentAudit, placements] = await prisma.$transaction([
      prisma.studentTermEnrollment.count({ where: { coopTerm: { isActive: true } } }),
      prisma.responseForm.count({ where: { status: 'PENDING_REVIEW', batch: { coopTerm: { isActive: true } } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } } }),
      prisma.placement.findMany({ where: { status: 'ACTIVE', studentTerm: { coopTerm: { isActive: true } } }, select: { currentWorkSiteId: true, studentTerm: { select: { visitStudents: { where: { visit: { status: { notIn: ['CANCELLED', 'POSTPONED'] } } }, select: { visit: { select: { round: true, workSiteId: true } } } } } } } }),
    ])
    const unscheduled = placements.reduce((total, placement) => total + countUnscheduledRounds({
      currentWorkSiteId: placement.currentWorkSiteId,
      visits: placement.studentTerm.visitStudents.map(member => member.visit),
    }), 0)
    return { students, unscheduled, pendingResponses, recentAudit }
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
