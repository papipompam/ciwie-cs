import { Prisma, type PrismaClient } from '@prisma/client'
import type { SessionActor } from '../../shared/types/api'
import { DomainError, isUniqueConstraintError } from '../domain/errors'
import { requireRole } from '../policies/authorization'
import { completeIdempotency, type IdempotencyIdentity } from './idempotency-completion'
import { enqueueNotificationEvent } from './notification-dispatcher'

const json = (value: unknown) => value as Prisma.InputJsonValue
const visitRound = (round: number) => round === 1 ? 'ROUND_1' as const : 'ROUND_2' as const
const visitDate = (date: string) => new Date(`${date}T00:00:00.000Z`)

async function writeAudit(tx: Prisma.TransactionClient, actorId: string, action: string, entityType: string, entityId: string, before: unknown, after: unknown, reason?: string): Promise<void> {
  await tx.auditLog.create({ data: { actorId, action, entityType, entityId, requestId: crypto.randomUUID(), reason, beforeData: json(before), afterData: json(after) } })
}

async function writeOutbox(tx: Prisma.TransactionClient, eventType: string, aggregateType: string, aggregateId: string, payload: unknown, suffix: string): Promise<void> {
  await enqueueNotificationEvent(tx, { eventType, aggregateType, aggregateId, dedupeKey: `${aggregateType}:${aggregateId}:${suffix}`, payload: json(payload) })
}

export async function changeVisitSchedule(db: PrismaClient, actor: SessionActor, input: { visitId: string, expectedVersion: number, action: 'RESCHEDULE' | 'POSTPONE' | 'CANCEL' | 'COMPLETE', reason: string, date?: string, period?: 'MORNING' | 'AFTERNOON', idempotency?: IdempotencyIdentity }): Promise<{ id: string, status: string, version: number }> {
  requireRole(actor, 'LECTURER', 'ADMIN')
  try {
    return await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM supervision_visits WHERE id = ${input.visitId} FOR UPDATE`
      const visit = await tx.supervisionVisit.findUnique({ where: { id: input.visitId }, include: { students: true, lecturers: true, _count: { select: { students: true } } } })
      if (!visit) throw new DomainError('NOT_FOUND', 'Visit was not found')
      if (actor.role === 'LECTURER' && (!actor.lecturerId || !visit.lecturers.some(member => member.lecturerId === actor.lecturerId))) throw new DomainError('FORBIDDEN', 'Only an assigned lecturer can change this visit')
      if (visit.lockVersion !== input.expectedVersion) throw new DomainError('CONFLICT', 'Visit changed; reload and try again')
      if (visit.status === 'CANCELLED' || visit.status === 'COMPLETED') throw new DomainError('INVALID_STATE', 'A terminal visit cannot be changed')
      if (input.action === 'COMPLETE') {
        const resultCount = await tx.supervisionResult.count({ where: { visitStudent: { visitId: visit.id } } })
        if (resultCount !== visit._count.students) throw new DomainError('VALIDATION_FAILED', 'Every visit student needs a supervision result before completion')
      }
      await Promise.all([
        tx.visitStudentSlot.deleteMany({ where: { visitId: visit.id } }),
        tx.visitLecturerSlot.deleteMany({ where: { visitId: visit.id } }),
        tx.visitWorkSiteSlot.deleteMany({ where: { visitId: visit.id } }),
      ])
      const nextStatus = input.action === 'RESCHEDULE' ? 'SCHEDULED' : input.action === 'POSTPONE' ? 'POSTPONED' : input.action === 'CANCEL' ? 'CANCELLED' : 'COMPLETED'
      const nextDate = input.action === 'RESCHEDULE' ? visitDate(input.date!) : visit.visitDate
      const nextPeriod = input.action === 'RESCHEDULE' ? input.period! : visit.period
      const changed = await tx.supervisionVisit.updateMany({ where: { id: visit.id, lockVersion: input.expectedVersion }, data: { status: nextStatus, visitDate: nextDate, period: nextPeriod, lockVersion: { increment: 1 }, updatedById: actor.userId } })
      if (changed.count !== 1) throw new DomainError('CONFLICT', 'Visit changed; reload and try again')
      if (nextStatus === 'SCHEDULED') {
        await tx.visitStudentSlot.createMany({ data: visit.students.map(member => ({ visitId: visit.id, studentTermId: member.studentTermId, round: visit.round, visitDate: nextDate, period: nextPeriod })) })
        await tx.visitLecturerSlot.createMany({ data: visit.lecturers.map(member => ({ visitId: visit.id, lecturerId: member.lecturerId, visitDate: nextDate, period: nextPeriod })) })
        await tx.visitWorkSiteSlot.create({ data: { visitId: visit.id, workSiteId: visit.workSiteId, visitDate: nextDate, period: nextPeriod } })
      }
      await tx.supervisionVisitHistory.create({ data: { visitId: visit.id, action: input.action, snapshot: json({ before: { status: visit.status, date: visit.visitDate, period: visit.period }, after: { status: nextStatus, date: nextDate, period: nextPeriod } }), actorId: actor.userId, reason: input.reason } })
      await writeAudit(tx, actor.userId, `VISIT_${input.action}`, 'SupervisionVisit', visit.id, visit, { status: nextStatus, visitDate: nextDate, period: nextPeriod }, input.reason)
      await writeOutbox(tx, `VISIT_${input.action}`, 'SupervisionVisit', visit.id, { visitId: visit.id }, `${input.action.toLowerCase()}:v${visit.lockVersion + 1}`)
      const result = { id: visit.id, status: nextStatus, version: visit.lockVersion + 1 }
      if (input.idempotency) await completeIdempotency(tx, input.idempotency, result)
      return result
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new DomainError('CONFLICT', 'The new visit schedule conflicts with an active student, lecturer, or work site reservation')
    throw error
  }
}

export async function changePlacement(db: PrismaClient, actor: SessionActor, input: { placementId: string, expectedVersion: number, action: 'CORRECT' | 'REVERSE', reason: string, workSiteId?: string, idempotency?: IdempotencyIdentity }): Promise<{ id: string, status: string, version: number }> {
  requireRole(actor, 'LECTURER', 'ADMIN')
  return await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM placements WHERE id = ${input.placementId} FOR UPDATE`
    const placement = await tx.placement.findUnique({ where: { id: input.placementId }, include: { studentTerm: { include: { coopTerm: { select: { isActive: true } } } } } })
    if (!placement) throw new DomainError('NOT_FOUND', 'Placement was not found')
    if (actor.role === 'LECTURER' && !placement.studentTerm.coopTerm.isActive) throw new DomainError('FORBIDDEN', 'Lecturers can change placements only in the active term')
    if (placement.version !== input.expectedVersion) throw new DomainError('CONFLICT', 'Placement changed; reload and try again')
    if (placement.status === 'REVERSED') throw new DomainError('INVALID_STATE', 'A reversed placement cannot be changed')
    const status = input.action === 'REVERSE' ? 'REVERSED' : 'ACTIVE'
    const currentWorkSiteId = input.action === 'CORRECT' ? input.workSiteId! : placement.currentWorkSiteId
    const changed = await tx.placement.updateMany({ where: { id: placement.id, version: input.expectedVersion }, data: { status, currentWorkSiteId, version: { increment: 1 } } })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'Placement changed; reload and try again')
    await tx.placementVersion.create({ data: { placementId: placement.id, version: placement.version + 1, snapshot: json({ status, currentWorkSiteId }), reason: input.reason, actorId: actor.userId } })
    await writeAudit(tx, actor.userId, `PLACEMENT_${input.action}`, 'Placement', placement.id, placement, { status, currentWorkSiteId }, input.reason)
    const result = { id: placement.id, status, version: placement.version + 1 }
    if (input.idempotency) await completeIdempotency(tx, input.idempotency, result)
    return result
  })
}

