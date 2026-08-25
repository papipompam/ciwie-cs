import type { SessionActor } from '../../shared/types/api'
import { DomainError, isUniqueConstraintError } from '../domain/errors'
import { requireRole } from '../policies/authorization'
import type { IdempotencyIdentity } from './idempotency-completion'

export interface ResponseMemberResult {
  batchMemberId: string
  studentTermId: string
  workSiteId: string
  result: 'ACCEPTED' | 'DECLINED' | null
  responseResultId: string | null
}

export interface ResponseAggregate {
  id: string
  batchId: string
  status: 'DRAFT' | 'PENDING_REVIEW' | 'CONFIRMED'
  version: number
  members: ResponseMemberResult[]
  activeTerm: boolean
}

export interface ResponsePlacementRepository {
  transaction<T>(work: (repository: ResponsePlacementRepository) => Promise<T>): Promise<T>
  findResponseForUpdate(id: string): Promise<ResponseAggregate | null>
  replaceDraftResults(responseId: string, expectedVersion: number, results: readonly { batchMemberId: string, result: 'ACCEPTED' | 'DECLINED' }[]): Promise<boolean>
  transitionResponse(id: string, from: 'DRAFT' | 'PENDING_REVIEW', to: 'DRAFT' | 'PENDING_REVIEW', expectedVersion: number): Promise<boolean>
  confirmResponse(id: string, expectedVersion: number, actorId: string, confirmedAt: Date): Promise<boolean>
  confirmMemberResult(responseId: string, batchMemberId: string, actorId: string, confirmedAt: Date): Promise<string>
  createPlacement(input: { studentTermId: string, workSiteId: string, sourceResponseResultId: string, actorId: string, confirmedAt: Date }): Promise<void>
  cancelOtherApplications(input: { studentTermId: string, workSiteId: string, actorId: string, reason: string }): Promise<void>
  appendAudit(input: { actorId: string, action: string, entityId: string, before: unknown, after: unknown, reason?: string }): Promise<void>
  enqueueOutbox(input: { dedupeKey: string, type: string, payload: unknown }): Promise<void>
  completeIdempotency?(identity: IdempotencyIdentity, response: unknown): Promise<void>
}

function assertStudentIsBatchMember(response: ResponseAggregate, actor: SessionActor): void {
  if (!actor.studentTermId || !response.members.some(member => member.studentTermId === actor.studentTermId)) {
    throw new DomainError('NOT_FOUND', 'Response was not found')
  }
}

export async function updateResponseResults(
  repository: ResponsePlacementRepository,
  actor: SessionActor,
  input: { responseId: string, expectedVersion: number, results: { batchMemberId: string, result: 'ACCEPTED' | 'DECLINED' }[] },
): Promise<{ id: string, version: number }> {
  requireRole(actor, 'STUDENT', 'LECTURER', 'ADMIN')
  return repository.transaction(async (tx) => {
    const response = await tx.findResponseForUpdate(input.responseId)
    if (!response) throw new DomainError('NOT_FOUND', 'Response was not found')
    if (actor.role === 'LECTURER' && !response.activeTerm) throw new DomainError('FORBIDDEN', 'Lecturers can edit responses only in the active term')
    if (response.version !== input.expectedVersion) throw new DomainError('CONFLICT', 'Response changed; reload and try again')
    if (actor.role === 'STUDENT') {
      assertStudentIsBatchMember(response, actor)
      if (response.status !== 'DRAFT') throw new DomainError('INVALID_STATE', 'Students can edit only a draft response')
    } else if (response.status === 'CONFIRMED') {
      throw new DomainError('INVALID_STATE', 'A confirmed response requires a correction command')
    }
    const expectedMembers = new Set(response.members.map(member => member.batchMemberId))
    if (input.results.length !== expectedMembers.size || input.results.some(result => !expectedMembers.has(result.batchMemberId))) {
      throw new DomainError('VALIDATION_FAILED', 'Draft results must contain exactly every batch member')
    }
    const changed = await tx.replaceDraftResults(response.id, input.expectedVersion, input.results)
    if (!changed) throw new DomainError('CONFLICT', 'Response changed; reload and try again')
    await tx.appendAudit({ actorId: actor.userId, action: 'RESPONSE_RESULTS_UPDATED', entityId: response.id, before: response.members, after: input.results })
    return { id: response.id, version: response.version + 1 }
  })
}

