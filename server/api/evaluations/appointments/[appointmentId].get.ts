import type { CompanyRecommendation, EvaluationStatus } from '@prisma/client'
import { requireUserSession } from '../../../utils/session'

const recommendationFromPrisma: Record<CompanyRecommendation, string> = {
  RECOMMENDED: 'recommended',
  CONDITIONAL: 'conditional',
  FOLLOW_UP: 'follow_up',
  NOT_RECOMMENDED: 'not_recommended',
  SAFETY_RISK: 'safety_risk',
}

const statusFromPrisma = (status: EvaluationStatus) => status === 'SUBMITTED' ? 'submitted' as const : 'draft' as const
const compactRatings = (ratings: Record<string, number | null>) => Object.fromEntries(
  Object.entries(ratings).flatMap(([key, value]) => value === null ? [] : [[key, String(value)]]),
)

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['staff', 'lecturer'])
  const appointmentId = getRouterParam(event, 'appointmentId')
  if (!appointmentId) throw createError({ statusCode: 400, statusMessage: 'APPOINTMENT_ID_REQUIRED' })

  const appointment = await usePrisma().supervisionAppointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      groupCompany: { select: { group: { select: { lecturers: { select: { lecturerId: true } } } } } },
      lecturers: { select: { lecturerId: true } },
      students: {
        select: {
          placementRequest: { select: { enrollment: { select: { student: { select: { username: true } } } } } },
          studentEvaluations: {
            where: user.role === 'staff'
              ? {}
              : { OR: [{ status: 'SUBMITTED' }, { evaluatorLecturerId: user.id }] },
            select: {
              evaluatorLecturerId: true, status: true, submittedAt: true,
              responsibilityScore: true, disciplineScore: true, communicationScore: true,
              knowledgeScore: true, workQualityScore: true, problemSolvingScore: true,
              strengths: true, issues: true, suggestions: true, nextFollowUp: true,
            },
            orderBy: { evaluatorLecturerId: 'asc' },
          },
        },
        orderBy: { id: 'asc' },
      },
      companyEvaluation: {
        select: {
          evaluatorId: true, status: true, submittedAt: true,
          workRelevanceScore: true, workChallengeScore: true, learningOpportunityScore: true,
          supervisorReadinessScore: true, studentSupportScore: true, environmentScore: true,
          safetyScore: true, resourceReadinessScore: true, allowanceScore: true,
          transportationScore: true, publicTransportScore: true, nearbyAccommodationScore: true,
          universityCoordinationScore: true, recommendation: true, observations: true,
          companyRequirements: true, issues: true, suggestions: true,
        },
      },
    },
  })
  if (!appointment) throw createError({ statusCode: 404, statusMessage: 'SUPERVISION_APPOINTMENT_NOT_FOUND' })

  const assignedLecturers = new Set([
    ...appointment.groupCompany.group.lecturers.map(item => item.lecturerId),
    ...appointment.lecturers.map(item => item.lecturerId),
  ])
  if (user.role === 'lecturer' && !assignedLecturers.has(user.id)) {
    throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  }

  const studentEvaluations = appointment.students.flatMap(student => student.studentEvaluations
    .filter(evaluation => user.role === 'staff' || evaluation.status === 'SUBMITTED' || evaluation.evaluatorLecturerId === user.id)
    .map(evaluation => ({
    appointmentId,
    studentId: student.placementRequest.enrollment.student.username,
    lecturerId: evaluation.evaluatorLecturerId,
    status: statusFromPrisma(evaluation.status),
    submittedAt: evaluation.submittedAt?.toISOString() ?? null,
    ratings: compactRatings({
      responsibility: evaluation.responsibilityScore,
      ethics: evaluation.disciplineScore,
      communication: evaluation.communicationScore,
      knowledge: evaluation.knowledgeScore,
      work_quality: evaluation.workQualityScore,
      problem_solving: evaluation.problemSolvingScore,
    }),
    strengths: evaluation.strengths ?? '',
    issues: evaluation.issues ?? '',
    suggestions: evaluation.suggestions ?? '',
    followUp: evaluation.nextFollowUp ?? '',
    })))

  const company = appointment.companyEvaluation
  const companyEvaluation = company
    ? {
        appointmentId,
        evaluatorId: company.evaluatorId,
        status: statusFromPrisma(company.status),
        submittedAt: company.submittedAt?.toISOString() ?? null,
        ratings: compactRatings({
          field_relevance: company.workRelevanceScore,
          work_scope: company.workChallengeScore,
          learning_opportunity: company.learningOpportunityScore,
          supervisor_readiness: company.supervisorReadinessScore,
          student_support: company.studentSupportScore,
          environment: company.environmentScore,
          safety: company.safetyScore,
          resources: company.resourceReadinessScore,
          allowance: company.allowanceScore,
          transportation: company.transportationScore,
          public_transport: company.publicTransportScore,
          nearby_accommodation: company.nearbyAccommodationScore,
          coordination: company.universityCoordinationScore,
        }),
        recommendation: company.recommendation ? recommendationFromPrisma[company.recommendation] : '',
        observations: company.observations ?? '',
        companyRequirements: company.companyRequirements ?? '',
        issues: company.issues ?? '',
        suggestions: company.suggestions ?? '',
      }
    : null

  return { appointmentId, studentEvaluations, companyEvaluation }
})
