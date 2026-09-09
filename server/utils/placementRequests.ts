import type { PlacementRequestStatus, Prisma } from '@prisma/client'
import type { PlacementRequestPreview, RequestStatus } from '#shared/placement-requests'

export type PlacementRequestWithStudent = Prisma.PlacementRequestGetPayload<{
  include: {
    studentApplication: { select: { id: true, appliedDate: true } }
    enrollment: { select: { cycleId: true, student: { select: { username: true, namePrefix: true, firstName: true, lastName: true } } } }
    documents: { select: { id: true, documentType: true, originalFileName: true } }
  }
}>

const statusMap: Record<PlacementRequestStatus, RequestStatus> = {
  DRAFT: 'submitted',
  SUBMITTED: 'submitted',
  RETURNED: 'returned',
  BATCHED: 'letter-issued',
  WAITING_RESPONSE: 'letter-issued',
  WAITING_REVIEW: 'signed-uploaded',
  CONFIRMED: 'confirmed',
  NOT_ACCEPTED: 'cancelled',
  CANCELLED: 'cancelled',
}

export const toPlacementRequestPreview = (request: PlacementRequestWithStudent): PlacementRequestPreview => {
  const outgoing = request.documents?.find(document => document.documentType === 'OUTGOING_REQUEST')
  const response = request.documents?.find(document => document.documentType === 'COMPANY_RESPONSE')
  return {
    id: request.id,
  cycleId: request.enrollment.cycleId,
  studentName: `${request.enrollment.student.namePrefix}${request.enrollment.student.firstName} ${request.enrollment.student.lastName}`.trim(),
  status: statusMap[request.status],
  submittedAt: (request.submittedAt ?? request.createdAt).toISOString(),
  updatedAt: request.updatedAt.toISOString(),
  ...(outgoing
    ? { letter: { name: outgoing.originalFileName, dataUrl: `/api/placement-requests/${request.id}/documents/${outgoing.id}` } }
    : {}),
  ...(response
    ? { signedDocument: { name: response.originalFileName, dataUrl: `/api/placement-requests/${request.id}/documents/${response.id}` } }
    : {}),
  application: {
    id: request.studentApplication.id,
    studentId: request.enrollment.student.username,
    companyName: request.companyNameSnapshot,
    position: request.positionTitle,
    companyLocation: request.companyLocationSnapshot,
    recipientName: request.recipientName,
    letterAddress: request.letterAddress,
    latitude: request.latitude === null ? null : Number(request.latitude),
    longitude: request.longitude === null ? null : Number(request.longitude),
    province: request.provinceSnapshot,
    appliedAt: request.studentApplication.appliedDate.toISOString().slice(0, 10),
    status: 'completed',
    updatedAt: request.updatedAt.toISOString(),
  },
  }
}
