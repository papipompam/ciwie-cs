import type { PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../../server/domain/errors'
import { correctOrganizationEvaluation, saveOrganizationEvaluationDraft } from '../../server/services/organization-evaluation-service'
import { correctStudentEvaluation } from '../../server/services/student-evaluation-draft-service'

const lecturer: SessionActor = { userId: 'lecturer-user', role: 'LECTURER', active: true, sessionVersion: 1, lecturerId: 'lecturer-1' }
const admin: SessionActor = { userId: 'admin-user', role: 'ADMIN', active: true, sessionVersion: 1 }

function databaseWithTransaction(tx: Record<string, unknown>): PrismaClient {
  return { $transaction: vi.fn(async (work: (client: unknown) => unknown) => await work(tx)) } as unknown as PrismaClient
}

function expectDomainCode(error: unknown, code: string): void {
  expect(error).toBeInstanceOf(DomainError)
  expect((error as DomainError).code).toBe(code)
}

const scoreItem = { id: 'item-1', code: 'QUALITY', answerType: 'SCORE' as const, required: true, maxScore: { toNumber: () => 5 }, weight: { toNumber: () => 1 }, sortOrder: 1 }

describe('student evaluation correction contract', () => {
  function transaction(activeTerm = true) {
    return {
      studentEvaluation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'evaluation-1', status: 'SUBMITTED', version: 2, templateVersionId: 'template-version-1',
          answers: [{ id: 'old-answer', itemId: 'item-1', scoreValue: 3 }],
          visitStudent: { visit: { coopTerm: { isActive: activeTerm } } },
          templateVersion: { status: 'PUBLISHED', template: { subject: 'STUDENT' }, items: [scoreItem] },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      studentEvaluationVersion: { create: vi.fn() },
      studentEvaluationAnswer: { deleteMany: vi.fn(), createMany: vi.fn() },
      auditLog: { create: vi.fn() },
    }
  }

  it('replaces answers and appends version plus reasoned audit in one transaction', async () => {
    const tx = transaction()
    await expect(correctStudentEvaluation(databaseWithTransaction(tx), lecturer, { evaluationId: 'evaluation-1', expectedVersion: 2, reason: 'Correct transcription', answers: [{ itemId: 'item-1', score: 4 }] }))
      .resolves.toEqual({ id: 'evaluation-1', version: 3 })
    expect(tx.studentEvaluationVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({ evaluationId: 'evaluation-1', version: 3, actorId: 'lecturer-user', reason: 'Correct transcription' }) })
    expect(tx.studentEvaluationAnswer.deleteMany).toHaveBeenCalledWith({ where: { evaluationId: 'evaluation-1' } })
    expect(tx.studentEvaluation.updateMany).toHaveBeenCalledWith({ where: { id: 'evaluation-1', version: 2, status: 'SUBMITTED' }, data: { version: { increment: 1 }, updatedById: 'lecturer-user' } })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'STUDENT_EVALUATION_CORRECTED', reason: 'Correct transcription' }) })
  })

  it('lets a lecturer correct another lecturer submitted evaluation in the active term', async () => {
    const tx = transaction()
    await expect(correctStudentEvaluation(databaseWithTransaction(tx), lecturer, { evaluationId: 'evaluation-1', expectedVersion: 2, reason: 'Correct transcription', answers: [{ itemId: 'item-1', score: 4 }] }))
      .resolves.toEqual({ id: 'evaluation-1', version: 3 })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: 'lecturer-user', reason: 'Correct transcription' }) })
  })

  it('rejects correction outside the active term', async () => {
    const tx = transaction(false)
    await correctStudentEvaluation(databaseWithTransaction(tx), lecturer, { evaluationId: 'evaluation-1', expectedVersion: 2, reason: 'Correct transcription', answers: [{ itemId: 'item-1', score: 4 }] })
      .then(() => expect.fail('expected active-term denial'), error => expectDomainCode(error, 'FORBIDDEN'))
    expect(tx.studentEvaluationVersion.create).not.toHaveBeenCalled()
  })

  it('rejects a concurrent correction before answer/history/audit writes', async () => {
    const tx = transaction()
    tx.studentEvaluation.updateMany.mockResolvedValue({ count: 0 })
    await correctStudentEvaluation(databaseWithTransaction(tx), lecturer, { evaluationId: 'evaluation-1', expectedVersion: 2, reason: 'Correct transcription', answers: [{ itemId: 'item-1', score: 4 }] })
      .then(() => expect.fail('expected optimistic conflict'), error => expectDomainCode(error, 'CONFLICT'))
    expect(tx.studentEvaluationVersion.create).not.toHaveBeenCalled()
    expect(tx.studentEvaluationAnswer.deleteMany).not.toHaveBeenCalled()
    expect(tx.auditLog.create).not.toHaveBeenCalled()
  })
})

