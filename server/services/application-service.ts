import type { ApplicationStatus } from '../../shared/constants/domain'
import type { SessionActor } from '../../shared/types/api'
import { applicationTransitionsFrom, assertApplicationTransition } from '../domain/application-transition'
import { DomainError } from '../domain/errors'
import { requireRole } from '../policies/authorization'

export interface ApplicationRecord {
  id: string
  studentTermId: string
  status: ApplicationStatus
  version: number
  activeTerm: boolean
}

export interface ApplicationRepository {
  findForUpdate(id: string): Promise<ApplicationRecord | null>
  transition(input: { id: string, from: ApplicationStatus, to: ApplicationStatus, expectedVersion: number }): Promise<boolean>
  findCleanOwnedFileVersionIds(actorId: string, fileVersionIds: readonly string[]): Promise<string[]>
  attachEvidence(applicationId: string, fileVersionIds: readonly string[]): Promise<void>
  appendHistory(input: { applicationId: string, actorId: string, from: ApplicationStatus, to: ApplicationStatus, reason?: string, snapshot?: unknown }): Promise<void>
  appendAudit(input: { actorId: string, action: string, entityId: string, before: unknown, after: unknown, reason?: string }): Promise<void>
  transaction<T>(work: (repository: ApplicationRepository) => Promise<T>): Promise<T>
}

export function allowedApplicationTransitions(current: ApplicationRecord, actor: SessionActor): readonly ApplicationStatus[] {
  if (actor.role === 'STUDENT') return actor.studentTermId === current.studentTermId ? applicationTransitionsFrom(current.status) : []
  if (actor.role === 'LECTURER' && !current.activeTerm) return []
  return applicationTransitionsFrom(current.status)
}

export async function transitionApplication(
  repository: ApplicationRepository,
  actor: SessionActor,
  input: { applicationId: string, to: ApplicationStatus, expectedVersion: number, reason?: string, occurredAt?: string, note?: string, evidenceFileVersionIds?: string[] },
): Promise<ApplicationRecord> {
  requireRole(actor, 'STUDENT', 'LECTURER', 'ADMIN')
  return repository.transaction(async (tx) => {
    const current = await tx.findForUpdate(input.applicationId)
    if (!current) throw new DomainError('NOT_FOUND', 'Application was not found')
    if (actor.role === 'STUDENT' && actor.studentTermId !== current.studentTermId) {
      throw new DomainError('NOT_FOUND', 'Application was not found')
    }
    if (actor.role === 'LECTURER' && !current.activeTerm) throw new DomainError('FORBIDDEN', 'Lecturers can edit applications only in the active term')
    if (!allowedApplicationTransitions(current, actor).includes(input.to)) {
      throw new DomainError('FORBIDDEN', actor.role === 'STUDENT' ? 'Students may only transition their own application through the valid workflow' : 'This transition is not permitted')
    }
    assertApplicationTransition(current.status, input.to)
    if (actor.role !== 'STUDENT' && !input.reason?.trim()) {
      throw new DomainError('VALIDATION_FAILED', 'A reason is required when staff corrects a student application')
    }
    const evidenceFileVersionIds = input.evidenceFileVersionIds ?? []
    if (evidenceFileVersionIds.length) {
      const validIds = await tx.findCleanOwnedFileVersionIds(actor.userId, evidenceFileVersionIds)
      if (validIds.length !== evidenceFileVersionIds.length) throw new DomainError('VALIDATION_FAILED', 'Every evidence file must be clean and owned by the actor')
    }
    const changed = await tx.transition({
      id: current.id,
      from: current.status,
      to: input.to,
      expectedVersion: input.expectedVersion,
    })
    if (!changed) throw new DomainError('CONFLICT', 'Application changed; reload and try again')
    if (evidenceFileVersionIds.length) await tx.attachEvidence(current.id, evidenceFileVersionIds)
    const snapshot = {
      ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
      ...(input.note ? { note: input.note } : {}),
      ...(evidenceFileVersionIds.length ? { evidenceFileVersionIds } : {}),
    }
    await tx.appendHistory({ applicationId: current.id, actorId: actor.userId, from: current.status, to: input.to, reason: input.reason, snapshot })
    await tx.appendAudit({ actorId: actor.userId, action: 'APPLICATION_TRANSITIONED', entityId: current.id, before: current, after: { ...current, status: input.to, version: current.version + 1, ...snapshot }, reason: input.reason })
    return { ...current, status: input.to, version: current.version + 1 }
  })
}
