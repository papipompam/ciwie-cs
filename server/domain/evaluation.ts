import { DomainError } from './errors'

export interface EvaluationItemRule {
  id: string
  code: string
  answerType: 'SCORE' | 'TEXT' | 'BOOLEAN' | 'SCORE_AND_TEXT'
  required: boolean
  maxScore: number | null
  weight: number
}

export interface EvaluationAnswerInput {
  itemId: string
  score?: number
  text?: string
  booleanValue?: boolean
}

export interface EvaluationAnswerSnapshot extends EvaluationAnswerInput {
  itemCode: string
  answerType: EvaluationItemRule['answerType']
  maxScore: number | null
  weight: number
}

export function validateAndSnapshotAnswers(
  rules: readonly EvaluationItemRule[],
  answers: readonly EvaluationAnswerInput[],
  options: { requireComplete?: boolean } = {},
): EvaluationAnswerSnapshot[] {
  const rulesById = new Map(rules.map(rule => [rule.id, rule]))
  const answersById = new Map<string, EvaluationAnswerInput>()

  for (const answer of answers) {
    if (answersById.has(answer.itemId)) {
      throw new DomainError('VALIDATION_FAILED', 'Evaluation item was answered more than once')
    }
    const rule = rulesById.get(answer.itemId)
    if (!rule) throw new DomainError('VALIDATION_FAILED', 'Answer does not belong to the template version')
    if (answer.score !== undefined && (answer.score < 0 || rule.maxScore === null || answer.score > rule.maxScore)) {
      throw new DomainError('VALIDATION_FAILED', `Score for ${rule.code} is outside the allowed range`)
    }
    if ((rule.answerType === 'SCORE' || rule.answerType === 'SCORE_AND_TEXT') && answer.score === undefined) {
      throw new DomainError('VALIDATION_FAILED', `Score for ${rule.code} is required`)
    }
    if ((rule.answerType === 'TEXT' || rule.answerType === 'SCORE_AND_TEXT') && !answer.text?.trim()) {
      throw new DomainError('VALIDATION_FAILED', `Text for ${rule.code} is required`)
    }
    if (rule.answerType === 'BOOLEAN' && answer.booleanValue === undefined) {
      throw new DomainError('VALIDATION_FAILED', `Boolean answer for ${rule.code} is required`)
    }
    answersById.set(answer.itemId, answer)
  }

  if (options.requireComplete !== false) {
    for (const rule of rules) {
      if (rule.required && !answersById.has(rule.id)) {
        throw new DomainError('VALIDATION_FAILED', `Required evaluation item ${rule.code} is missing`)
      }
    }
  }

  return answers.map((answer) => {
    const rule = rulesById.get(answer.itemId)!
    return {
      ...answer,
      text: answer.text?.trim(),
      itemCode: rule.code,
      answerType: rule.answerType,
      maxScore: rule.maxScore,
      weight: rule.weight,
    }
  })
}
