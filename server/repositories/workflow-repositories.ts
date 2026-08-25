import { randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import type { ApplicationRepository, ApplicationRecord } from '../services/application-service'
import type { ResponseAggregate, ResponsePlacementRepository } from '../services/response-placement-service'
import type { ScheduleVisitInput, VisitRepository } from '../services/visit-service'
import type { EvaluationAggregate, EvaluationRepository } from '../services/evaluation-service'
import type { EvaluationItemRule } from '../domain/evaluation'
import { DomainError } from '../domain/errors'
import type { BatchRecord, DocumentBatchRepository, RequestRecord } from '../services/document-batch-service'
import { completeIdempotency } from '../services/idempotency-completion'
import { enqueueNotificationEvent } from '../services/notification-dispatcher'

type Db = PrismaClient | Prisma.TransactionClient
const json = (value: unknown) => value as Prisma.InputJsonValue

async function audit(db: Db, input: { actorId: string, action: string, entityType: string, entityId: string, before: unknown, after: unknown, reason?: string }): Promise<void> {
  await db.auditLog.create({ data: {
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    requestId: randomUUID(),
    reason: input.reason,
    beforeData: json(input.before),
    afterData: json(input.after),
  } })
}

async function outbox(db: Db, input: { dedupeKey: string, type: string, payload: unknown }): Promise<void> {
  const payload = input.payload as Record<string, unknown>
  const aggregateId = String(payload.responseId ?? payload.visitId ?? randomUUID())
  await enqueueNotificationEvent(db, {
    eventType: input.type,
    aggregateType: input.type.startsWith('VISIT_') ? 'SupervisionVisit' : 'ResponseForm',
    aggregateId,
    dedupeKey: input.dedupeKey,
    payload: json(input.payload),
  })
}

export class PrismaApplicationRepository implements ApplicationRepository {
  constructor(private readonly db: Db, private readonly root?: PrismaClient) {}
  transaction<T>(work: (repository: ApplicationRepository) => Promise<T>): Promise<T> {
    if (!this.root) return work(this)
    return this.root.$transaction(tx => work(new PrismaApplicationRepository(tx)))
  }
  async findForUpdate(id: string): Promise<ApplicationRecord | null> {
    await this.db.$queryRaw`SELECT id FROM applications WHERE id = ${id} FOR UPDATE`
    const record = await this.db.application.findUnique({ where: { id }, select: { id: true, studentTermId: true, status: true, version: true, coopTerm: { select: { isActive: true } } } })
    return record && { id: record.id, studentTermId: record.studentTermId, status: record.status, version: record.version, activeTerm: record.coopTerm.isActive }
  }
  async transition(input: Parameters<ApplicationRepository['transition']>[0]): Promise<boolean> {
    const result = await this.db.application.updateMany({ where: { id: input.id, status: input.from, version: input.expectedVersion }, data: { status: input.to, version: { increment: 1 } } })
    return result.count === 1
  }
  async findCleanOwnedFileVersionIds(actorId: string, fileVersionIds: readonly string[]): Promise<string[]> {
    if (!fileVersionIds.length) return []
    return (await this.db.fileVersion.findMany({ where: { id: { in: [...fileVersionIds] }, createdById: actorId, scanStatus: 'CLEAN' }, select: { id: true } })).map(file => file.id)
  }
  async attachEvidence(applicationId: string, fileVersionIds: readonly string[]): Promise<void> {
    if (!fileVersionIds.length) return
    await this.db.applicationEvidenceFile.createMany({ data: fileVersionIds.map(fileVersionId => ({ applicationId, fileVersionId })), skipDuplicates: true })
  }
  async appendHistory(input: Parameters<ApplicationRepository['appendHistory']>[0]): Promise<void> {
    await this.db.applicationStatusHistory.create({ data: { applicationId: input.applicationId, actorId: input.actorId, fromStatus: input.from, toStatus: input.to, reason: input.reason, snapshot: input.snapshot == null ? undefined : json(input.snapshot) } })
  }
  appendAudit(input: Parameters<ApplicationRepository['appendAudit']>[0]): Promise<void> {
    return audit(this.db, { ...input, entityType: 'Application' })
  }
}

export class PrismaResponsePlacementRepository implements ResponsePlacementRepository {
  constructor(private readonly db: Db, private readonly root?: PrismaClient) {}
  transaction<T>(work: (repository: ResponsePlacementRepository) => Promise<T>): Promise<T> {
    if (!this.root) return work(this)
    return this.root.$transaction(tx => work(new PrismaResponsePlacementRepository(tx)), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }
  async findResponseForUpdate(id: string): Promise<ResponseAggregate | null> {
    await this.db.$queryRaw`SELECT id FROM response_forms WHERE id = ${id} FOR UPDATE`
    const response = await this.db.responseForm.findUnique({
      where: { id },
      include: { batch: { include: { members: true, coopTerm: { select: { isActive: true } } } }, results: true },
    })
    if (!response) return null
    const results = new Map(response.results.map(result => [result.batchMemberId, result]))
    return {
      id: response.id,
      batchId: response.batchId,
      status: response.status,
      version: response.lockVersion,
      activeTerm: response.batch.coopTerm.isActive,
      members: response.batch.members.map(member => ({
        batchMemberId: member.id,
        studentTermId: member.studentTermId,
        workSiteId: member.workSiteId,
        result: results.get(member.id)?.result ?? null,
        responseResultId: results.get(member.id)?.id ?? null,
      })),
    }
  }
  async replaceDraftResults(responseId: string, expectedVersion: number, results: readonly { batchMemberId: string, result: 'ACCEPTED' | 'DECLINED' }[]): Promise<boolean> {
    const response = await this.db.responseForm.findUnique({ where: { id: responseId }, select: { batchId: true } })
    if (!response) return false
    const updated = await this.db.responseForm.updateMany({ where: { id: responseId, lockVersion: expectedVersion, status: { in: ['DRAFT', 'PENDING_REVIEW'] } }, data: { lockVersion: { increment: 1 } } })
    if (updated.count !== 1) return false
    for (const result of results) {
      await this.db.responseStudentResult.upsert({
        where: { responseFormId_batchMemberId: { responseFormId: responseId, batchMemberId: result.batchMemberId } },
        create: { responseFormId: responseId, batchMemberId: result.batchMemberId, batchId: response.batchId, result: result.result },
        update: { result: result.result },
      })
    }
    return true
  }
  async transitionResponse(id: string, from: 'DRAFT' | 'PENDING_REVIEW', to: 'DRAFT' | 'PENDING_REVIEW', expectedVersion: number): Promise<boolean> {
    const result = await this.db.responseForm.updateMany({ where: { id, status: from, lockVersion: expectedVersion }, data: { status: to, lockVersion: { increment: 1 }, submittedAt: to === 'PENDING_REVIEW' ? new Date() : null } })
    return result.count === 1
  }
  async confirmResponse(id: string, expectedVersion: number, actorId: string, confirmedAt: Date): Promise<boolean> {
    const result = await this.db.responseForm.updateMany({ where: { id, status: 'PENDING_REVIEW', lockVersion: expectedVersion }, data: { status: 'CONFIRMED', lockVersion: { increment: 1 }, confirmedById: actorId, confirmedAt } })
    return result.count === 1
  }
  async confirmMemberResult(responseId: string, batchMemberId: string, actorId: string, confirmedAt: Date): Promise<string> {
    return (await this.db.responseStudentResult.update({ where: { responseFormId_batchMemberId: { responseFormId: responseId, batchMemberId } }, data: { confirmedById: actorId, confirmedAt }, select: { id: true } })).id
  }
  async createPlacement(input: Parameters<ResponsePlacementRepository['createPlacement']>[0]): Promise<void> {
    const existing = await this.db.placement.findUnique({ where: { studentTermId: input.studentTermId } })
    if (!existing) {
      await this.db.placement.create({ data: { studentTermId: input.studentTermId, currentWorkSiteId: input.workSiteId, sourceResponseResultId: input.sourceResponseResultId, confirmedById: input.actorId, confirmedAt: input.confirmedAt } })
      return
    }
    if (existing.status !== 'REVERSED') throw new DomainError('CONFLICT', 'An active placement already exists for this student and term')
    const updated = await this.db.placement.update({ where: { id: existing.id }, data: { currentWorkSiteId: input.workSiteId, sourceResponseResultId: input.sourceResponseResultId, status: 'ACTIVE', version: { increment: 1 }, confirmedById: input.actorId, confirmedAt: input.confirmedAt } })
    await this.db.placementVersion.create({ data: { placementId: existing.id, version: updated.version, snapshot: json({ before: existing, after: updated }), reason: 'New accepted response after placement reversal', actorId: input.actorId } })
  }
  async cancelOtherApplications(input: Parameters<ResponsePlacementRepository['cancelOtherApplications']>[0]): Promise<void> {
    const applications = await this.db.application.findMany({ where: { studentTermId: input.studentTermId, workSiteId: { not: input.workSiteId }, status: { notIn: ['REJECTED', 'CANCELLED'] } }, select: { id: true, status: true } })
    for (const application of applications) {
      await this.db.application.update({ where: { id: application.id }, data: { status: 'CANCELLED', version: { increment: 1 }, updatedById: input.actorId } })
      await this.db.applicationStatusHistory.create({ data: { applicationId: application.id, fromStatus: application.status, toStatus: 'CANCELLED', actorId: input.actorId, reason: input.reason } })
    }
  }
  appendAudit(input: Parameters<ResponsePlacementRepository['appendAudit']>[0]): Promise<void> { return audit(this.db, { ...input, entityType: 'ResponseForm' }) }
  enqueueOutbox(input: Parameters<ResponsePlacementRepository['enqueueOutbox']>[0]): Promise<void> { return outbox(this.db, input) }
  completeIdempotency(identity: Parameters<NonNullable<ResponsePlacementRepository['completeIdempotency']>>[0], response: unknown): Promise<void> { return completeIdempotency(this.db as Prisma.TransactionClient, identity, response) }
}

export class PrismaDocumentBatchRepository implements DocumentBatchRepository {
  constructor(private readonly db: Db, private readonly root?: PrismaClient) {}
  transaction<T>(work: (repository: DocumentBatchRepository) => Promise<T>): Promise<T> {
    if (!this.root) return work(this)
    return this.root.$transaction(tx => work(new PrismaDocumentBatchRepository(tx)), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }
  async findBatchForUpdate(id: string): Promise<BatchRecord | null> {
    await this.db.$queryRaw`SELECT id FROM document_batches WHERE id = ${id} FOR UPDATE`
    const batch = await this.db.documentBatch.findUnique({ where: { id }, select: { id: true, coopTermId: true, workSiteId: true, status: true, lockVersion: true, coopTerm: { select: { isActive: true } } } })
    return batch && { id: batch.id, coopTermId: batch.coopTermId, workSiteId: batch.workSiteId, status: batch.status, version: batch.lockVersion, activeTerm: batch.coopTerm.isActive }
  }
  async findRequestForUpdate(id: string): Promise<RequestRecord | null> {
    await this.db.$queryRaw`SELECT id FROM document_requests WHERE id = ${id} FOR UPDATE`
    return await this.db.documentRequest.findUnique({ where: { id }, select: { id: true, studentTermId: true, coopTermId: true, workSiteId: true, status: true } })
  }
  async createMember(input: Parameters<DocumentBatchRepository['createMember']>[0]): Promise<{ id: string }> {
    return await this.db.documentBatchMember.create({ data: {
      batchId: input.batchId,
      requestId: input.request.id,
      studentTermId: input.request.studentTermId,
      coopTermId: input.request.coopTermId,
      workSiteId: input.request.workSiteId,
      snapshot: json(input.request),
    }, select: { id: true } })
  }
  async reserveStudent(input: Parameters<DocumentBatchRepository['reserveStudent']>[0]): Promise<void> {
    await this.db.documentBatchStudentSlot.create({ data: {
      batchMemberId: input.batchMemberId,
      batchId: input.batchId,
      studentTermId: input.request.studentTermId,
      coopTermId: input.request.coopTermId,
      workSiteId: input.request.workSiteId,
    } })
  }
  async incrementBatchVersion(id: string, expectedVersion: number, actorId: string): Promise<boolean> {
    const result = await this.db.documentBatch.updateMany({ where: { id, lockVersion: expectedVersion }, data: { lockVersion: { increment: 1 }, updatedById: actorId } })
    return result.count === 1
  }
  appendAudit(input: Parameters<DocumentBatchRepository['appendAudit']>[0]): Promise<void> { return audit(this.db, { ...input, entityType: 'DocumentBatch' }) }
}

export class PrismaVisitRepository implements VisitRepository {
  constructor(private readonly db: Db, private readonly root?: PrismaClient) {}
  transaction<T>(work: (repository: VisitRepository) => Promise<T>): Promise<T> {
    if (!this.root) return work(this)
    return this.root.$transaction(tx => work(new PrismaVisitRepository(tx)), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }
  async assertEligibleStudents(input: Parameters<VisitRepository['assertEligibleStudents']>[0]): Promise<void> {
    const count = await this.db.placement.count({ where: { studentTermId: { in: input.studentTermIds }, currentWorkSiteId: input.workSiteId, status: 'ACTIVE', studentTerm: { coopTermId: input.coopTermId } } })
    if (count !== input.studentTermIds.length) throw new DomainError('VALIDATION_FAILED', 'Every visit student must have an active placement at this work site and term')
  }
  async createVisit(input: ScheduleVisitInput & { actorId: string }): Promise<{ id: string }> {
    return await this.db.supervisionVisit.create({ data: {
      coopTermId: input.coopTermId,
      workSiteId: input.workSiteId,
      round: input.round === 1 ? 'ROUND_1' : 'ROUND_2',
      visitDate: new Date(`${input.date}T00:00:00.000Z`),
      period: input.period,
      createdById: input.actorId,
      updatedById: input.actorId,
      students: { create: input.studentTermIds.map(studentTermId => ({ studentTermId, coopTermId: input.coopTermId })) },
      lecturers: { create: input.lecturerIds.map(lecturerId => ({ lecturerId })) },
    }, select: { id: true } })
  }
  async reserveStudentSlots(input: Parameters<VisitRepository['reserveStudentSlots']>[0]): Promise<void> {
    await this.db.visitStudentSlot.createMany({ data: input.studentTermIds.map(studentTermId => ({ visitId: input.visitId, studentTermId, round: input.round === 1 ? 'ROUND_1' : 'ROUND_2', visitDate: new Date(`${input.date}T00:00:00.000Z`), period: input.period as 'MORNING' | 'AFTERNOON' })) })
  }
  async reserveLecturerSlots(input: Parameters<VisitRepository['reserveLecturerSlots']>[0]): Promise<void> {
    await this.db.visitLecturerSlot.createMany({ data: input.lecturerIds.map(lecturerId => ({ visitId: input.visitId, lecturerId, visitDate: new Date(`${input.date}T00:00:00.000Z`), period: input.period as 'MORNING' | 'AFTERNOON' })) })
  }
  async reserveWorkSiteSlot(input: Parameters<VisitRepository['reserveWorkSiteSlot']>[0]): Promise<void> {
    await this.db.visitWorkSiteSlot.create({ data: { visitId: input.visitId, workSiteId: input.workSiteId, visitDate: new Date(`${input.date}T00:00:00.000Z`), period: input.period as 'MORNING' | 'AFTERNOON' } })
  }
  async appendVisitHistory(input: Parameters<VisitRepository['appendVisitHistory']>[0]): Promise<void> {
    await this.db.supervisionVisitHistory.create({ data: { visitId: input.visitId, actorId: input.actorId, action: input.action, reason: input.reason, snapshot: json(input.snapshot) } })
  }
  enqueueOutbox(input: Parameters<VisitRepository['enqueueOutbox']>[0]): Promise<void> { return outbox(this.db, input) }
  completeIdempotency(identity: Parameters<NonNullable<VisitRepository['completeIdempotency']>>[0], response: unknown): Promise<void> { return completeIdempotency(this.db as Prisma.TransactionClient, identity, response) }
}

export class PrismaEvaluationRepository implements EvaluationRepository {
  constructor(private readonly db: Db, private readonly root?: PrismaClient) {}
  transaction<T>(work: (repository: EvaluationRepository) => Promise<T>): Promise<T> {
    if (!this.root) return work(this)
    return this.root.$transaction(tx => work(new PrismaEvaluationRepository(tx)), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }
  async findForUpdate(id: string): Promise<EvaluationAggregate | null> {
    await this.db.$queryRaw`SELECT id FROM student_evaluations WHERE id = ${id} FOR UPDATE`
    const evaluation = await this.db.studentEvaluation.findUnique({ where: { id }, select: { id: true, status: true, version: true, templateVersionId: true, visitStudent: { select: { visit: { select: { coopTerm: { select: { isActive: true } }, lecturers: { select: { lecturerId: true } } } } } } } })
    return evaluation && { id: evaluation.id, status: evaluation.status, version: evaluation.version, templateVersionId: evaluation.templateVersionId, assignedLecturerIds: evaluation.visitStudent.visit.lecturers.map(item => item.lecturerId), activeTerm: evaluation.visitStudent.visit.coopTerm.isActive }
  }
  async getPublishedTemplateItems(templateVersionId: string): Promise<EvaluationItemRule[] | null> {
    const version = await this.db.evaluationTemplateVersion.findFirst({ where: { id: templateVersionId, status: 'PUBLISHED' }, include: { items: { orderBy: { sortOrder: 'asc' } } } })
    if (!version) return null
    return version.items.map(item => ({ id: item.id, code: item.code, answerType: item.answerType, required: item.required, maxScore: item.maxScore?.toNumber() ?? null, weight: item.weight?.toNumber() ?? 1 }))
  }
  async submit(input: Parameters<EvaluationRepository['submit']>[0]): Promise<boolean> {
    const changed = await this.db.studentEvaluation.updateMany({ where: { id: input.id, status: 'DRAFT', version: input.expectedVersion }, data: { status: 'SUBMITTED', version: { increment: 1 }, submittedAt: new Date(), submittedById: input.actorId, updatedById: input.actorId } })
    if (changed.count !== 1) return false
    await this.db.studentEvaluationAnswer.deleteMany({ where: { evaluationId: input.id } })
    await this.db.studentEvaluationAnswer.createMany({ data: input.answers.map(answer => ({ evaluationId: input.id, itemId: answer.itemId, itemSnapshot: json({ itemCode: answer.itemCode, answerType: answer.answerType, maxScore: answer.maxScore, weight: answer.weight }), scoreValue: answer.score, textValue: answer.text, booleanValue: answer.booleanValue })) })
    return true
  }
  async appendVersion(input: Parameters<EvaluationRepository['appendVersion']>[0]): Promise<void> {
    await this.db.studentEvaluationVersion.create({ data: { evaluationId: input.evaluationId, version: input.version, actorId: input.actorId, reason: input.reason ?? 'Initial submission', snapshot: json(input.snapshot) } })
  }
  appendAudit(input: Parameters<EvaluationRepository['appendAudit']>[0]): Promise<void> { return audit(this.db, { ...input, entityType: 'StudentEvaluation' }) }
}
