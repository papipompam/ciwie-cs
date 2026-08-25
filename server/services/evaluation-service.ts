import type { SessionActor } from '../../shared/types/api'
import { validateAndSnapshotAnswers, type EvaluationAnswerInput, type EvaluationItemRule } from '../domain/evaluation'
import { DomainError } from '../domain/errors'
import { requireRole } from '../policies/authorization'

export interface EvaluationAggregate {
  id: string
  status: 'DRAFT' | 'SUBMITTED'
  version: number
  templateVersionId: string
  assignedLecturerIds: string[]
  activeTerm: boolean
}

export interface EvaluationRepository {
  transaction<T>(work: (repository: EvaluationRepository) => Promise<T>): Promise<T>
  findForUpdate(id: string): Promise<EvaluationAggregate | null>
  getPublishedTemplateItems(templateVersionId: string): Promise<EvaluationItemRule[] | null>
  submit(input: { id: string, expectedVersion: number, actorId: string, answers: ReturnType<typeof validateAndSnapshotAnswers> }): Promise<boolean>
  appendVersion(input: { evaluationId: string, version: number, actorId: string, reason: string | null, snapshot: unknown }): Promise<void>
  appendAudit(input: { actorId: string, action: string, entityId: string, before: unknown, after: unknown, reason?: string }): Promise<void>
}

export async function submitEvaluation(
  repository: EvaluationRepository,
  actor: SessionActor,
  input: { evaluationId: string, expectedVersion: number, answers: EvaluationAnswerInput[] },
): Promise<{ id: string, version: number }> {
  requireRole(actor, 'LECTURER')
  return repository.transaction(async (tx) => {
    const evaluation = await tx.findForUpdate(input.evaluationId)
    if (!evaluation) throw new DomainError('NOT_FOUND', 'Evaluation was not found')
    if (!evaluation.activeTerm) throw new DomainError('FORBIDDEN', 'Lecturers can submit evaluations only in the active term')
    if (!actor.lecturerId || !evaluation.assignedLecturerIds.includes(actor.lecturerId)) throw new DomainError('FORBIDDEN', 'Only an assigned lecturer can submit this evaluation')
    if (evaluation.status !== 'DRAFT') throw new DomainError('INVALID_STATE', 'Only a draft evaluation can be submitted')
    if (evaluation.version !== input.expectedVersion) throw new DomainError('CONFLICT', 'Evaluation changed; reload and try again')
    const rules = await tx.getPublishedTemplateItems(evaluation.templateVersionId)
    if (!rules) throw new DomainError('INVALID_STATE', 'The evaluation template version is not published')
    const answers = validateAndSnapshotAnswers(rules, input.answers)
    const changed = await tx.submit({ id: evaluation.id, expectedVersion: input.expectedVersion, actorId: actor.userId, answers })
    if (!changed) throw new DomainError('CONFLICT', 'Evaluation changed; reload and try again')
    await tx.appendVersion({ evaluationId: evaluation.id, version: evaluation.version + 1, actorId: actor.userId, reason: null, snapshot: { status: 'SUBMITTED', answers } })
    await tx.appendAudit({ actorId: actor.userId, action: 'EVALUATION_SUBMITTED', entityId: evaluation.id, before: evaluation, after: { status: 'SUBMITTED', version: evaluation.version + 1 } })
    return { id: evaluation.id, version: evaluation.version + 1 }
  })
}
