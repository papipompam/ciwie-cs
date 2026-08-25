import type { Prisma, PrismaClient } from '@prisma/client'
import type { SessionActor } from '../../shared/types/api'
import { DomainError, isUniqueConstraintError } from '../domain/errors'
import { assertFileDownloadable } from './file-security-service'
import { enqueueNotificationEvent } from './notification-dispatcher'

export async function createSharedResponse(db: PrismaClient, actor: SessionActor, input: { batchId: string, fileVersionId: string, results: { batchMemberId: string, result: 'ACCEPTED' | 'DECLINED' }[] }): Promise<{ id: string, version: number }> {
  if (actor.role !== 'STUDENT' || !actor.studentTermId) throw new DomainError('FORBIDDEN', 'Only a student batch member can upload a response')
  try {
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM document_batches WHERE id = ${input.batchId} FOR UPDATE`
      const [batch, file, latest] = await Promise.all([
        tx.documentBatch.findUnique({ where: { id: input.batchId }, include: { members: true } }),
        tx.fileVersion.findUnique({ where: { id: input.fileVersionId } }),
        tx.responseForm.findFirst({ where: { batchId: input.batchId }, orderBy: { revision: 'desc' } }),
      ])
      if (!batch || !file) throw new DomainError('NOT_FOUND', 'Batch or response file was not found')
      if (!batch.members.some(member => member.studentTermId === actor.studentTermId)) throw new DomainError('NOT_FOUND', 'Batch was not found')
      if (!['SENT', 'CLOSED'].includes(batch.status)) throw new DomainError('INVALID_STATE', 'Response can be uploaded only after the batch is sent')
      assertFileDownloadable(file)
      const memberIds = new Set(batch.members.map(member => member.id))
      if (input.results.length !== memberIds.size || input.results.some(result => !memberIds.has(result.batchMemberId))) throw new DomainError('VALIDATION_FAILED', 'Response results must include every batch member exactly once')
      const response = await tx.responseForm.create({ data: {
        batchId: batch.id, revision: (latest?.revision ?? 0) + 1, fileVersionId: file.id, uploadedById: actor.userId,
        results: { create: input.results.map(result => ({ batchId: batch.id, batchMemberId: result.batchMemberId, result: result.result })) },
      } })
      await tx.auditLog.create({ data: { actorId: actor.userId, action: 'RESPONSE_UPLOADED', entityType: 'ResponseForm', entityId: response.id, requestId: crypto.randomUUID(), afterData: { batchId: batch.id, revision: response.revision } as Prisma.InputJsonValue } })
      await enqueueNotificationEvent(tx, { eventType: 'RESPONSE_UPLOADED', aggregateType: 'ResponseForm', aggregateId: response.id, dedupeKey: `ResponseForm:${response.id}:uploaded`, payload: { responseId: response.id } })
      return { id: response.id, version: response.lockVersion }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new DomainError('CONFLICT', 'Response revision or member result already exists')
    throw error
  }
}
