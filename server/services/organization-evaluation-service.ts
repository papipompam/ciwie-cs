import { randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import type { SessionActor } from '../../shared/types/api'
import type { EvaluationAnswerInput } from '../domain/evaluation'
import { validateAndSnapshotAnswers } from '../domain/evaluation'
import { DomainError } from '../domain/errors'
import { requireRole } from '../policies/authorization'

const json = (value: unknown) => value as Prisma.InputJsonValue

async function assertAssignment(db: Prisma.TransactionClient, actor: SessionActor, visitId: string): Promise<void> {
  requireRole(actor, 'LECTURER')
  const visit = await db.supervisionVisit.findUnique({ where: { id: visitId }, select: { coopTerm: { select: { isActive: true } }, lecturers: { where: { lecturerId: actor.lecturerId }, select: { lecturerId: true } } } })
  if (!visit) throw new DomainError('NOT_FOUND', 'Visit was not found')
  if (!visit.coopTerm.isActive) throw new DomainError('FORBIDDEN', 'Lecturers can edit evaluations only in the active term')
  if (!visit.lecturers.length) throw new DomainError('FORBIDDEN', 'Only an assigned lecturer can edit this evaluation')
}

async function assertActiveTerm(db: Prisma.TransactionClient, actor: SessionActor, visitId: string): Promise<void> {
  requireRole(actor, 'LECTURER')
  const visit = await db.supervisionVisit.findUnique({ where: { id: visitId }, select: { coopTerm: { select: { isActive: true } } } })
  if (!visit) throw new DomainError('NOT_FOUND', 'Visit was not found')
  if (!visit.coopTerm.isActive) throw new DomainError('FORBIDDEN', 'Lecturers can correct evaluations only in the active term')
}

async function rules(db: Prisma.TransactionClient, templateVersionId: string, requireActiveTemplate = true) {
  const version = await db.evaluationTemplateVersion.findFirst({ where: { id: templateVersionId, status: 'PUBLISHED', template: { subject: 'ORGANIZATION', ...(requireActiveTemplate ? { isActive: true } : {}) } }, include: { items: { orderBy: { sortOrder: 'asc' } } } })
  if (!version) throw new DomainError('VALIDATION_FAILED', 'Published organization template version was not found')
  return { version, rules: version.items.map(item => ({ id: item.id, code: item.code, answerType: item.answerType, required: item.required, maxScore: item.maxScore?.toNumber() ?? null, weight: item.weight?.toNumber() ?? 1 })) }
}

async function audit(db: Prisma.TransactionClient, actorId: string, action: string, evaluationId: string, before: unknown, after: unknown, reason?: string): Promise<void> {
  await db.auditLog.create({ data: { actorId, action, entityType: 'OrganizationEvaluation', entityId: evaluationId, requestId: randomUUID(), reason, beforeData: before == null ? Prisma.JsonNull : json(before), afterData: json(after) } })
}

async function replaceAnswers(db: Prisma.TransactionClient, evaluationId: string, answers: ReturnType<typeof validateAndSnapshotAnswers>): Promise<void> {
  await db.organizationEvaluationAnswer.deleteMany({ where: { evaluationId } })
  if (answers.length) await db.organizationEvaluationAnswer.createMany({ data: answers.map(answer => ({ evaluationId, itemId: answer.itemId, itemSnapshot: json({ itemCode: answer.itemCode, answerType: answer.answerType, maxScore: answer.maxScore, weight: answer.weight }), scoreValue: answer.score, textValue: answer.text, booleanValue: answer.booleanValue })) })
}

export async function saveOrganizationEvaluationDraft(db: PrismaClient, actor: SessionActor, input: { visitId: string, templateVersionId: string, answers: EvaluationAnswerInput[], expectedVersion?: number }): Promise<{ id: string, version: number }> {
  return await db.$transaction(async (tx) => {
    await assertAssignment(tx, actor, input.visitId)
    const template = await rules(tx, input.templateVersionId)
    const snapshots = validateAndSnapshotAnswers(template.rules, input.answers, { requireComplete: false })
    const existing = await tx.organizationEvaluation.findUnique({ where: { visitId_templateId: { visitId: input.visitId, templateId: template.version.templateId } } })
    if (existing?.status === 'SUBMITTED') throw new DomainError('INVALID_STATE', 'Submitted evaluation requires a correction command')
    if (existing && existing.version !== input.expectedVersion) throw new DomainError('CONFLICT', 'Evaluation changed; reload and try again')
    let evaluation
    if (existing) {
      const changed = await tx.organizationEvaluation.updateMany({ where: { id: existing.id, version: input.expectedVersion, status: 'DRAFT' }, data: { templateVersionId: input.templateVersionId, version: { increment: 1 }, updatedById: actor.userId } })
      if (changed.count !== 1) throw new DomainError('CONFLICT', 'Evaluation changed; reload and try again')
      evaluation = { ...existing, templateVersionId: input.templateVersionId, version: existing.version + 1, updatedById: actor.userId }
    } else {
      evaluation = await tx.organizationEvaluation.create({ data: { visitId: input.visitId, templateVersionId: input.templateVersionId, templateId: template.version.templateId, createdById: actor.userId, updatedById: actor.userId } })
    }
    await replaceAnswers(tx, evaluation.id, snapshots)
    await audit(tx, actor.userId, 'ORGANIZATION_EVALUATION_DRAFT_SAVED', evaluation.id, existing, { ...evaluation, answers: snapshots })
    return { id: evaluation.id, version: evaluation.version }
  })
}

export async function submitOrganizationEvaluation(db: PrismaClient, actor: SessionActor, input: { evaluationId: string, expectedVersion: number }): Promise<{ id: string, version: number }> {
  return await db.$transaction(async (tx) => {
    const evaluation = await tx.organizationEvaluation.findUnique({ where: { id: input.evaluationId }, include: { answers: true } })
    if (!evaluation) throw new DomainError('NOT_FOUND', 'Organization evaluation was not found')
    await assertAssignment(tx, actor, evaluation.visitId)
    if (evaluation.status !== 'DRAFT') throw new DomainError('INVALID_STATE', 'Only a draft evaluation can be submitted')
    const template = await rules(tx, evaluation.templateVersionId)
    validateAndSnapshotAnswers(template.rules, evaluation.answers.map(answer => ({ itemId: answer.itemId, score: answer.scoreValue?.toNumber(), text: answer.textValue ?? undefined, booleanValue: answer.booleanValue ?? undefined })))
    const changed = await tx.organizationEvaluation.updateMany({ where: { id: evaluation.id, version: input.expectedVersion, status: 'DRAFT' }, data: { status: 'SUBMITTED', version: { increment: 1 }, submittedAt: new Date(), submittedById: actor.userId, updatedById: actor.userId } })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'Evaluation changed; reload and try again')
    await tx.organizationEvaluationVersion.create({ data: { evaluationId: evaluation.id, version: evaluation.version + 1, snapshot: json({ templateVersionId: evaluation.templateVersionId, answers: evaluation.answers }), reason: 'Initial submission', actorId: actor.userId } })
    await audit(tx, actor.userId, 'ORGANIZATION_EVALUATION_SUBMITTED', evaluation.id, evaluation, { status: 'SUBMITTED', version: evaluation.version + 1, answers: evaluation.answers })
    return { id: evaluation.id, version: evaluation.version + 1 }
  })
}

