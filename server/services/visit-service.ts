import type { SessionActor } from '../../shared/types/api'
import { DomainError, isUniqueConstraintError } from '../domain/errors'
import { requireRole } from '../policies/authorization'
import type { IdempotencyIdentity } from './idempotency-completion'

export interface ScheduleVisitInput {
  coopTermId: string
  workSiteId: string
  round: number
  date: string
  period: 'MORNING' | 'AFTERNOON'
  studentTermIds: string[]
  lecturerIds: string[]
}

export interface VisitRepository {
  transaction<T>(work: (repository: VisitRepository) => Promise<T>): Promise<T>
  assertEligibleStudents(input: { coopTermId: string, workSiteId: string, round: number, studentTermIds: string[] }): Promise<void>
  createVisit(input: ScheduleVisitInput & { actorId: string }): Promise<{ id: string }>
  reserveStudentSlots(input: { visitId: string, round: number, date: string, period: string, studentTermIds: string[] }): Promise<void>
  reserveLecturerSlots(input: { visitId: string, date: string, period: string, lecturerIds: string[] }): Promise<void>
  reserveWorkSiteSlot(input: { visitId: string, workSiteId: string, date: string, period: string }): Promise<void>
  appendVisitHistory(input: { visitId: string, actorId: string, action: string, reason?: string, snapshot: unknown }): Promise<void>
  enqueueOutbox(input: { dedupeKey: string, type: string, payload: unknown }): Promise<void>
  completeIdempotency?(identity: IdempotencyIdentity, response: unknown): Promise<void>
}

export async function scheduleVisit(repository: VisitRepository, actor: SessionActor, input: ScheduleVisitInput & { idempotency?: IdempotencyIdentity }): Promise<{ id: string }> {
  requireRole(actor, 'LECTURER', 'ADMIN')
  const { idempotency, ...scheduleInput } = input
  if (actor.role === 'LECTURER' && (!actor.lecturerId || !input.lecturerIds.includes(actor.lecturerId))) {
    throw new DomainError('FORBIDDEN', 'A lecturer must assign themselves to a visit they create')
  }
  try {
    return await repository.transaction(async (tx) => {
      await tx.assertEligibleStudents(scheduleInput)
      const visit = await tx.createVisit({ ...scheduleInput, actorId: actor.userId })
      await tx.reserveStudentSlots({ visitId: visit.id, round: input.round, date: input.date, period: input.period, studentTermIds: input.studentTermIds })
      await tx.reserveLecturerSlots({ visitId: visit.id, date: input.date, period: input.period, lecturerIds: input.lecturerIds })
      await tx.reserveWorkSiteSlot({ visitId: visit.id, workSiteId: input.workSiteId, date: input.date, period: input.period })
      await tx.appendVisitHistory({ visitId: visit.id, actorId: actor.userId, action: 'SCHEDULED', snapshot: scheduleInput })
      await tx.enqueueOutbox({ dedupeKey: `visit:${visit.id}:scheduled`, type: 'VISIT_SCHEDULED', payload: { visitId: visit.id } })
      if (idempotency) {
        if (!tx.completeIdempotency) throw new Error('Repository does not support atomic idempotency completion')
        await tx.completeIdempotency(idempotency, visit)
      }
      return visit
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new DomainError('CONFLICT', 'The student, lecturer, or work site already has a conflicting active visit')
    throw error
  }
}

export interface CoveragePlacement {
  studentTermId: string
  round: number
  visitStatus?: 'SCHEDULED' | 'POSTPONED' | 'COMPLETED' | 'CANCELLED'
  visitDate?: string
  hasResult?: boolean
}

export function calculateCoverage(row: CoveragePlacement, today: string): 'UNSCHEDULED' | 'SCHEDULED' | 'OVERDUE' | 'MISSING_RESULT' | 'COMPLETED' {
  if (!row.visitStatus || row.visitStatus === 'CANCELLED' || row.visitStatus === 'POSTPONED') return 'UNSCHEDULED'
  if (row.visitStatus === 'COMPLETED') return row.hasResult ? 'COMPLETED' : 'MISSING_RESULT'
  if (row.visitDate && row.visitDate < today) return row.hasResult ? 'COMPLETED' : 'OVERDUE'
  return 'SCHEDULED'
}

export function countUnscheduledRounds(placement: { currentWorkSiteId: string, visits: Array<{ round: string | number, workSiteId: string }> }, totalRounds = 2): number {
  const coveredRounds = new Set(placement.visits.filter(visit => visit.workSiteId === placement.currentWorkSiteId).map(visit => visit.round))
  return Math.max(0, totalRounds - coveredRounds.size)
}
