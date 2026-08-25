import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../../server/domain/errors'
import { addDocumentRevision } from '../../server/services/document-command-service'
import { changeVisitSchedule, correctExpense, createExpense } from '../../server/services/operation-command-service'

const admin: SessionActor = { userId: 'admin-user', role: 'ADMIN', active: true, sessionVersion: 1 }
const lecturer: SessionActor = { userId: 'lecturer-user', role: 'LECTURER', active: true, sessionVersion: 1, lecturerId: 'lecturer-1' }

function databaseWithTransaction(tx: Record<string, unknown>): PrismaClient {
  return { $transaction: vi.fn(async (work: (client: unknown) => unknown) => await work(tx)) } as unknown as PrismaClient
}

function expectDomainCode(error: unknown, code: string): void {
  expect(error).toBeInstanceOf(DomainError)
  expect((error as DomainError).code).toBe(code)
}

describe('AC-004 document revision transaction', () => {
  function transaction(status: 'SENT' | 'CLOSED' = 'SENT') {
    return {
      $queryRaw: vi.fn(),
      documentBatch: { findUnique: vi.fn().mockResolvedValue({ id: 'batch-1', status }) },
      fileVersion: { findUnique: vi.fn().mockResolvedValue({ id: 'file-version-2', scanStatus: 'CLEAN', objectKey: 'documents/random-key.pdf' }) },
      documentVersion: {
        findFirst: vi.fn().mockResolvedValue({ id: 'old-version', revision: 1 }),
        create: vi.fn().mockResolvedValue({ id: 'document-version-2', revision: 2 }),
      },
      auditLog: { create: vi.fn() },
    }
  }

  it('adds a new revision and audit without overwriting the previous version', async () => {
    const tx = transaction()
    await expect(addDocumentRevision(databaseWithTransaction(tx), lecturer, { batchId: 'batch-1', fileVersionId: 'file-version-2', kind: 'LETTER', reason: 'Correct recipient title' }))
      .resolves.toEqual({ id: 'document-version-2', revision: 2 })
    expect(tx.documentVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({ revision: 2, fileVersionId: 'file-version-2' }) })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'DOCUMENT_REVISION_ADDED', reason: 'Correct recipient title' }) })
  })

  it('requires a reason before revising a sent document', async () => {
    const tx = transaction()
    await addDocumentRevision(databaseWithTransaction(tx), lecturer, { batchId: 'batch-1', fileVersionId: 'file-version-2', kind: 'LETTER' })
      .then(() => expect.fail('expected validation failure'), error => expectDomainCode(error, 'VALIDATION_FAILED'))
    expect(tx.documentVersion.create).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })
})

describe('AC-008 visit cancellation releases reservations', () => {
  function visitTransaction() {
    return {
      $queryRaw: vi.fn(),
      supervisionVisit: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'visit-1', status: 'SCHEDULED', lockVersion: 4, visitDate: new Date('2026-08-20T00:00:00.000Z'), period: 'MORNING',
          round: 'ROUND_1', workSiteId: 'site-1', students: [{ studentTermId: 'student-term-1', studentTerm: { student: { user: { id: 'student-user', email: null } } } }], lecturers: [{ lecturerId: 'lecturer-1', lecturer: { user: { id: 'lecturer-user', email: null } } }], _count: { students: 1 },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      supervisionResult: { count: vi.fn() },
      visitStudentSlot: { deleteMany: vi.fn(), createMany: vi.fn() },
      visitLecturerSlot: { deleteMany: vi.fn(), createMany: vi.fn() },
      visitWorkSiteSlot: { deleteMany: vi.fn(), create: vi.fn() },
      supervisionVisitHistory: { create: vi.fn() },
      auditLog: { create: vi.fn() },
      outboxMessage: { create: vi.fn() },
      notification: { createMany: vi.fn() },
    }
  }

  it('deletes all active slots and appends history/audit/outbox in the cancel transaction', async () => {
    const tx = visitTransaction()
    await expect(changeVisitSchedule(databaseWithTransaction(tx), lecturer, { visitId: 'visit-1', expectedVersion: 4, action: 'CANCEL', reason: 'Company unavailable' }))
      .resolves.toEqual({ id: 'visit-1', status: 'CANCELLED', version: 5 })
    expect(tx.visitStudentSlot.deleteMany).toHaveBeenCalledWith({ where: { visitId: 'visit-1' } })
    expect(tx.visitLecturerSlot.deleteMany).toHaveBeenCalledWith({ where: { visitId: 'visit-1' } })
    expect(tx.visitWorkSiteSlot.deleteMany).toHaveBeenCalledWith({ where: { visitId: 'visit-1' } })
    expect(tx.supervisionVisitHistory.create).toHaveBeenCalled()
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'VISIT_CANCEL', reason: 'Company unavailable' }) })
    expect(tx.outboxMessage.create).toHaveBeenCalled()
    expect(tx.notification.createMany).toHaveBeenCalled()
  })

  it('does not allow an unassigned lecturer to cancel the visit', async () => {
    const tx = visitTransaction()
    const otherLecturer = { ...lecturer, lecturerId: 'lecturer-other' }
    await changeVisitSchedule(databaseWithTransaction(tx), otherLecturer, { visitId: 'visit-1', expectedVersion: 4, action: 'CANCEL', reason: 'No access' })
      .then(() => expect.fail('expected forbidden'), error => expectDomainCode(error, 'FORBIDDEN'))
    expect(tx.visitStudentSlot.deleteMany).not.toHaveBeenCalled()
  })
})

