import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../domain/errors'
import { requireRole } from '../policies/authorization'
import { enqueueNotificationEvent } from './notification-dispatcher'
import { completeIdempotency, type IdempotencyIdentity } from './idempotency-completion'

export async function createDocumentRequest(db: PrismaClient, actor: SessionActor, applicationId: string) {
  if (actor.role !== 'STUDENT' || !actor.studentTermId) throw new DomainError('FORBIDDEN', 'Only a student can create a document request')
  const application = await db.application.findFirst({ where: { id: applicationId, studentTermId: actor.studentTermId } })
  if (!application) throw new DomainError('NOT_FOUND', 'Application was not found')
  if (application.status === 'REJECTED' || application.status === 'CANCELLED') throw new DomainError('INVALID_STATE', 'A terminal application cannot create a document request')
  return await db.$transaction(async (tx) => {
    const request = await tx.documentRequest.create({ data: { studentTermId: application.studentTermId, applicationId: application.id, coopTermId: application.coopTermId, workSiteId: application.workSiteId, createdById: actor.userId, updatedById: actor.userId } })
    await enqueueNotificationEvent(tx, { eventType: 'DOCUMENT_REQUESTED', aggregateType: 'DocumentRequest', aggregateId: request.id, dedupeKey: `DocumentRequest:${request.id}:requested`, payload: { documentRequestId: request.id } })
    return request
  })
}

export async function transitionDocumentRequest(db: PrismaClient, actor: SessionActor, id: string, to: 'IN_PROGRESS' | 'READY_TO_SEND' | 'CANCELLED', reason: string) {
  requireRole(actor, 'LECTURER', 'ADMIN')
  return await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM document_requests WHERE id = ${id} FOR UPDATE`
    const current = await tx.documentRequest.findUnique({ where: { id }, include: { coopTerm: { select: { isActive: true } }, batchMember: true } })
    if (!current) throw new DomainError('NOT_FOUND', 'Document request was not found')
    if (actor.role === 'LECTURER' && !current.coopTerm.isActive) throw new DomainError('FORBIDDEN', 'Lecturers can update requests only in the active term')
    const allowed: Record<string, string[]> = { REQUESTED: ['IN_PROGRESS', 'CANCELLED'], IN_PROGRESS: ['READY_TO_SEND', 'CANCELLED'], READY_TO_SEND: ['CANCELLED'], CANCELLED: [] }
    if (!allowed[current.status]?.includes(to)) throw new DomainError('INVALID_STATE', 'Document request transition is not allowed')
    if (to === 'CANCELLED' && current.batchMember) throw new DomainError('INVALID_STATE', 'Remove the request from its document batch before cancelling it')
    const changed = await tx.documentRequest.update({ where: { id }, data: { status: to, updatedById: actor.userId } })
    await tx.auditLog.create({ data: { actorId: actor.userId, action: 'DOCUMENT_REQUEST_STATUS_CHANGED', entityType: 'DocumentRequest', entityId: id, requestId: randomUUID(), reason, beforeData: { status: current.status } as Prisma.InputJsonValue, afterData: { status: to } as Prisma.InputJsonValue } })
    return changed
  })
}

export async function createDocumentBatch(db: PrismaClient, actor: SessionActor, input: { coopTermId: string, workSiteId: string, documentType: string }) {
  requireRole(actor, 'LECTURER', 'ADMIN')
  const term = await db.coopTerm.findUnique({ where: { id: input.coopTermId } })
  if (!term || (actor.role === 'LECTURER' && !term.isActive)) throw new DomainError('FORBIDDEN', 'Batch is outside your permitted term scope')
  const site = await db.workSite.findUnique({ where: { id: input.workSiteId } })
  if (!site) throw new DomainError('NOT_FOUND', 'Work site was not found')
  return await db.documentBatch.create({ data: { ...input, createdById: actor.userId, updatedById: actor.userId } })
}

export async function assignDeliveryOwner(db: PrismaClient, actor: SessionActor, input: { deliveryId: string, ownerType: 'STUDENT' | 'LECTURER', ownerUserId: string, reason: string, idempotency?: IdempotencyIdentity }) {
  requireRole(actor, 'LECTURER', 'ADMIN')
  return await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM deliveries WHERE id = ${input.deliveryId} FOR UPDATE`
    const delivery = await tx.delivery.findUnique({ where: { id: input.deliveryId }, include: { batch: { include: { coopTerm: { select: { isActive: true } } } } } })
    if (!delivery) throw new DomainError('NOT_FOUND', 'Delivery was not found')
    if (delivery.status !== 'ASSIGNED') throw new DomainError('INVALID_STATE', 'A delivery owner can be changed only before the document is sent')
    if (actor.role === 'LECTURER' && (!delivery.batch.coopTerm.isActive || input.ownerType !== 'LECTURER' || input.ownerUserId !== actor.userId)) throw new DomainError('FORBIDDEN', 'A lecturer may take ownership only for themselves in the active term')
    const owner = await tx.user.findFirst({ where: { id: input.ownerUserId, role: input.ownerType, status: 'ACTIVE' }, select: { id: true } })
    if (!owner) throw new DomainError('VALIDATION_FAILED', 'Delivery owner must be an active user with the selected role')
    if (input.ownerType === 'STUDENT') {
      const member = await tx.documentBatchMember.count({ where: { batchId: delivery.batchId, studentTerm: { student: { userId: input.ownerUserId } } } })
      if (!member) throw new DomainError('VALIDATION_FAILED', 'Student delivery owner must be a member of the document batch')
    }
    const updated = await tx.delivery.update({ where: { id: delivery.id }, data: { ownerType: input.ownerType, ownerUserId: input.ownerUserId, updatedById: actor.userId } })
    await tx.deliveryHistory.create({ data: { deliveryId: delivery.id, fromStatus: 'ASSIGNED', toStatus: 'ASSIGNED', actorId: actor.userId, reason: input.reason, snapshot: { ownerType: input.ownerType, ownerUserId: input.ownerUserId } } })
    await tx.auditLog.create({ data: { actorId: actor.userId, action: 'DELIVERY_OWNER_ASSIGNED', entityType: 'Delivery', entityId: delivery.id, requestId: crypto.randomUUID(), reason: input.reason, beforeData: delivery as unknown as Prisma.InputJsonValue, afterData: updated as unknown as Prisma.InputJsonValue } })
    await enqueueNotificationEvent(tx, { eventType: 'DELIVERY_ASSIGNED', aggregateType: 'Delivery', aggregateId: delivery.id, dedupeKey: `Delivery:${delivery.id}:reassigned:${delivery.updatedAt.getTime()}`, payload: { deliveryId: delivery.id } })
    const result = { id: updated.id, status: updated.status, ownerType: updated.ownerType, ownerUserId: updated.ownerUserId }
    if (input.idempotency) await completeIdempotency(tx, input.idempotency, result)
    return result
  })
}
