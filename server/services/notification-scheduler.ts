import type { PrismaClient } from '@prisma/client'
import { isUniqueConstraintError } from '../domain/errors'
import { enqueueNotificationEvent } from './notification-dispatcher'

const DELIVERY_OVERDUE_DAYS = 7

function bangkokDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

function addUtcDays(date: string, days: number): Date {
  const result = new Date(`${date}T00:00:00.000Z`)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

async function enqueueIgnoringDuplicate(db: PrismaClient, input: Parameters<typeof enqueueNotificationEvent>[1]): Promise<boolean> {
  try {
    await db.$transaction(tx => enqueueNotificationEvent(tx, input))
    return true
  } catch (error) {
    if (isUniqueConstraintError(error)) return false
    throw error
  }
}

/** Produces stable, deduplicated reminder events; safe to run repeatedly. */
export async function enqueueDueNotifications(db: PrismaClient, now = new Date()): Promise<number> {
  const today = bangkokDate(now)
  const todayDate = addUtcDays(today, 0)
  const tomorrowDate = addUtcDays(today, 1)
  const deliveryCutoff = new Date(now.getTime() - DELIVERY_OVERDUE_DAYS * 24 * 60 * 60_000)
  const [dueVisits, missingResults, missingEvaluations, overdueDeliveries] = await Promise.all([
    db.supervisionVisit.findMany({ where: { status: 'SCHEDULED', visitDate: { gte: todayDate, lte: tomorrowDate } }, select: { id: true, visitDate: true }, take: 5_000 }),
    db.supervisionVisit.findMany({ where: { status: { in: ['SCHEDULED', 'COMPLETED'] }, visitDate: { lt: todayDate }, students: { some: { result: null } } }, select: { id: true, visitDate: true }, take: 5_000 }),
    db.supervisionVisit.findMany({ where: { status: 'COMPLETED', OR: [{ students: { some: { evaluations: { none: { status: 'SUBMITTED' } } } } }, { organizationEvaluations: { none: { status: 'SUBMITTED' } } }] }, select: { id: true }, take: 5_000 }),
    db.delivery.findMany({ where: { status: { in: ['SENT', 'WAITING_RESPONSE'] }, sentAt: { lt: deliveryCutoff } }, select: { id: true, sentAt: true }, take: 5_000 }),
  ])
  const events = [
    ...dueVisits.map(visit => ({ eventType: 'VISIT_DUE_SOON', aggregateType: 'SupervisionVisit', aggregateId: visit.id, dedupeKey: `SupervisionVisit:${visit.id}:due:${visit.visitDate.toISOString().slice(0, 10)}`, payload: { visitId: visit.id } })),
    ...missingResults.map(visit => ({ eventType: 'VISIT_RESULT_MISSING', aggregateType: 'SupervisionVisit', aggregateId: visit.id, dedupeKey: `SupervisionVisit:${visit.id}:result-missing:${visit.visitDate.toISOString().slice(0, 10)}`, payload: { visitId: visit.id } })),
    ...missingEvaluations.map(visit => ({ eventType: 'EVALUATION_MISSING', aggregateType: 'SupervisionVisit', aggregateId: visit.id, dedupeKey: `SupervisionVisit:${visit.id}:evaluation-missing`, payload: { visitId: visit.id } })),
    ...overdueDeliveries.map(delivery => ({ eventType: 'DELIVERY_OVERDUE', aggregateType: 'Delivery', aggregateId: delivery.id, dedupeKey: `Delivery:${delivery.id}:overdue:${delivery.sentAt.toISOString().slice(0, 10)}`, payload: { deliveryId: delivery.id } })),
  ]
  let created = 0
  for (const event of events) if (await enqueueIgnoringDuplicate(db, event)) created += 1
  return created
}
