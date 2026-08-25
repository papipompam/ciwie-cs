import { describe, expect, it } from 'vitest'
import { organizationEvaluationDraftSchema } from '../../shared/schemas/evaluation'
import { validateAndSnapshotAnswers } from '../../server/domain/evaluation'

const rules = [{ id: 'i1', code: 'TEAMWORK', answerType: 'SCORE' as const, required: true, maxScore: 5, weight: 2 }]

describe('evaluation snapshots', () => {
  it('stores immutable item meaning with each answer', () => {
    expect(validateAndSnapshotAnswers(rules, [{ itemId: 'i1', score: 4 }])).toEqual([{
      itemId: 'i1', score: 4, itemCode: 'TEAMWORK', answerType: 'SCORE', maxScore: 5, weight: 2, text: undefined,
    }])
  })

  it('rejects missing and out-of-range answers', () => {
    expect(() => validateAndSnapshotAnswers(rules, [])).toThrow('Required')
    expect(() => validateAndSnapshotAnswers(rules, [{ itemId: 'i1', score: 6 }])).toThrow('outside')
  })

  it('allows sparse drafts while retaining per-answer type and range validation', () => {
    expect(validateAndSnapshotAnswers(rules, [], { requireComplete: false })).toEqual([])
    expect(() => validateAndSnapshotAnswers(rules, [{ itemId: 'i1' }], { requireComplete: false })).toThrow('required')
    expect(() => validateAndSnapshotAnswers(rules, [{ itemId: 'i1', score: 6 }], { requireComplete: false })).toThrow('outside')
  })
})

describe('organization evaluation draft concurrency schema', () => {
  const draft = { visitId: 'visit-1', templateVersionId: 'template-version-1', answers: [] }

  it('allows a create without a version and an update with a positive version', () => {
    expect(organizationEvaluationDraftSchema.safeParse(draft).success).toBe(true)
    expect(organizationEvaluationDraftSchema.safeParse({ ...draft, expectedVersion: 3 }).success).toBe(true)
  })

  it('rejects zero and negative update versions', () => {
    expect(organizationEvaluationDraftSchema.safeParse({ ...draft, expectedVersion: 0 }).success).toBe(false)
    expect(organizationEvaluationDraftSchema.safeParse({ ...draft, expectedVersion: -1 }).success).toBe(false)
  })
})
