import type { PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../../server/domain/errors'
import { acknowledgeDelivery, createDelivery, sendDelivery } from '../../server/services/document-command-service'
import { assignDeliveryOwner } from '../../server/services/document-resource-service'

const admin: SessionActor = { userId: 'admin-user', role: 'ADMIN', active: true, sessionVersion: 1 }
const lecturer: SessionActor = { userId: 'lecturer-user', role: 'LECTURER', active: true, sessionVersion: 1, lecturerId: 'lecturer-1' }
const student: SessionActor = { userId: 'student-user', role: 'STUDENT', active: true, sessionVersion: 1, studentTermId: 'student-term-1' }

function databaseWithTransaction(tx: Record<string, unknown>): PrismaClient {
  return { $transaction: vi.fn(async (work: (client: unknown) => unknown) => await work(tx)) } as unknown as PrismaClient
}

function deliveryRecord(status: 'ASSIGNED' | 'SENT' = 'ASSIGNED') {
  return {
    id: 'delivery-1', batchId: 'batch-1', status, ownerType: 'STUDENT', ownerUserId: 'student-user', channel: null, recipient: null, sentAt: null,
    note: null, updatedAt: new Date('2026-08-24T00:00:00.000Z'),
    batch: { coopTerm: { isActive: true }, members: [{ studentTerm: { student: { user: { id: 'student-user', email: null } } } }] },
  }
}

function expectDomainCode(error: unknown, code: string): void {
  expect(error).toBeInstanceOf(DomainError)
  expect((error as DomainError).code).toBe(code)
}

describe('delivery assignment and send workflow', () => {
  it('creates an assignment without pretending the document has already been sent', async () => {
    const tx = {
      documentBatch: { findUnique: vi.fn().mockResolvedValue({ id: 'batch-1', status: 'SENT', coopTerm: { isActive: true } }) },
      user: { findFirst: vi.fn().mockResolvedValue({ id: 'student-user' }), findUnique: vi.fn().mockResolvedValue({ id: 'student-user', email: null }) },
      documentBatchMember: { count: vi.fn().mockResolvedValue(1) },
      delivery: { create: vi.fn().mockResolvedValue(deliveryRecord()), findUnique: vi.fn().mockResolvedValue(deliveryRecord()) },
      auditLog: { create: vi.fn() }, outboxMessage: { create: vi.fn() }, notification: { createMany: vi.fn() },
    }
    await expect(createDelivery(databaseWithTransaction(tx), lecturer, { batchId: 'batch-1', ownerType: 'STUDENT', ownerUserId: 'student-user', reason: 'Default student delivery owner' }))
      .resolves.toEqual({ id: 'delivery-1', status: 'ASSIGNED' })
    expect(tx.delivery.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'ASSIGNED', channel: null, recipient: null, sentAt: null }) })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'DELIVERY_ASSIGNED' }) })
    expect(tx.outboxMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: 'DELIVERY_ASSIGNED' }) })
  })

  it('rejects assigning a student who is not a member of the document batch', async () => {
    const tx = {
      documentBatch: { findUnique: vi.fn().mockResolvedValue({ id: 'batch-1', status: 'SENT', coopTerm: { isActive: true } }) },
      user: { findFirst: vi.fn().mockResolvedValue({ id: 'outsider' }) }, documentBatchMember: { count: vi.fn().mockResolvedValue(0) },
      delivery: { create: vi.fn() },
    }
    await createDelivery(databaseWithTransaction(tx), admin, { batchId: 'batch-1', ownerType: 'STUDENT', ownerUserId: 'outsider', reason: 'Assign delivery' })
      .then(() => expect.fail('expected validation failure'), error => expectDomainCode(error, 'VALIDATION_FAILED'))
    expect(tx.delivery.create).not.toHaveBeenCalled()
  })

  it('lets only the assigned owner record send details and attach their own clean evidence', async () => {
    const delivery = deliveryRecord()
    const tx = {
      $queryRaw: vi.fn(), delivery: { findUnique: vi.fn().mockResolvedValue(delivery), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      fileVersion: { findUnique: vi.fn().mockResolvedValue({ id: 'evidence-1', createdById: 'student-user', scanStatus: 'CLEAN', objectKey: 'delivery/evidence.pdf' }) },
      deliveryEvidenceFile: { create: vi.fn() }, deliveryHistory: { create: vi.fn() }, auditLog: { create: vi.fn() },
      outboxMessage: { create: vi.fn() }, notification: { createMany: vi.fn() }, user: { findUnique: vi.fn().mockResolvedValue({ id: 'student-user', email: null }) },
    }
    await expect(sendDelivery(databaseWithTransaction(tx), student, { deliveryId: 'delivery-1', channel: 'EMAIL', recipient: 'hr@example.com', sentAt: '2026-08-24T02:00:00.000Z', evidenceFileVersionId: 'evidence-1' }))
      .resolves.toEqual({ id: 'delivery-1', status: 'SENT' })
    expect(tx.delivery.updateMany).toHaveBeenCalledWith({ where: { id: 'delivery-1', status: 'ASSIGNED' }, data: expect.objectContaining({ status: 'SENT', channel: 'EMAIL' }) })
    expect(tx.deliveryHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ fromStatus: 'ASSIGNED', toStatus: 'SENT' }) })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'DELIVERY_SENT' }) })
  })

  it('rejects evidence uploaded by another user before changing delivery state', async () => {
    const delivery = deliveryRecord()
    const tx = {
      $queryRaw: vi.fn(), delivery: { findUnique: vi.fn().mockResolvedValue(delivery), updateMany: vi.fn() },
      fileVersion: { findUnique: vi.fn().mockResolvedValue({ id: 'evidence-1', createdById: 'other-user', scanStatus: 'CLEAN', objectKey: 'delivery/evidence.pdf' }) },
    }
    await sendDelivery(databaseWithTransaction(tx), student, { deliveryId: 'delivery-1', channel: 'EMAIL', recipient: 'hr@example.com', sentAt: '2026-08-24T02:00:00.000Z', evidenceFileVersionId: 'evidence-1' })
      .then(() => expect.fail('expected forbidden'), error => expectDomainCode(error, 'FORBIDDEN'))
    expect(tx.delivery.updateMany).not.toHaveBeenCalled()
  })

  it('allows a lecturer to take ownership only for themselves in the active term', async () => {
    const delivery = deliveryRecord()
    const tx = { $queryRaw: vi.fn(), delivery: { findUnique: vi.fn().mockResolvedValue(delivery), update: vi.fn() }, user: { findFirst: vi.fn() } }
    await assignDeliveryOwner(databaseWithTransaction(tx), lecturer, { deliveryId: 'delivery-1', ownerType: 'LECTURER', ownerUserId: 'another-lecturer', reason: 'Hand over' })
      .then(() => expect.fail('expected forbidden'), error => expectDomainCode(error, 'FORBIDDEN'))
    expect(tx.delivery.update).not.toHaveBeenCalled()
  })

  it('acknowledges exactly once with audit, notification, and idempotency completion in the same transaction', async () => {
    const delivery = deliveryRecord('SENT')
    const tx = {
      $queryRaw: vi.fn(),
      delivery: { findUnique: vi.fn().mockResolvedValue(delivery), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      deliveryHistory: { create: vi.fn() }, auditLog: { create: vi.fn() },
      outboxMessage: { create: vi.fn() }, notification: { createMany: vi.fn() }, user: { findUnique: vi.fn().mockResolvedValue({ id: 'student-user', email: null }) },
      idempotencyRecord: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    }
    await expect(acknowledgeDelivery(databaseWithTransaction(tx), student, {
      deliveryId: 'delivery-1', acknowledgedAt: '2026-08-24T03:00:00.000Z',
      idempotency: { actorId: 'student-user', operation: 'DELIVERY_ACKNOWLEDGE', key: 'key-1' },
    })).resolves.toEqual({ id: 'delivery-1', status: 'WAITING_RESPONSE' })
    expect(tx.$queryRaw).toHaveBeenCalledOnce()
    expect(tx.delivery.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'delivery-1', status: 'SENT' } }))
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'DELIVERY_WAITING_RESPONSE' }) })
    expect(tx.outboxMessage.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: 'DELIVERY_WAITING_RESPONSE' }) })
    expect(tx.idempotencyRecord.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCEEDED' }) }))
  })

  it('rolls back acknowledgement orchestration when the state CAS loses the race', async () => {
    const tx = {
      $queryRaw: vi.fn(), delivery: { findUnique: vi.fn().mockResolvedValue(deliveryRecord('SENT')), updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      deliveryHistory: { create: vi.fn() }, auditLog: { create: vi.fn() }, outboxMessage: { create: vi.fn() },
    }
    await acknowledgeDelivery(databaseWithTransaction(tx), student, { deliveryId: 'delivery-1', acknowledgedAt: '2026-08-24T03:00:00.000Z' })
      .then(() => expect.fail('expected conflict'), error => expectDomainCode(error, 'CONFLICT'))
    expect(tx.deliveryHistory.create).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
    expect(tx.outboxMessage.create).not.toHaveBeenCalled()
  })
})
