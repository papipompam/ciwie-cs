import { Prisma, type PrismaClient } from '@prisma/client'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../domain/errors'
import { assertFileDownloadable } from './file-security-service'
import { requireRole } from '../policies/authorization'
import { completeIdempotency, type IdempotencyIdentity } from './idempotency-completion'
import { enqueueNotificationEvent } from './notification-dispatcher'

const json = (value: unknown) => value as Prisma.InputJsonValue

export async function addDocumentRevision(db: PrismaClient, actor: SessionActor, input: { batchId: string, fileVersionId: string, kind: 'LETTER' | 'BLANK_RESPONSE', reason?: string }): Promise<{ id: string, revision: number }> {
  requireRole(actor, 'LECTURER', 'ADMIN')
  return await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM document_batches WHERE id = ${input.batchId} FOR UPDATE`
    const [batch, file, latest] = await Promise.all([
      tx.documentBatch.findUnique({ where: { id: input.batchId }, include: { coopTerm: { select: { isActive: true } } } }),
      tx.fileVersion.findUnique({ where: { id: input.fileVersionId } }),
      tx.documentVersion.findFirst({ where: { batchId: input.batchId, kind: input.kind }, orderBy: { revision: 'desc' } }),
    ])
    if (!batch || !file) throw new DomainError('NOT_FOUND', 'Batch or file was not found')
    if (actor.role === 'LECTURER' && batch.coopTerm?.isActive === false) throw new DomainError('FORBIDDEN', 'Lecturers can revise documents only in the active term')
    assertFileDownloadable(file)
    if (batch.status === 'SENT' && !input.reason) throw new DomainError('VALIDATION_FAILED', 'A reason is required to revise a sent document')
    if (batch.status === 'CLOSED' || batch.status === 'CANCELLED') throw new DomainError('INVALID_STATE', 'A closed batch cannot be revised')
    const revision = (latest?.revision ?? 0) + 1
    const version = await tx.documentVersion.create({ data: { batchId: batch.id, revision, kind: input.kind, fileVersionId: file.id, createdById: actor.userId } })
    await tx.auditLog.create({ data: { actorId: actor.userId, action: 'DOCUMENT_REVISION_ADDED', entityType: 'DocumentBatch', entityId: batch.id, requestId: crypto.randomUUID(), reason: input.reason, beforeData: latest ? json(latest) : Prisma.JsonNull, afterData: json(version) } })
    return { id: version.id, revision }
  })
}

export async function sendDocumentBatch(db: PrismaClient, actor: SessionActor, input: { batchId: string, expectedVersion: number, documentNo: string, documentYear: number, documentDate: string, idempotency?: IdempotencyIdentity }): Promise<{ id: string, status: string, version: number }> {
  requireRole(actor, 'LECTURER', 'ADMIN')
  return await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM document_batches WHERE id = ${input.batchId} FOR UPDATE`
    const batch = await tx.documentBatch.findUnique({ where: { id: input.batchId }, include: { members: true, versions: true, coopTerm: { select: { isActive: true } } } })
    if (!batch) throw new DomainError('NOT_FOUND', 'Batch was not found')
    if (actor.role === 'LECTURER' && batch.coopTerm?.isActive === false) throw new DomainError('FORBIDDEN', 'Lecturers can send documents only in the active term')
    if (!['DRAFT', 'READY_TO_SEND'].includes(batch.status)) throw new DomainError('INVALID_STATE', 'Batch cannot be sent from its current state')
    if (!batch.members.length || !batch.versions.some(version => version.kind === 'LETTER') || !batch.versions.some(version => version.kind === 'BLANK_RESPONSE')) throw new DomainError('VALIDATION_FAILED', 'Batch requires members, a letter, and a blank response before sending')
    const changed = await tx.documentBatch.updateMany({ where: { id: batch.id, lockVersion: input.expectedVersion }, data: { status: 'SENT', lockVersion: { increment: 1 }, documentNo: input.documentNo, documentYear: input.documentYear, documentDate: new Date(`${input.documentDate}T00:00:00.000Z`), updatedById: actor.userId } })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'Batch changed; reload and try again')
    await tx.auditLog.create({ data: { actorId: actor.userId, action: 'DOCUMENT_BATCH_SENT', entityType: 'DocumentBatch', entityId: batch.id, requestId: crypto.randomUUID(), beforeData: json(batch), afterData: json({ status: 'SENT', documentNo: input.documentNo }) } })
    await enqueueNotificationEvent(tx, { eventType: 'DOCUMENT_READY', aggregateType: 'DocumentBatch', aggregateId: batch.id, dedupeKey: `DocumentBatch:${batch.id}:ready:v${batch.lockVersion + 1}`, payload: json({ batchId: batch.id }) })
    const result = { id: batch.id, status: 'SENT', version: batch.lockVersion + 1 }
    if (input.idempotency) await completeIdempotency(tx, input.idempotency, result)
    return result
  })
}

