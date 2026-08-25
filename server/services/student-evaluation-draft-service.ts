import { randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { SessionActor } from '../../shared/types/api'
import type { EvaluationAnswerInput } from '../domain/evaluation'
import { validateAndSnapshotAnswers } from '../domain/evaluation'
import { DomainError } from '../domain/errors'
import { requireRole } from '../policies/authorization'

const json = (value: unknown) => value as Prisma.InputJsonValue

export async function saveStudentEvaluationDraft(db: PrismaClient, actor: SessionActor, input: { visitStudentId: string, templateVersionId: string, answers: EvaluationAnswerInput[], expectedVersion?: number }): Promise<{ id: string, version: number }> {
  requireRole(actor, 'LECTURER')
  return await db.$transaction(async (tx) => {
    const visitStudent = await tx.visitStudent.findUnique({ where: { id: input.visitStudentId }, include: { visit: { include: { coopTerm: true, lecturers: true } } } })
    if (!visitStudent) throw new DomainError('NOT_FOUND', 'Visit student was not found')
    if (!visitStudent.visit.coopTerm.isActive) throw new DomainError('FORBIDDEN', 'Lecturers can edit evaluations only in the active term')
    if (!actor.lecturerId || !visitStudent.visit.lecturers.some(member => member.lecturerId === actor.lecturerId)) throw new DomainError('FORBIDDEN', 'Only an assigned lecturer can edit this evaluation')
    const template = await tx.evaluationTemplateVersion.findFirst({ where: { id: input.templateVersionId, status: 'PUBLISHED', template: { subject: 'STUDENT', isActive: true } }, include: { items: { orderBy: { sortOrder: 'asc' } } } })
    if (!template) throw new DomainError('VALIDATION_FAILED', 'Published student template version was not found')
    const snapshots = validateAndSnapshotAnswers(template.items.map(item => ({ id: item.id, code: item.code, answerType: item.answerType, required: item.required, maxScore: item.maxScore?.toNumber() ?? null, weight: item.weight?.toNumber() ?? 1 })), input.answers, { requireComplete: false })
    const existing = await tx.studentEvaluation.findUnique({ where: { visitStudentId_templateId: { visitStudentId: input.visitStudentId, templateId: template.templateId } } })
    if (existing?.status === 'SUBMITTED') throw new DomainError('INVALID_STATE', 'Submitted evaluation requires a correction command')
    if (existing && existing.version !== input.expectedVersion) throw new DomainError('CONFLICT', 'Evaluation changed; reload and try again')
    const evaluation = existing
      ? await tx.studentEvaluation.update({ where: { id: existing.id }, data: { templateVersionId: template.id, version: { increment: 1 }, updatedById: actor.userId } })
      : await tx.studentEvaluation.create({ data: { visitStudentId: input.visitStudentId, templateVersionId: template.id, templateId: template.templateId, createdById: actor.userId, updatedById: actor.userId } })
    await tx.studentEvaluationAnswer.deleteMany({ where: { evaluationId: evaluation.id } })
    if (snapshots.length) await tx.studentEvaluationAnswer.createMany({ data: snapshots.map(answer => ({ evaluationId: evaluation.id, itemId: answer.itemId, itemSnapshot: json({ itemCode: answer.itemCode, answerType: answer.answerType, maxScore: answer.maxScore, weight: answer.weight }), scoreValue: answer.score, textValue: answer.text, booleanValue: answer.booleanValue })) })
    return { id: evaluation.id, version: evaluation.version }
  })
}

export async function correctStudentEvaluation(db: PrismaClient, actor: SessionActor, input: { evaluationId: string, expectedVersion: number, reason: string, answers: EvaluationAnswerInput[] }): Promise<{ id: string, version: number }> {
  requireRole(actor, 'LECTURER')
  return await db.$transaction(async (tx) => {
    const evaluation = await tx.studentEvaluation.findUnique({
      where: { id: input.evaluationId },
      include: {
        answers: true,
        visitStudent: { include: { visit: { include: { coopTerm: true } } } },
        templateVersion: { include: { template: true, items: { orderBy: { sortOrder: 'asc' } } } },
      },
    })
    if (!evaluation) throw new DomainError('NOT_FOUND', 'Student evaluation was not found')
    if (!actor.lecturerId || !evaluation.visitStudent.visit.coopTerm.isActive) throw new DomainError('FORBIDDEN', 'Lecturers can correct evaluations only in the active term')
    if (evaluation.status !== 'SUBMITTED') throw new DomainError('INVALID_STATE', 'Only a submitted evaluation can be corrected')
    if (evaluation.version !== input.expectedVersion) throw new DomainError('CONFLICT', 'Evaluation changed; reload and try again')
    if (evaluation.templateVersion.status !== 'PUBLISHED' || evaluation.templateVersion.template.subject !== 'STUDENT') {
      throw new DomainError('INVALID_STATE', 'The submitted student template version is unavailable')
    }
    const snapshots = validateAndSnapshotAnswers(evaluation.templateVersion.items.map(item => ({
      id: item.id,
      code: item.code,
      answerType: item.answerType,
      required: item.required,
      maxScore: item.maxScore?.toNumber() ?? null,
      weight: item.weight?.toNumber() ?? 1,
    })), input.answers)
    const before = { ...evaluation, answers: evaluation.answers }
    const changed = await tx.studentEvaluation.updateMany({ where: { id: evaluation.id, version: input.expectedVersion, status: 'SUBMITTED' }, data: { version: { increment: 1 }, updatedById: actor.userId } })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'Evaluation changed; reload and try again')
    await tx.studentEvaluationVersion.create({ data: { evaluationId: evaluation.id, version: evaluation.version + 1, snapshot: json({ before: evaluation.answers, after: snapshots }), reason: input.reason, actorId: actor.userId } })
    await tx.studentEvaluationAnswer.deleteMany({ where: { evaluationId: evaluation.id } })
    if (snapshots.length) await tx.studentEvaluationAnswer.createMany({ data: snapshots.map(answer => ({ evaluationId: evaluation.id, itemId: answer.itemId, itemSnapshot: json({ itemCode: answer.itemCode, answerType: answer.answerType, maxScore: answer.maxScore, weight: answer.weight }), scoreValue: answer.score, textValue: answer.text, booleanValue: answer.booleanValue })) })
    await tx.auditLog.create({ data: {
      actorId: actor.userId,
      action: 'STUDENT_EVALUATION_CORRECTED',
      entityType: 'StudentEvaluation',
      entityId: evaluation.id,
      requestId: randomUUID(),
      reason: input.reason,
      beforeData: json(before),
      afterData: json({ ...evaluation, version: evaluation.version + 1, answers: snapshots }),
    } })
    return { id: evaluation.id, version: evaluation.version + 1 }
  })
}
