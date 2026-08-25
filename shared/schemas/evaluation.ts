import { z } from 'zod'
import { EVALUATION_SUBJECTS } from '../constants/domain'
import { idSchema, reasonSchema } from './common'

export const evaluationAnswerSchema = z.object({
  itemId: idSchema,
  score: z.number().finite().nonnegative().optional(),
  text: z.string().trim().max(5_000).optional(),
  booleanValue: z.boolean().optional(),
}).strict().refine(value => value.score !== undefined || Boolean(value.text) || value.booleanValue !== undefined, {
  message: 'An answer must contain score or text',
})

export const evaluationDraftSchema = z.object({
  visitId: idSchema,
  subjectType: z.enum(EVALUATION_SUBJECTS),
  subjectId: idSchema,
  templateVersionId: idSchema,
  answers: z.array(evaluationAnswerSchema).max(500),
  expectedVersion: z.number().int().min(0).optional(),
}).strict()

export const evaluationSubmitSchema = z.object({
  expectedVersion: z.number().int().min(0),
}).strict()

export const evaluationCorrectionSchema = z.object({
  expectedVersion: z.number().int().min(0),
  reason: reasonSchema,
  answers: z.array(evaluationAnswerSchema).min(1).max(500),
}).strict()

export const organizationEvaluationDraftSchema = z.object({
  visitId: idSchema,
  templateVersionId: idSchema,
  answers: z.array(evaluationAnswerSchema).max(500),
  expectedVersion: z.number().int().min(1).optional(),
}).strict()

export const evaluationDetailQuerySchema = z.object({
  subjectType: z.enum(EVALUATION_SUBJECTS).optional(),
}).strict()

export const studentEvaluationDraftSchema = z.object({
  visitStudentId: idSchema,
  templateVersionId: idSchema,
  answers: z.array(evaluationAnswerSchema).max(500),
  expectedVersion: z.number().int().min(1).optional(),
}).strict()
