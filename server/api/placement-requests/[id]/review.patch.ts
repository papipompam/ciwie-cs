import { z } from 'zod'
import { requireUserSession } from '../../../utils/session'
import { ensureConfirmedCompanySite } from '../../../utils/companySites'

const reviewSchema = z.discriminatedUnion('outcome', [
  z.object({ outcome: z.literal('confirm'), reason: z.string().max(1000).optional() }).strict(),
  z.object({ outcome: z.literal('return'), reason: z.string().trim().min(1).max(1000) }).strict(),
])

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['staff'])
  const requestId = getRouterParam(event, 'id')
  if (!requestId) throw createError({ statusCode: 400, statusMessage: 'REQUEST_ID_REQUIRED' })
  const body = reviewSchema.safeParse(await readBody(event))
  if (!body.success) {
    throw createError({
      statusCode: 400,
      statusMessage: body.error.issues.some(issue => issue.path[0] === 'reason') ? 'RETURN_REASON_REQUIRED' : 'REVIEW_DATA_INVALID',
    })
  }
  const prisma = usePrisma()
  const request = await prisma.placementRequest.findFirst({
    where: { id: requestId, status: 'WAITING_REVIEW' },
    select: {
      id: true,
      studentApplicationId: true,
      enrollmentId: true,
      companySiteId: true,
      companyNameSnapshot: true,
      companyLocationSnapshot: true,
      provinceSnapshot: true,
      latitude: true,
      longitude: true,
      recipientName: true,
      status: true,
      positionTitle: true,
      enrollment: { select: { studentId: true } },
      documents: { where: { documentType: 'COMPANY_RESPONSE', status: 'ACTIVE' }, select: { id: true }, take: 1 },
    },
  })
  if (!request || !request.documents[0]) throw createError({ statusCode: 409, statusMessage: 'COMPANY_RESPONSE_NOT_READY' })

  const isConfirmed = body.data.outcome === 'confirm'
  const returnReason = body.data.outcome === 'return' ? body.data.reason : null
  const now = new Date()
  await prisma.$transaction(async (transaction) => {
    const companySite = isConfirmed && !request.companySiteId
      ? await ensureConfirmedCompanySite(transaction, request, user.id)
      : null
    const companySiteId = request.companySiteId ?? companySite?.id
    const changed = await transaction.placementRequest.updateMany({
      where: { id: request.id, status: 'WAITING_REVIEW' },
      data: isConfirmed
        ? {
            status: 'CONFIRMED', confirmedSlotKey: request.enrollmentId, confirmedPosition: request.positionTitle,
            confirmedById: user.id, confirmedAt: now, completedAt: now, companySiteId,
          }
        : { status: 'RETURNED', returnedAt: now },
    })
    if (changed.count !== 1) throw createError({ statusCode: 409, statusMessage: 'PLACEMENT_REQUEST_STATUS_CHANGED' })
    if (isConfirmed && companySiteId && !request.companySiteId) {
      await transaction.studentApplication.update({
        where: { id: request.studentApplicationId },
        data: { companySiteId },
      })
    }
    await transaction.letterDocumentVersion.update({
      where: { id: request.documents[0]!.id },
      data: {
        status: isConfirmed ? 'ACTIVE' : 'RETURNED', reviewedById: user.id, reviewedAt: now,
        reviewNote: returnReason,
      },
    })
    await transaction.placementRequestStatusHistory.create({
      data: {
        requestId: request.id, fromStatus: 'WAITING_REVIEW', toStatus: isConfirmed ? 'CONFIRMED' : 'RETURNED',
        reason: returnReason, changedById: user.id,
      },
    })
    await transaction.notification.create({
      data: {
        type: isConfirmed ? 'COMPANY_RESPONSE_CONFIRMED' : 'COMPANY_RESPONSE_RETURNED',
        severity: isConfirmed ? 'INFO' : 'WARNING',
        title: isConfirmed ? 'หนังสือตอบรับผ่านการตรวจแล้ว' : 'หนังสือตอบรับถูกส่งกลับให้แก้ไข',
        body: isConfirmed ? 'เจ้าหน้าที่ยืนยันสถานประกอบการเรียบร้อยแล้ว' : returnReason!,
        deepLink: '/student/applications',
        placementRequestId: request.id,
        createdById: user.id,
        recipients: { create: [{ accountId: request.enrollment.studentId }] },
      },
    })
  })
  return { status: isConfirmed ? 'confirmed' : 'returned', reviewedAt: now.toISOString() }
})
