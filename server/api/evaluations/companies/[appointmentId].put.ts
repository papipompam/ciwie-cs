import { saveCompanyEvaluationSchema } from '#shared/evaluations'
import { requireUserSession } from '../../../utils/session'

const recommendationToPrisma = {
  recommended: 'RECOMMENDED',
  conditional: 'CONDITIONAL',
  follow_up: 'FOLLOW_UP',
  not_recommended: 'NOT_RECOMMENDED',
  safety_risk: 'SAFETY_RISK',
} as const

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['staff', 'lecturer'])
  const appointmentId = getRouterParam(event, 'appointmentId')
  if (!appointmentId) throw createError({ statusCode: 400, statusMessage: 'APPOINTMENT_ID_REQUIRED' })
  const parsed = saveCompanyEvaluationSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'COMPANY_EVALUATION_INVALID' })
  const prisma = usePrisma()
  const appointment = await prisma.supervisionAppointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      status: true,
      groupCompany: { select: { group: { select: { lecturers: { select: { lecturerId: true } } } } } },
      lecturers: { select: { lecturerId: true } },
      companyEvaluations: {
        where: { evaluatorId: user.id },
        select: { status: true },
        take: 1,
      },
    },
  })
  if (!appointment) throw createError({ statusCode: 404, statusMessage: 'SUPERVISION_APPOINTMENT_NOT_FOUND' })
  const assignedLecturers = new Set([
    ...appointment.groupCompany.group.lecturers.map(item => item.lecturerId),
    ...appointment.lecturers.map(item => item.lecturerId),
  ])
  if (user.role === 'lecturer' && !assignedLecturers.has(user.id)) throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  if (appointment.status !== 'COMPLETED') throw createError({ statusCode: 409, statusMessage: 'SUPERVISION_NOT_COMPLETED' })
  if (appointment.companyEvaluations[0]?.status === 'SUBMITTED') throw createError({ statusCode: 409, statusMessage: 'EVALUATION_LOCKED' })
  const ratings = parsed.data.ratings
  const submittedAt = parsed.data.status === 'submitted' ? new Date() : null
  const data = {
    status: parsed.data.status === 'submitted' ? 'SUBMITTED' as const : 'DRAFT' as const,
    workRelevanceScore: ratings.field_relevance ?? null,
    workChallengeScore: ratings.work_scope ?? null,
    learningOpportunityScore: ratings.learning_opportunity ?? null,
    supervisorReadinessScore: ratings.supervisor_readiness ?? null,
    studentSupportScore: ratings.student_support ?? null,
    environmentScore: ratings.environment ?? null,
    safetyScore: ratings.safety ?? null,
    resourceReadinessScore: ratings.resources ?? null,
    allowanceScore: ratings.allowance ?? null,
    transportationScore: ratings.transportation ?? null,
    publicTransportScore: ratings.public_transport ?? null,
    nearbyAccommodationScore: ratings.nearby_accommodation ?? null,
    universityCoordinationScore: ratings.coordination ?? null,
    recommendation: parsed.data.recommendation ? recommendationToPrisma[parsed.data.recommendation] : null,
    observations: parsed.data.observations || null,
    companyRequirements: parsed.data.companyRequirements || null,
    issues: parsed.data.issues || null,
    suggestions: parsed.data.suggestions || null,
    submittedAt,
  }
  const evaluation = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.companyEvaluation.upsert({
      where: { appointmentId_evaluatorId: { appointmentId, evaluatorId: user.id } },
      update: data,
      create: { appointmentId, evaluatorId: user.id, ...data },
    })
    if (parsed.data.status === 'submitted') {
      const staffAccounts = await transaction.user.findMany({
        where: { role: 'STAFF', status: 'ACTIVE', id: { not: user.id } },
        select: { id: true },
      })
      if (staffAccounts.length) {
        await transaction.notification.create({
          data: {
            type: 'COMPANY_EVALUATION_SUBMITTED',
            severity: 'INFO',
            title: 'มีผลประเมินสถานประกอบการใหม่',
            body: `ส่งแบบประเมินสถานประกอบการของนัด ${appointmentId} แล้ว`,
            deepLink: '/staff/evaluations',
            appointmentId,
            createdById: user.id,
            recipients: { create: staffAccounts.map(account => ({ accountId: account.id })) },
          },
        })
      }
    }
    return saved
  })
  return { id: evaluation.id, status: parsed.data.status, submittedAt: submittedAt?.toISOString() ?? null }
})
