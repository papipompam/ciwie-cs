import { Prisma } from '@prisma/client'
import { requireUserSession } from '../../../utils/session'
import { removeStoredFile, storePdf } from '../../../utils/fileStorage'
import { normalizeMultipartBoundaryHeader } from '../../../utils/multipart'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['student', 'staff'])
  const requestId = getRouterParam(event, 'id')
  if (!requestId) throw createError({ statusCode: 400, statusMessage: 'REQUEST_ID_REQUIRED' })
  normalizeMultipartBoundaryHeader(event)
  const parts = await readMultipartFormData(event)
  const kind = parts?.find(part => part.name === 'kind')?.data.toString('utf8')
  const file = parts?.find(part => part.name === 'file' && part.filename)
  if (!file?.filename || !['application/pdf', 'application/octet-stream'].includes(file.type ?? '') || !['outgoing', 'company-response'].includes(kind ?? '')) {
    throw createError({ statusCode: 400, statusMessage: 'DOCUMENT_UPLOAD_INVALID' })
  }
  const documentType = kind === 'outgoing' ? 'OUTGOING_REQUEST' as const : 'COMPANY_RESPONSE' as const
  if ((documentType === 'OUTGOING_REQUEST' && user.role !== 'staff') || (documentType === 'COMPANY_RESPONSE' && user.role !== 'student')) {
    throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  }

  const prisma = usePrisma()
  const request = await prisma.placementRequest.findFirst({
    where: { id: requestId, ...(user.role === 'student' ? { enrollment: { studentId: user.id } } : {}) },
    select: {
      id: true,
      status: true,
      companyNameSnapshot: true,
      enrollment: {
        select: {
          studentId: true,
          student: { select: { namePrefix: true, firstName: true, lastName: true } },
        },
      },
    },
  })
  if (!request) throw createError({ statusCode: 404, statusMessage: 'PLACEMENT_REQUEST_NOT_FOUND' })
  const allowed = documentType === 'OUTGOING_REQUEST'
    ? ['SUBMITTED', 'RETURNED'].includes(request.status)
    : ['WAITING_RESPONSE', 'RETURNED'].includes(request.status)
  if (!allowed) throw createError({ statusCode: 409, statusMessage: 'DOCUMENT_UPLOAD_NOT_ALLOWED' })

  const stored = await storePdf(event, file.data, file.filename)
  try {
    const document = await prisma.$transaction(async (transaction) => {
      const latest = await transaction.letterDocumentVersion.findFirst({
        where: { placementRequestId: request.id, documentType },
        select: { versionNumber: true },
        orderBy: { versionNumber: 'desc' },
      })
      await transaction.letterDocumentVersion.updateMany({
        where: { placementRequestId: request.id, documentType, status: 'ACTIVE' },
        data: { status: 'SUPERSEDED' },
      })
      const created = await transaction.letterDocumentVersion.create({
        data: {
          placementRequestId: request.id,
          documentType,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          ...stored,
          validationStatus: 'VALID',
          validatedAt: new Date(),
          uploadedById: user.id,
        },
      })
      await transaction.placementRequest.update({
        where: { id: request.id },
        data: { status: documentType === 'OUTGOING_REQUEST' ? 'WAITING_RESPONSE' : 'WAITING_REVIEW' },
      })
      if (documentType === 'COMPANY_RESPONSE') {
        const staffAccounts = await transaction.user.findMany({
          where: { role: 'STAFF', status: 'ACTIVE', recordStatus: 'ACTIVE' },
          select: { id: true },
          take: 201,
        })
        await transaction.notification.create({
          data: {
            type: 'COMPANY_RESPONSE_SUBMITTED',
            severity: 'INFO',
            title: 'มีหนังสือตอบรับใหม่รอตรวจสอบ',
            body: `${request.enrollment.student.namePrefix}${request.enrollment.student.firstName} ${request.enrollment.student.lastName} · ${request.companyNameSnapshot}`,
            deepLink: `/staff/requests?request=${request.id}`,
            placementRequestId: request.id,
            createdById: user.id,
            recipients: { create: staffAccounts.map(account => ({ accountId: account.id })) },
          },
        })
      }
      return created
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return {
      id: document.id,
      name: document.originalFileName,
      dataUrl: `/api/placement-requests/${request.id}/documents/${document.id}`,
      version: document.versionNumber,
      uploadedAt: document.uploadedAt.toISOString(),
    }
  }
  catch (cause) {
    await removeStoredFile(event, stored.storageKey)
    throw cause
  }
})