export async function submitResponseReview(
  repository: ResponsePlacementRepository,
  actor: SessionActor,
  input: { responseId: string, expectedVersion: number },
): Promise<{ id: string, version: number }> {
  requireRole(actor, 'STUDENT')
  return repository.transaction(async (tx) => {
    const response = await tx.findResponseForUpdate(input.responseId)
    if (!response) throw new DomainError('NOT_FOUND', 'Response was not found')
    assertStudentIsBatchMember(response, actor)
    if (response.status !== 'DRAFT') throw new DomainError('INVALID_STATE', 'Only a draft response can be submitted')
    if (response.members.some(member => member.result === null)) throw new DomainError('VALIDATION_FAILED', 'Every batch member must have a result')
    const changed = await tx.transitionResponse(response.id, 'DRAFT', 'PENDING_REVIEW', input.expectedVersion)
    if (!changed) throw new DomainError('CONFLICT', 'Response changed; reload and try again')
    await tx.appendAudit({ actorId: actor.userId, action: 'RESPONSE_SUBMITTED_FOR_REVIEW', entityId: response.id, before: { status: 'DRAFT' }, after: { status: 'PENDING_REVIEW' } })
    return { id: response.id, version: response.version + 1 }
  })
}

export async function returnResponseToDraft(
  repository: ResponsePlacementRepository,
  actor: SessionActor,
  input: { responseId: string, expectedVersion: number, reason: string },
): Promise<{ id: string, version: number }> {
  requireRole(actor, 'LECTURER', 'ADMIN')
  return repository.transaction(async (tx) => {
    const response = await tx.findResponseForUpdate(input.responseId)
    if (!response) throw new DomainError('NOT_FOUND', 'Response was not found')
    if (actor.role === 'LECTURER' && !response.activeTerm) throw new DomainError('FORBIDDEN', 'Lecturers can return responses only in the active term')
    if (response.status !== 'PENDING_REVIEW') throw new DomainError('INVALID_STATE', 'Only a pending response can be returned')
    const changed = await tx.transitionResponse(response.id, 'PENDING_REVIEW', 'DRAFT', input.expectedVersion)
    if (!changed) throw new DomainError('CONFLICT', 'Response changed; reload and try again')
    await tx.appendAudit({ actorId: actor.userId, action: 'RESPONSE_RETURNED', entityId: response.id, before: { status: 'PENDING_REVIEW' }, after: { status: 'DRAFT' }, reason: input.reason })
    return { id: response.id, version: response.version + 1 }
  })
}

export async function confirmResponseAndPlacements(
  repository: ResponsePlacementRepository,
  actor: SessionActor,
  input: { responseId: string, expectedVersion: number, reason?: string, now?: Date, idempotency?: IdempotencyIdentity },
): Promise<{ responseId: string, placementCount: number }> {
  requireRole(actor, 'LECTURER', 'ADMIN')
  try {
    return await repository.transaction(async (tx) => {
      const response = await tx.findResponseForUpdate(input.responseId)
      if (!response) throw new DomainError('NOT_FOUND', 'Response was not found')
      if (actor.role === 'LECTURER' && !response.activeTerm) throw new DomainError('FORBIDDEN', 'Lecturers can confirm responses only in the active term')
      if (response.status !== 'PENDING_REVIEW') throw new DomainError('INVALID_STATE', 'Only a pending response can be confirmed')
      if (response.version !== input.expectedVersion) throw new DomainError('CONFLICT', 'Response changed; reload and try again')
      if (!response.members.length || response.members.some(member => member.result === null)) {
        throw new DomainError('VALIDATION_FAILED', 'Every batch member must have an ACCEPTED or DECLINED result')
      }

      const confirmedAt = input.now ?? new Date()
      let placementCount = 0
      for (const member of response.members) {
        const responseResultId = await tx.confirmMemberResult(response.id, member.batchMemberId, actor.userId, confirmedAt)
        if (member.result === 'ACCEPTED') {
          await tx.createPlacement({ studentTermId: member.studentTermId, workSiteId: member.workSiteId, sourceResponseResultId: responseResultId, actorId: actor.userId, confirmedAt })
          await tx.cancelOtherApplications({ studentTermId: member.studentTermId, workSiteId: member.workSiteId, actorId: actor.userId, reason: 'Placement confirmed from shared response' })
          placementCount += 1
        }
      }
      const changed = await tx.confirmResponse(response.id, input.expectedVersion, actor.userId, confirmedAt)
      if (!changed) throw new DomainError('CONFLICT', 'Response changed; reload and try again')
      await tx.appendAudit({ actorId: actor.userId, action: 'RESPONSE_CONFIRMED', entityId: response.id, before: response, after: { status: 'CONFIRMED', placementCount }, reason: input.reason })
      await tx.enqueueOutbox({ dedupeKey: `response:${response.id}:confirmed:v${response.version + 1}`, type: 'RESPONSE_CONFIRMED', payload: { responseId: response.id } })
      const result = { responseId: response.id, placementCount }
      if (input.idempotency) {
        if (!tx.completeIdempotency) throw new Error('Repository does not support atomic idempotency completion')
        await tx.completeIdempotency(input.idempotency, result)
      }
      return result
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new DomainError('CONFLICT', 'A placement already exists for at least one student in this term')
    throw error
  }
}
