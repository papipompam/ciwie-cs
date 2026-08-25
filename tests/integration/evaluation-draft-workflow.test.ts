import type { PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { studentEvaluationDraftSchema } from '../../shared/schemas/evaluation'
import type { SessionActor } from '../../shared/types/api'
import type { EvaluationRepository } from '../../server/services/evaluation-service'
import { submitEvaluation } from '../../server/services/evaluation-service'
import { saveStudentEvaluationDraft } from '../../server/services/student-evaluation-draft-service'

const lecturer: SessionActor = { userId: 'lecturer-user', role: 'LECTURER', active: true, sessionVersion: 1, lecturerId: 'lecturer-profile' }
const rules = [
  { id: 'item-1', code: 'TEAMWORK', answerType: 'SCORE' as const, required: true, maxScore: 5, weight: 1 },
  { id: 'item-2', code: 'COMMUNICATION', answerType: 'SCORE' as const, required: true, maxScore: 5, weight: 1 },
]

describe('evaluation draft-to-submit boundary', () => {
  it('creates an empty draft, saves a sparse answer, then rejects incomplete submission', async () => {
    let stored: { id: string, status: 'DRAFT', version: number, templateVersionId: string } | null = null
    const tx = {
      visitStudent: { findUnique: vi.fn().mockResolvedValue({ visit: { coopTerm: { isActive: true }, lecturers: [{ lecturerId: 'lecturer-profile' }] } }) },
      evaluationTemplateVersion: { findFirst: vi.fn().mockResolvedValue({ id: 'template-version', templateId: 'template', items: rules.map(rule => ({ ...rule, maxScore: { toNumber: () => rule.maxScore }, weight: { toNumber: () => rule.weight } })) }) },
      studentEvaluation: {
        findUnique: vi.fn(async () => stored),
        create: vi.fn(async () => (stored = { id: 'evaluation-1', status: 'DRAFT', version: 1, templateVersionId: 'template-version' })),
        update: vi.fn(async () => (stored = { ...stored!, version: stored!.version + 1 })),
      },
      studentEvaluationAnswer: { deleteMany: vi.fn(), createMany: vi.fn() },
    }
    const db = { $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => await work(tx)) } as unknown as PrismaClient

    const emptyDraft = studentEvaluationDraftSchema.parse({ visitStudentId: 'visit-student-1', templateVersionId: 'template-version', answers: [] })
    await expect(saveStudentEvaluationDraft(db, lecturer, emptyDraft)).resolves.toEqual({ id: 'evaluation-1', version: 1 })
    await expect(saveStudentEvaluationDraft(db, lecturer, { ...emptyDraft, expectedVersion: 1, answers: [{ itemId: 'item-1', score: 4 }] })).resolves.toEqual({ id: 'evaluation-1', version: 2 })
    expect(tx.studentEvaluationAnswer.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ itemId: 'item-1', scoreValue: 4 })] })

    const repository: EvaluationRepository = {
      transaction: async work => await work(repository),
      findForUpdate: vi.fn().mockResolvedValue({ id: 'evaluation-1', status: 'DRAFT', version: 2, templateVersionId: 'template-version', assignedLecturerIds: ['lecturer-profile'], activeTerm: true }),
      getPublishedTemplateItems: vi.fn().mockResolvedValue(rules), submit: vi.fn(), appendVersion: vi.fn(), appendAudit: vi.fn(),
    }
    await expect(submitEvaluation(repository, lecturer, { evaluationId: 'evaluation-1', expectedVersion: 2, answers: [{ itemId: 'item-1', score: 4 }] }))
      .rejects.toThrow('Required evaluation item COMMUNICATION is missing')
    expect(repository.submit).not.toHaveBeenCalled()
  })
})