type ExpenseAmounts = { travelDays: number, travelAmount: number, lodgingAmount: number, mealAmount: number, note?: string }

export async function createExpense(db: PrismaClient, actor: SessionActor, input: ExpenseAmounts & { visitId: string, round: number, idempotency?: IdempotencyIdentity }): Promise<{ id: string, totalAmount: string, version: number }> {
  requireRole(actor, 'ADMIN')
  return await db.$transaction(async (tx) => {
    const visit = await tx.supervisionVisit.findUnique({ where: { id: input.visitId }, select: { id: true, round: true } })
    if (!visit) throw new DomainError('NOT_FOUND', 'Visit was not found')
    if (visit.round !== visitRound(input.round)) throw new DomainError('VALIDATION_FAILED', 'Expense round must match the supervision visit round')
    const total = new Prisma.Decimal(input.travelAmount).plus(input.lodgingAmount).plus(input.mealAmount)
    const expense = await tx.expense.create({ data: { visitId: input.visitId, round: visitRound(input.round), travelDays: input.travelDays, travelAmount: input.travelAmount, lodgingAmount: input.lodgingAmount, mealAmount: input.mealAmount, totalAmount: total, note: input.note, createdById: actor.userId, updatedById: actor.userId } })
    await writeAudit(tx, actor.userId, 'EXPENSE_CREATED', 'Expense', expense.id, null, expense)
    const result = { id: expense.id, totalAmount: expense.totalAmount.toFixed(2), version: expense.version }
    if (input.idempotency) await completeIdempotency(tx, input.idempotency, result)
    return result
  })
}

export async function correctExpense(db: PrismaClient, actor: SessionActor, input: ExpenseAmounts & { expenseId: string, expectedVersion: number, reason: string, idempotency?: IdempotencyIdentity }): Promise<{ id: string, totalAmount: string, version: number }> {
  requireRole(actor, 'ADMIN')
  return await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM expenses WHERE id = ${input.expenseId} FOR UPDATE`
    const existing = await tx.expense.findUnique({ where: { id: input.expenseId } })
    if (!existing) throw new DomainError('NOT_FOUND', 'Expense was not found')
    if (existing.version !== input.expectedVersion) throw new DomainError('CONFLICT', 'Expense changed; reload and try again')
    const total = new Prisma.Decimal(input.travelAmount).plus(input.lodgingAmount).plus(input.mealAmount)
    const changed = await tx.expense.updateMany({
      where: { id: existing.id, version: input.expectedVersion },
      data: { travelDays: input.travelDays, travelAmount: input.travelAmount, lodgingAmount: input.lodgingAmount, mealAmount: input.mealAmount, totalAmount: total, note: input.note, version: { increment: 1 }, updatedById: actor.userId },
    })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'Expense changed; reload and try again')
    const expense = await tx.expense.findUniqueOrThrow({ where: { id: existing.id } })
    await tx.expenseVersion.create({ data: { expenseId: expense.id, version: expense.version, snapshot: json(expense), reason: input.reason, actorId: actor.userId } })
    await writeAudit(tx, actor.userId, 'EXPENSE_CORRECTED', 'Expense', expense.id, existing, expense, input.reason)
    const result = { id: expense.id, totalAmount: expense.totalAmount.toFixed(2), version: expense.version }
    if (input.idempotency) await completeIdempotency(tx, input.idempotency, result)
    return result
  })
}