type DeliveryOwner = { ownerType: 'STUDENT' | 'LECTURER', ownerUserId: string }
type DeliverySendDetails = { channel: string, recipient: string, sentAt: string, note?: string, evidenceFileVersionId?: string }

async function assertValidDeliveryOwner(tx: Prisma.TransactionClient, batchId: string, owner: DeliveryOwner): Promise<void> {
  const user = await tx.user.findFirst({ where: { id: owner.ownerUserId, role: owner.ownerType, status: 'ACTIVE' }, select: { id: true } })
  if (!user) throw new DomainError('VALIDATION_FAILED', 'Delivery owner must be an active user with the selected role')
  if (owner.ownerType === 'STUDENT') {
    const member = await tx.documentBatchMember.count({ where: { batchId, studentTerm: { student: { userId: owner.ownerUserId } } } })
    if (!member) throw new DomainError('VALIDATION_FAILED', 'Student delivery owner must be a member of the document batch')
  }
}

async function assertOwnedCleanEvidence(tx: Prisma.TransactionClient, actor: SessionActor, fileVersionId: string): Promise<void> {
  const file = await tx.fileVersion.findUnique({ where: { id: fileVersionId } })
  if (!file) throw new DomainError('NOT_FOUND', 'Evidence file was not found')
  if (file.createdById !== actor.userId) throw new DomainError('FORBIDDEN', 'Only the uploader can attach this evidence file')
  assertFileDownloadable(file)
}

export async function createDelivery(db: PrismaClient, actor: SessionActor, input: DeliveryOwner & { batchId: string, note?: string, reason?: string, idempotency?: IdempotencyIdentity } & Partial<DeliverySendDetails>): Promise<{ id: string, status: string }> {
  requireRole(actor, 'LECTURER', 'ADMIN')
  return await db.$transaction(async (tx) => {
    const batch = await tx.documentBatch.findUnique({ where: { id: input.batchId }, include: { coopTerm: { select: { isActive: true } } } })
    if (!batch) throw new DomainError('NOT_FOUND', 'Batch was not found')
    if (actor.role === 'LECTURER' && batch.coopTerm?.isActive === false) throw new DomainError('FORBIDDEN', 'Lecturers can record delivery only in the active term')
    if (batch.status !== 'SENT') throw new DomainError('INVALID_STATE', 'Delivery can be recorded only for a sent batch')
    await assertValidDeliveryOwner(tx, batch.id, input)
    const directSend = typeof input.channel === 'string' && typeof input.recipient === 'string' && typeof input.sentAt === 'string'
    if (!directSend && !input.reason) throw new DomainError('VALIDATION_FAILED', 'An assignment reason is required')
    if (input.evidenceFileVersionId) {
      if (!directSend) throw new DomainError('VALIDATION_FAILED', 'Evidence can be attached only when recording a send')
      await assertOwnedCleanEvidence(tx, actor, input.evidenceFileVersionId)
    }
    const status = directSend ? 'SENT' as const : 'ASSIGNED' as const
    const delivery = await tx.delivery.create({ data: {
      batchId: batch.id, status, ownerType: input.ownerType, ownerUserId: input.ownerUserId,
      channel: directSend ? input.channel : null, recipient: directSend ? input.recipient : null, sentAt: directSend ? new Date(input.sentAt!) : null,
      note: input.note, createdById: actor.userId, updatedById: actor.userId,
      ...(input.evidenceFileVersionId ? { evidenceFiles: { create: { fileVersionId: input.evidenceFileVersionId } } } : {}),
      histories: { create: { toStatus: status, actorId: actor.userId, reason: input.reason, snapshot: json(input) } },
    } })
    await tx.auditLog.create({ data: { actorId: actor.userId, action: directSend ? 'DELIVERY_SENT_DIRECTLY' : 'DELIVERY_ASSIGNED', entityType: 'Delivery', entityId: delivery.id, requestId: crypto.randomUUID(), reason: input.reason, afterData: json(delivery) } })
    const eventType = directSend ? 'DOCUMENT_DELIVERED' : 'DELIVERY_ASSIGNED'
    await enqueueNotificationEvent(tx, { eventType, aggregateType: 'Delivery', aggregateId: delivery.id, dedupeKey: `Delivery:${delivery.id}:${directSend ? 'sent' : 'assigned'}`, payload: json({ deliveryId: delivery.id }) })
    const result = { id: delivery.id, status }
    if (input.idempotency) await completeIdempotency(tx, input.idempotency, result)
    return result
  })
}

