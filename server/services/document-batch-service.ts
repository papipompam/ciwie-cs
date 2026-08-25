import type { SessionActor } from '../../shared/types/api'
import { DomainError, isUniqueConstraintError } from '../domain/errors'
import { requireRole } from '../policies/authorization'

export interface BatchRecord { id: string, coopTermId: string, workSiteId: string, status: string, version: number, activeTerm: boolean }
export interface RequestRecord { id: string, studentTermId: string, coopTermId: string, workSiteId: string, status: string }
export interface DocumentBatchRepository {
  transaction<T>(work: (repository: DocumentBatchRepository) => Promise<T>): Promise<T>
  findBatchForUpdate(id: string): Promise<BatchRecord | null>
  findRequestForUpdate(id: string): Promise<RequestRecord | null>
  createMember(input: { batchId: string, request: RequestRecord, actorId: string }): Promise<{ id: string }>
  reserveStudent(input: { batchMemberId: string, batchId: string, request: RequestRecord }): Promise<void>
  incrementBatchVersion(id: string, expectedVersion: number, actorId: string): Promise<boolean>
  appendAudit(input: { actorId: string, action: string, entityId: string, before: unknown, after: unknown }): Promise<void>
}

export async function addDocumentBatchMember(
  repository: DocumentBatchRepository,
  actor: SessionActor,
  input: { batchId: string, requestId: string, expectedBatchVersion: number },
): Promise<{ batchMemberId: string }> {
  requireRole(actor, 'LECTURER', 'ADMIN')
  try {
    return await repository.transaction(async (tx) => {
      const [batch, request] = await Promise.all([tx.findBatchForUpdate(input.batchId), tx.findRequestForUpdate(input.requestId)])
      if (!batch || !request) throw new DomainError('NOT_FOUND', 'Batch or request was not found')
      if (actor.role === 'LECTURER' && !batch.activeTerm) throw new DomainError('FORBIDDEN', 'Lecturers can edit batches only in the active term')
      if (batch.status !== 'DRAFT') throw new DomainError('INVALID_STATE', 'Members can be added only to a draft batch')
      if (batch.version !== input.expectedBatchVersion) throw new DomainError('CONFLICT', 'Batch changed; reload and try again')
      if (request.status === 'CANCELLED' || request.coopTermId !== batch.coopTermId || request.workSiteId !== batch.workSiteId) {
        throw new DomainError('VALIDATION_FAILED', 'Request term and work site must match the batch')
      }
      const member = await tx.createMember({ batchId: batch.id, request, actorId: actor.userId })
      await tx.reserveStudent({ batchMemberId: member.id, batchId: batch.id, request })
      const changed = await tx.incrementBatchVersion(batch.id, input.expectedBatchVersion, actor.userId)
      if (!changed) throw new DomainError('CONFLICT', 'Batch changed; reload and try again')
      await tx.appendAudit({ actorId: actor.userId, action: 'DOCUMENT_BATCH_MEMBER_ADDED', entityId: batch.id, before: batch, after: { batchMemberId: member.id, requestId: request.id } })
      return { batchMemberId: member.id }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new DomainError('CONFLICT', 'This request or student already belongs to an active batch for the term and work site')
    throw error
  }
}
