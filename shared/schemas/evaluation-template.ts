import { z } from 'zod'
import { idSchema } from './common'

const evaluationItemSchema = z.object({
  code: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/),
  label: z.string().trim().min(1).max(500),
  answerType: z.enum(['SCORE', 'TEXT', 'BOOLEAN']),
  required: z.boolean().default(true),
  maxScore: z.number().positive().max(999_999).nullable().optional(),
  weight: z.number().positive().max(9999).default(1),
}).strict().superRefine((item, context) => {
  if (item.answerType === 'SCORE' && item.maxScore == null) context.addIssue({ code: 'custom', path: ['maxScore'], message: 'Score items require maxScore' })
  if (item.answerType !== 'SCORE' && item.maxScore != null) context.addIssue({ code: 'custom', path: ['maxScore'], message: 'Only score items may define maxScore' })
})

const itemsSchema = z.array(evaluationItemSchema).min(1).max(100).superRefine((items, context) => {
  const seen = new Set<string>()
  items.forEach((item, index) => {
    const code = item.code.toUpperCase()
    if (seen.has(code)) context.addIssue({ code: 'custom', path: [index, 'code'], message: 'Item code must be unique within a version' })
    seen.add(code)
  })
})

export const evaluationTemplateCreateSchema = z.object({
  code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/),
  subject: z.enum(['STUDENT', 'ORGANIZATION']),
  name: z.string().trim().min(2).max(255),
  items: itemsSchema,
}).strict()

export const evaluationTemplateVersionCreateSchema = z.object({ items: itemsSchema }).strict()
export const evaluationTemplatePublishSchema = z.object({ expectedStatus: z.literal('DRAFT').default('DRAFT') }).strict()
export const evaluationTemplateIdSchema = z.object({ templateId: idSchema }).strict()
export const evaluationTemplateVersionIdSchema = z.object({ versionId: idSchema }).strict()

export type EvaluationTemplateCreateInput = z.infer<typeof evaluationTemplateCreateSchema>
export type EvaluationTemplateVersionCreateInput = z.infer<typeof evaluationTemplateVersionCreateSchema>
