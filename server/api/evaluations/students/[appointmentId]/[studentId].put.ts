import { saveStudentEvaluationSchema } from '#shared/evaluations'
import { requireUserSession } from '../../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['lecturer'])
  const appointmentId = getRouterParam(event, 'appointmentId')
  const studentId = getRouterParam(event, 'studentId')
  if (!appointmentId || !studentId) throw createError({ statusCode: 400, statusMessage: 'EVALUATION_TARGET_REQUIRED' })
  const parsed = saveStudentEvaluationSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'STUDENT_EVALUATION_INVALID' })
  const prisma = usePrisma()
  const appointmentStudent = await prisma.supervisionAppointmentStudent.findFirst({
    where: {
      appointmentId,
      placementRequest: { enrollment: { student: { username: studentId } } },
    },
    select: {
      id: true,
      appointment: {
        select: {
          status: true,
          groupCompany: { select: { group: { select: { lecturers: { select: { lecturerId: true } } } } } },
          lecturers: { select: { lecturerId: true } },
        },
      },
      studentEvaluations: { where: { evaluatorLecturerId: user.id }, select: { status: true }, take: 1 },
    },
  })
  if (!appointmentStudent) throw createError({ statusCode: 404, statusMessage: 'APPOINTMENT_STUDENT_NOT_FOUND' })
  const assignedLecturers = new Set([
    ...appointmentStudent.appointment.groupCompany.group.lecturers.map(item => item.lecturerId),
    ...appointmentStudent.appointment.lecturers.map(item => item.lecturerId),
  ])
  if (!assignedLecturers.has(user.id)) throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  if (appointmentStudent.appointment.status !== 'COMPLETED') throw createError({ statusCode: 409, statusMessage: 'SUPERVISION_NOT_COMPLETED' })
  if (appointmentStudent.studentEvaluations[0]?.status === 'SUBMITTED') throw createError({ statusCode: 409, statusMessage: 'EVALUATION_LOCKED' })
  const ratings = parsed.data.ratings
  const submittedAt = parsed.data.status === 'submitted' ? new Date() : null
  const data = {
    rubricVersion: 1,
    status: parsed.data.status === 'submitted' ? 'SUBMITTED' as const : 'DRAFT' as const,
    responsibilityScore: ratings.responsibility ?? null,
    disciplineScore: ratings.ethics ?? null,
    communicationScore: ratings.communication ?? null,
    knowledgeScore: ratings.knowledge ?? null,
    workQualityScore: ratings.work_quality ?? null,
    problemSolvingScore: ratings.problem_solving ?? null,
    strengths: parsed.data.strengths || null,
    issues: parsed.data.issues || null,
    suggestions: parsed.data.suggestions || null,
    nextFollowUp: parsed.data.followUp || null,
    submittedAt,
  }
  const evaluation = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.studentEvaluation.upsert({
      where: {
        appointmentStudentId_evaluatorLecturerId: {
          appointmentStudentId: appointmentStudent.id,
          evaluatorLecturerId: user.id,
        },
      },
      update: data,
      create: { appointmentStudentId: appointmentStudent.id, evaluatorLecturerId: user.id, ...data },
    })
    if (parsed.data.status === 'submitted') {
      const staffAccounts = await transaction.user.findMany({
        where: { role: 'STAFF', status: 'ACTIVE' },
        select: { id: true },
      })
      if (staffAccounts.length) {
        await transaction.notification.create({
          data: {
            type: 'STUDENT_EVALUATION_SUBMITTED',
            severity: 'INFO',
            title: 'มีผลประเมินนักศึกษาใหม่',
            body: `ส่งแบบประเมินของนักศึกษา ${studentId} แล้ว`,
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
