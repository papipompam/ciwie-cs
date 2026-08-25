import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import { enqueueNotificationEvent, eventPresentation } from '../../server/services/notification-dispatcher'

describe('outbox event presentation', () => {
  it('maps supported business events and rejects unknown events', () => {
    expect(eventPresentation('RESPONSE_CONFIRMED').title).toContain('แบบตอบรับ')
    expect(eventPresentation('VISIT_RESCHEDULE').title).toContain('นิเทศ')
    expect(() => eventPresentation('UNKNOWN')).toThrow('Unsupported')
  })

  it('creates the in-app record in the same database unit as the outbox event', async () => {
    const db = {
      outboxMessage: { create: vi.fn() },
      documentRequest: { findUnique: vi.fn().mockResolvedValue({ studentTerm: { student: { user: { id: 'student-1', email: 'student@example.test' } } } }) },
      notification: { createMany: vi.fn() },
    } as unknown as Prisma.TransactionClient
    await enqueueNotificationEvent(db, { eventType: 'DOCUMENT_REQUESTED', aggregateType: 'DocumentRequest', aggregateId: 'request-1', dedupeKey: 'request-1', payload: { id: 'request-1' } })
    expect(db.outboxMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ dedupeKey: 'request-1' }) })
    expect(db.notification.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ recipientId: 'student-1', eventType: 'DOCUMENT_REQUESTED', entityId: 'request-1' })] })
  })
})