describe('organization evaluation assignment and audit contract', () => {
  it('audits a submitted organization evaluation correction with its reason', async () => {
    const tx = {
      supervisionVisit: { findUnique: vi.fn().mockResolvedValue({ coopTerm: { isActive: true } }) },
      organizationEvaluation: {
        findUnique: vi.fn().mockResolvedValue({ id: 'organization-evaluation-1', visitId: 'visit-1', status: 'SUBMITTED', version: 4, templateVersionId: 'template-version-1', answers: [{ itemId: 'item-1', scoreValue: 3 }] }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      evaluationTemplateVersion: { findFirst: vi.fn().mockResolvedValue({ templateId: 'template-1', items: [scoreItem] }) },
      organizationEvaluationVersion: { create: vi.fn() },
      organizationEvaluationAnswer: { deleteMany: vi.fn(), createMany: vi.fn() },
      auditLog: { create: vi.fn() },
    }
    await expect(correctOrganizationEvaluation(databaseWithTransaction(tx), lecturer, { evaluationId: 'organization-evaluation-1', expectedVersion: 4, reason: 'Correct score', answers: [{ itemId: 'item-1', score: 5 }] }))
      .resolves.toEqual({ id: 'organization-evaluation-1', version: 5 })
    expect(tx.organizationEvaluationVersion.create).toHaveBeenCalledWith({ data: expect.objectContaining({ version: 5, reason: 'Correct score', actorId: 'lecturer-user' }) })
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'ORGANIZATION_EVALUATION_CORRECTED', entityType: 'OrganizationEvaluation', reason: 'Correct score' }) })
  })

  it('does not grant Admin the lecturer-only evaluation mutation capability', async () => {
    const tx = { supervisionVisit: { findUnique: vi.fn() } }
    await saveOrganizationEvaluationDraft(databaseWithTransaction(tx), admin, { visitId: 'visit-1', templateVersionId: 'template-version-1', answers: [] })
      .then(() => expect.fail('expected role denial'), error => expectDomainCode(error, 'FORBIDDEN'))
    expect(tx.supervisionVisit.findUnique).not.toHaveBeenCalled()
  })

  it('uses optimistic version matching when updating an organization draft', async () => {
    const tx = {
      supervisionVisit: { findUnique: vi.fn().mockResolvedValue({ coopTerm: { isActive: true }, lecturers: [{ lecturerId: 'lecturer-1' }] }) },
      evaluationTemplateVersion: { findFirst: vi.fn().mockResolvedValue({ templateId: 'template-1', items: [] }) },
      organizationEvaluation: {
        findUnique: vi.fn().mockResolvedValue({ id: 'organization-evaluation-1', visitId: 'visit-1', templateId: 'template-1', templateVersionId: 'template-version-1', status: 'DRAFT', version: 3, updatedById: 'old-user' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      organizationEvaluationAnswer: { deleteMany: vi.fn(), createMany: vi.fn() },
      auditLog: { create: vi.fn() },
    }
    await expect(saveOrganizationEvaluationDraft(databaseWithTransaction(tx), lecturer, { visitId: 'visit-1', templateVersionId: 'template-version-1', answers: [], expectedVersion: 3 }))
      .resolves.toEqual({ id: 'organization-evaluation-1', version: 4 })
    expect(tx.organizationEvaluation.updateMany).toHaveBeenCalledWith({ where: { id: 'organization-evaluation-1', version: 3, status: 'DRAFT' }, data: { templateVersionId: 'template-version-1', version: { increment: 1 }, updatedById: 'lecturer-user' } })
  })

  it('rejects a stale organization draft before replacing answers', async () => {
    const tx = {
      supervisionVisit: { findUnique: vi.fn().mockResolvedValue({ coopTerm: { isActive: true }, lecturers: [{ lecturerId: 'lecturer-1' }] }) },
      evaluationTemplateVersion: { findFirst: vi.fn().mockResolvedValue({ templateId: 'template-1', items: [] }) },
      organizationEvaluation: { findUnique: vi.fn().mockResolvedValue({ id: 'organization-evaluation-1', status: 'DRAFT', version: 3 }) },
      organizationEvaluationAnswer: { deleteMany: vi.fn(), createMany: vi.fn() },
      auditLog: { create: vi.fn() },
    }
    await saveOrganizationEvaluationDraft(databaseWithTransaction(tx), lecturer, { visitId: 'visit-1', templateVersionId: 'template-version-1', answers: [], expectedVersion: 2 })
      .then(() => expect.fail('expected optimistic conflict'), error => expectDomainCode(error, 'CONFLICT'))
    expect(tx.organizationEvaluationAnswer.deleteMany).not.toHaveBeenCalled()
  })
})
