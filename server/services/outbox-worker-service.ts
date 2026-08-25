import type { PrismaClient } from '@prisma/client'
import { eventPresentation, resolveEventRecipients } from './notification-dispatcher'

export interface MailTransport {
  sendMail(input: { from: string | undefined, to: string, subject: string, text: string, headers: Record<string, string> }): Promise<unknown>
}

export async function processNextOutbox(db: PrismaClient, transport: MailTransport, from: string | undefined, now = new Date()): Promise<boolean> {
  const message = await db.outboxMessage.findFirst({
    where: { status: { in: ['PENDING', 'FAILED'] }, nextAttemptAt: { lte: now }, attempts: { lt: 10 } },
    orderBy: { createdAt: 'asc' },
  })
  if (!message) return false
  const claimed = await db.outboxMessage.updateMany({
    where: { id: message.id, status: message.status, attempts: message.attempts },
    data: { status: 'PROCESSING', attempts: { increment: 1 } },
  })
  if (claimed.count !== 1) return true
  try {
    const presentation = eventPresentation(message.eventType)
    const recipients = await resolveEventRecipients(db, message.eventType, message.aggregateId)
    if (!recipients.length) throw new Error('Outbox event has no resolvable recipients')
    for (const recipient of recipients) {
      const existing = await db.notification.findFirst({ where: { recipientId: recipient.userId, eventType: message.eventType, entityType: message.aggregateType, entityId: message.aggregateId } })
      if (!existing) await db.notification.create({ data: { recipientId: recipient.userId, eventType: message.eventType, title: presentation.title, body: presentation.body, entityType: message.aggregateType, entityId: message.aggregateId } })
      if (recipient.email) await transport.sendMail({ from, to: recipient.email, subject: presentation.title, text: presentation.body, headers: { 'X-Ciwie-Dedupe-Key': `${message.dedupeKey}:${recipient.userId}` } })
    }
    await db.outboxMessage.update({ where: { id: message.id }, data: { status: 'SENT', processedAt: new Date(), lastError: null } })
  } catch (error) {
    const delayMinutes = Math.min(60, 2 ** Math.min(message.attempts, 6))
    await db.outboxMessage.update({ where: { id: message.id }, data: {
      status: 'FAILED',
      nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
      lastError: error instanceof Error ? error.message.slice(0, 2_000) : 'Unknown delivery error',
    } })
  }
  return true
}