export async function sendDelivery(db: PrismaClient, actor: SessionActor, input: DeliverySendDetails & { deliveryId: string, idempotency?: IdempotencyIdentity }): Promise<{ id: string, status: string }> {
  return await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM deliveries WHERE id = ${input.deliveryId} FOR UPDATE`
    const delivery = await tx.delivery.findUnique({ where: { id: input.deliveryId }, include: { batch: { include: { coopTerm: { select: { isActive: true } } } } } })
    if (!delivery) throw new DomainError('NOT_FOUND', 'Delivery was not found')
    if (delivery.ownerUserId !== actor.userId) throw new DomainError('FORBIDDEN', 'Only the assigned owner can record this delivery')
    if (actor.role === 'LECTURER' && !delivery.batch.coopTerm.isActive) throw new DomainError('FORBIDDEN', 'Lecturers can send documents only in the active term')
    if (delivery.status !== 'ASSIGNED') throw new DomainError('INVALID_STATE', 'Only an assigned delivery can be recorded as sent')
    if (input.evidenceFileVersionId) await assertOwnedCleanEvidence(tx, actor, input.evidenceFileVersionId)
    const changed = await tx.delivery.updateMany({ where: { id: delivery.id, status: 'ASSIGNED' }, data: { status: 'SENT', channel: input.channel, recipient: input.recipient, sentAt: new Date(input.sentAt), note: input.note, updatedById: actor.userId } })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'Delivery changed; reload and try again')
    if (input.evidenceFileVersionId) await tx.deliveryEvidenceFile.create({ data: { deliveryId: delivery.id, fileVersionId: input.evidenceFileVersionId } })
    await tx.deliveryHistory.create({ data: { deliveryId: delivery.id, fromStatus: 'ASSIGNED', toStatus: 'SENT', actorId: actor.userId, snapshot: json(input) } })
    await tx.auditLog.create({ data: { actorId: actor.userId, action: 'DELIVERY_SENT', entityType: 'Delivery', entityId: delivery.id, requestId: crypto.randomUUID(), beforeData: json(delivery), afterData: json({ status: 'SENT', ...input }) } })
    await enqueueNotificationEvent(tx, { eventType: 'DOCUMENT_DELIVERED', aggregateType: 'Delivery', aggregateId: delivery.id, dedupeKey: `Delivery:${delivery.id}:sent`, payload: json({ deliveryId: delivery.id }) })
    const result = { id: delivery.id, status: 'SENT' }
    if (input.idempotency) await completeIdempotency(tx, input.idempotency, result)
    return result
  })
}

export async function acknowledgeDelivery(db: PrismaClient, actor: SessionActor, input: { deliveryId: string, acknowledgedAt: string, note?: string, idempotency?: IdempotencyIdentity }): Promise<{ id: string, status: string }> {
  return await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM deliveries WHERE id = ${input.deliveryId} FOR UPDATE`
    const delivery = await tx.delivery.findUnique({ where: { id: input.deliveryId } })
    if (!delivery) throw new DomainError('NOT_FOUND', 'Delivery was not found')
    if (actor.role !== 'ADMIN' && delivery.ownerUserId !== actor.userId) throw new DomainError('FORBIDDEN', 'Only the assigned owner can acknowledge this delivery')
    if (delivery.status !== 'SENT') throw new DomainError('INVALID_STATE', 'Only a sent delivery can start waiting for a response')
    const changed = await tx.delivery.updateMany({ where: { id: delivery.id, status: 'SENT' }, data: { status: 'WAITING_RESPONSE', acknowledgedAt: new Date(input.acknowledgedAt), note: input.note ?? delivery.note, updatedById: actor.userId } })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'Delivery changed; reload and try again')
    await tx.deliveryHistory.create({ data: { deliveryId: delivery.id, fromStatus: delivery.status, toStatus: 'WAITING_RESPONSE', actorId: actor.userId, snapshot: json(input) } })
    await tx.auditLog.create({ data: { actorId: actor.userId, action: 'DELIVERY_WAITING_RESPONSE', entityType: 'Delivery', entityId: delivery.id, requestId: crypto.randomUUID(), beforeData: json(delivery), afterData: json({ status: 'WAITING_RESPONSE', acknowledgedAt: input.acknowledgedAt, note: input.note ?? delivery.note }) } })
    await enqueueNotificationEvent(tx, { eventType: 'DELIVERY_WAITING_RESPONSE', aggregateType: 'Delivery', aggregateId: delivery.id, dedupeKey: `Delivery:${delivery.id}:waiting-response`, payload: json({ deliveryId: delivery.id }) })
    const result = { id: delivery.id, status: 'WAITING_RESPONSE' }
    if (input.idempotency) await completeIdempotency(tx, input.idempotency, result)
    return result
  })
}