export async function correctOrganizationEvaluation(db: PrismaClient, actor: SessionActor, input: { evaluationId: string, expectedVersion: number, reason: string, answers: EvaluationAnswerInput[] }): Promise<{ id: string, version: number }> {
  return await db.$transaction(async (tx) => {
    const evaluation = await tx.organizationEvaluation.findUnique({ where: { id: input.evaluationId }, include: { answers: true } })
    if (!evaluation) throw new DomainError('NOT_FOUND', 'Organization evaluation was not found')
    await assertActiveTerm(tx, actor, evaluation.visitId)
    if (evaluation.status !== 'SUBMITTED') throw new DomainError('INVALID_STATE', 'Only a submitted evaluation can be corrected')
    if (evaluation.version !== input.expectedVersion) throw new DomainError('CONFLICT', 'Evaluation changed; reload and try again')
    const template = await rules(tx, evaluation.templateVersionId, false)
    const snapshots = validateAndSnapshotAnswers(template.rules, input.answers)
    const versionSnapshot = { before: evaluation.answers, after: snapshots }
    const changed = await tx.organizationEvaluation.updateMany({ where: { id: evaluation.id, version: input.expectedVersion, status: 'SUBMITTED' }, data: { version: { increment: 1 }, updatedById: actor.userId } })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'Evaluation changed; reload and try again')
    await tx.organizationEvaluationVersion.create({ data: { evaluationId: evaluation.id, version: evaluation.version + 1, snapshot: json(versionSnapshot), reason: input.reason, actorId: actor.userId } })
    await replaceAnswers(tx, evaluation.id, snapshots)
    await audit(tx, actor.userId, 'ORGANIZATION_EVALUATION_CORRECTED', evaluation.id, { ...evaluation, answers: evaluation.answers }, { ...evaluation, version: evaluation.version + 1, answers: snapshots }, input.reason)
    return { id: evaluation.id, version: evaluation.version + 1 }
  })
}
