import type { PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { enqueueDueNotifications } from '../../server/services/notification-scheduler'

describe('notification scheduler', () => {
  it('enqueues a stable due-soon event and its in-app notifications atomically', async () => {
    const visitDate = new Date('2026-08-25T00:00:00.000Z')
    const tx = {
      outboxMessage: { create: vi.fn() },
      supervisionVisit: { findUnique: vi.fn().mockResolvedValue({ students: [{ studentTerm: { student: { user: { id: 'student-1', email: null } } } }], lecturers: [{ lecturer: { user: { id: 'lecturer-1', email: null } } }] }) },
      notification: { createMany: vi.fn() },
    }
    const db = {
      supervisionVisit: { findMany: vi.fn().mockResolvedValueOnce([{ id: 'visit-1', visitDate }]).mockResolvedValueOnce([]).mockResolvedValueOnce([]) },
      delivery: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => await work(tx)),
    } as unknown as PrismaClient
    await expect(enqueueDueNotifications(db, new Date('2026-08-24T02:00:00.000Z'))).resolves.toBe(1)
    expect(tx.outboxMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: 'VISIT_DUE_SOON', dedupeKey: 'SupervisionVisit:visit-1:due:2026-08-25' }) })
    expect(tx.notification.createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([expect.objectContaining({ recipientId: 'student-1' }), expect.objectContaining({ recipientId: 'lecturer-1' })]) })
  })
})
