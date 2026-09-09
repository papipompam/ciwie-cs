import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { studentApplicationFormSchema, trackedApplicationStatuses } from '#shared/student-applications'
import { requireUserSession } from '../../../utils/session'
import { statusToPrisma, toStudentApplicationRecord } from '../../../utils/studentApplications'

const updateSchema = z.union([
  studentApplicationFormSchema.strict(),
  z.object({ status: z.enum(trackedApplicationStatuses) }).strict(),
])

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['student', 'staff'])
  const body = updateSchema.safeParse(await readBody(event))
  if (!body.success) throw createError({ statusCode: 400, statusMessage: 'INVALID_APPLICATION_DATA', data: body.error.flatten().fieldErrors })

  const prisma = usePrisma()
  const application = await prisma.studentApplication.findFirst({
    where: {
      id: getRouterParam(event, 'id'),
      ...(user.role === 'student' ? { enrollment: { studentId: user.id } } : {}),
    },
    include: { enrollment: { select: { student: { select: { username: true, namePrefix: true, firstName: true, lastName: true } } } }, placementRequest: { select: { id: true } } },
  })
  if (!application) throw createError({ statusCode: 404, statusMessage: 'APPLICATION_NOT_FOUND' })
  const nextStatus = statusToPrisma[body.data.status]
  if (application.status === 'COMPLETED' && user.role === 'student' && nextStatus === 'COMPLETED') {
    return toStudentApplicationRecord(application, application.enrollment.student.username, application.placementRequest?.id)
  }
  if (application.status === 'COMPLETED') throw createError({ statusCode: 409, statusMessage: 'APPLICATION_SELECTION_LOCKED' })
  if (application.status === 'REJECTED') throw createError({ statusCode: 409, statusMessage: 'APPLICATION_REJECTION_LOCKED' })

  const fullUpdate = 'companyName' in body.data ? body.data : null
  const isFullUpdate = Boolean(fullUpdate)
  if (isFullUpdate && user.role !== 'student') throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  if (!isFullUpdate && user.role === 'staff' && nextStatus === 'COMPLETED') {
    throw createError({ statusCode: 403, statusMessage: 'STUDENT_CONFIRMATION_REQUIRED' })
  }
  if (nextStatus === 'COMPLETED' && application.status !== 'ACCEPTED') {
    throw createError({ statusCode: 409, statusMessage: 'COMPANY_ACCEPTANCE_REQUIRED' })
  }
  const applicationProgressTransitions: Partial<Record<typeof application.status, readonly typeof nextStatus[]>> = {
    SUBMITTED: ['WAITING_RESPONSE', 'RESPONDED', 'WAITING_INTERVIEW', 'ACCEPTED', 'REJECTED'],
    WAITING_RESPONSE: ['RESPONDED', 'WAITING_INTERVIEW', 'ACCEPTED', 'REJECTED'],
    RESPONDED: ['WAITING_INTERVIEW', 'ACCEPTED', 'REJECTED'],
    WAITING_INTERVIEW: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: ['REJECTED'],
  }
  const followsProgress = applicationProgressTransitions[application.status]?.includes(nextStatus) ?? false
  const isStudentCancellation = user.role === 'student' && nextStatus === 'CANCELLED'
  const isStudentConfirmation = user.role === 'student' && application.status === 'ACCEPTED' && nextStatus === 'COMPLETED'
  const isStaffCancellationClosure = user.role === 'staff' && application.status === 'CANCELLED' && nextStatus === 'REJECTED'
  if (nextStatus !== application.status && !followsProgress && !isStudentCancellation && !isStudentConfirmation && !isStaffCancellationClosure) {
    throw createError({ statusCode: 409, statusMessage: 'APPLICATION_STATUS_TRANSITION_INVALID' })
  }

  try {
    if (nextStatus === 'COMPLETED') {
      const updated = await prisma.$transaction(async (transaction) => {
        const selected = await transaction.studentApplication.updateMany({
          where: { id: application.id, status: 'ACCEPTED' },
          data: { status: 'COMPLETED', activeSlotKey: application.enrollmentId },
        })
        if (selected.count !== 1) throw createError({ statusCode: 409, statusMessage: 'APPLICATION_STATUS_CHANGED' })

        const now = new Date()
        const request = await transaction.placementRequest.create({
          data: {
            requestNo: `REQ-${application.id}`,
            studentApplicationId: application.id,
            enrollmentId: application.enrollmentId,
            companySiteId: application.companySiteId,
            companyNameSnapshot: application.companyNameSnapshot,
            companyLocationSnapshot: application.companyLocation ?? application.letterAddressSnapshot,
            provinceSnapshot: application.provinceSnapshot,
            latitude: application.latitude,
            longitude: application.longitude,
            positionTitle: application.positionTitle,
            recipientName: application.recipientNameSnapshot,
            recipientRole: application.recipientNameSnapshot,
            letterAddress: application.letterAddressSnapshot,
            status: 'SUBMITTED',
            activeSlotKey: application.enrollmentId,
            submittedAt: now,
          },
        })
        await transaction.placementRequestStatusHistory.create({
          data: { requestId: request.id, toStatus: 'SUBMITTED', changedById: user.id },
        })
        const staffAccounts = await transaction.user.findMany({
          where: { role: 'STAFF', status: 'ACTIVE', recordStatus: 'ACTIVE' },
          select: { id: true },
        })
        await transaction.notification.create({
          data: {
            type: 'PLACEMENT_REQUEST_SUBMITTED',
            severity: 'INFO',
            title: 'มีคำร้องสถานประกอบการใหม่',
            body: `${application.enrollment.student.namePrefix}${application.enrollment.student.firstName} ${application.enrollment.student.lastName} · ${application.companyNameSnapshot}`,
            deepLink: `/staff/requests?request=${request.id}`,
            placementRequestId: request.id,
            createdById: user.id,
            recipients: { create: staffAccounts.map(account => ({ accountId: account.id })) },
          },
        })
        return { application: await transaction.studentApplication.findUniqueOrThrow({ where: { id: application.id } }), requestId: request.id }
      })
      return toStudentApplicationRecord(updated.application, application.enrollment.student.username, updated.requestId)
    }

    const updated = await prisma.studentApplication.update({
      where: { id: application.id },
      data: {
        status: nextStatus,
        activeSlotKey: nextStatus === 'REJECTED' ? null : application.enrollmentId,
        ...(fullUpdate
          ? {
              companyNameSnapshot: fullUpdate.companyName,
              companyLocation: fullUpdate.companyLocation,
              recipientNameSnapshot: fullUpdate.recipientName,
              letterAddressSnapshot: fullUpdate.letterAddress,
              latitude: fullUpdate.latitude,
              longitude: fullUpdate.longitude,
              provinceSnapshot: fullUpdate.province,
              positionTitle: fullUpdate.position,
              appliedDate: new Date(`${fullUpdate.appliedAt}T00:00:00.000Z`),
            }
          : {}),
      },
    })
    return toStudentApplicationRecord(updated, application.enrollment.student.username)
  }
  catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'APPLICATION_ALREADY_ACTIVE' })
    }
    throw cause
  }
})