describe('AC-010 expense authorization, precision and correction history', () => {
  it('rejects lecturer access before opening a transaction', async () => {
    const transaction = vi.fn()
    const db = { $transaction: transaction } as unknown as PrismaClient
    await createExpense(db, lecturer, { visitId: 'visit-1', round: 1, travelDays: 1, travelAmount: 100, lodgingAmount: 200, mealAmount: 30 })
      .then(() => expect.fail('expected forbidden'), error => expectDomainCode(error, 'FORBIDDEN'))
    expect(transaction).not.toHaveBeenCalled()
  })

  it('calculates Decimal total and audits a new expense', async () => {
    const tx = {
      supervisionVisit: { findUnique: vi.fn().mockResolvedValue({ id: 'visit-1', round: 'ROUND_1' }) },
      expense: {
        create: vi.fn().mockResolvedValue({ id: 'expense-1', version: 1, totalAmount: new Prisma.Decimal('330.55') }),
      },
      auditLog: { create: vi.fn() },
    }
    await expect(createExpense(databaseWithTransaction(tx), admin, { visitId: 'visit-1', round: 1, travelDays: 2, travelAmount: 100.10, lodgingAmount: 200.20, mealAmount: 30.25 }))
      .resolves.toEqual({ id: 'expense-1', totalAmount: '330.55', version: 1 })
    expect(tx.expense.create).toHaveBeenCalledWith({ data: expect.objectContaining({ travelDays: 2, totalAmount: new Prisma.Decimal('330.55') }) })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'EXPENSE_CREATED', actorId: 'admin-user' }) })
  })

  it('creates separate expense items for the same visit and round', async () => {
    const tx = {
      supervisionVisit: { findUnique: vi.fn().mockResolvedValue({ id: 'visit-1', round: 'ROUND_1' }) },
      expense: { create: vi.fn()
        .mockResolvedValueOnce({ id: 'expense-1', version: 1, totalAmount: new Prisma.Decimal(100) })
        .mockResolvedValueOnce({ id: 'expense-2', version: 1, totalAmount: new Prisma.Decimal(200) }) },
      auditLog: { create: vi.fn() },
    }
    const db = databaseWithTransaction(tx)
    await createExpense(db, admin, { visitId: 'visit-1', round: 1, travelDays: 1, travelAmount: 100, lodgingAmount: 0, mealAmount: 0 })
    await createExpense(db, admin, { visitId: 'visit-1', round: 1, travelDays: 2, travelAmount: 200, lodgingAmount: 0, mealAmount: 0 })
    expect(tx.expense.create).toHaveBeenCalledTimes(2)
    expect(tx.expense.create.mock.calls[0]?.[0].data).toMatchObject({ visitId: 'visit-1', round: 'ROUND_1' })
    expect(tx.expense.create.mock.calls[1]?.[0].data).toMatchObject({ visitId: 'visit-1', round: 'ROUND_1' })
  })

  it('requires a reason and appends a correction version', async () => {
    const existing = { id: 'expense-1', version: 2, travelAmount: new Prisma.Decimal(100), lodgingAmount: new Prisma.Decimal(200), mealAmount: new Prisma.Decimal(30), totalAmount: new Prisma.Decimal(330) }
    const tx = {
      $queryRaw: vi.fn(),
      expense: {
        findUnique: vi.fn().mockResolvedValue(existing),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ ...existing, travelDays: 2, version: 3, totalAmount: new Prisma.Decimal(350) }),
      },
      expenseVersion: { create: vi.fn() },
      auditLog: { create: vi.fn() },
    }
    await expect(correctExpense(databaseWithTransaction(tx), admin, { expenseId: 'expense-1', travelDays: 2, travelAmount: 120, lodgingAmount: 200, mealAmount: 30, expectedVersion: 2, reason: 'Correct receipt' }))
      .resolves.toEqual({ id: 'expense-1', totalAmount: '350.00', version: 3 })
    expect(tx.expenseVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({ expenseId: 'expense-1', version: 3, reason: 'Correct receipt', actorId: 'admin-user' }) })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'EXPENSE_CORRECTED', reason: 'Correct receipt' }) })
  })
})
