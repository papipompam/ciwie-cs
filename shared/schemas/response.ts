import { z } from 'zod'
import { RESPONSE_RESULTS } from '../constants/domain'
import { idSchema, reasonSchema } from './common'

export const responseDraftResultsSchema = z.object({
  expectedVersion: z.number().int().min(0),
  results: z.array(z.object({
    batchMemberId: idSchema,
    result: z.enum(RESPONSE_RESULTS),
  }).strict()).min(1).max(5_000),
}).strict().superRefine((value, context) => {
  const seen = new Set<string>()
  value.results.forEach((item, index) => {
    if (seen.has(item.batchMemberId)) {
      context.addIssue({ code: 'custom', message: 'Duplicate batch member', path: ['results', index, 'batchMemberId'] })
    }
    seen.add(item.batchMemberId)
  })
})

export const responseConfirmSchema = z.object({
  expectedVersion: z.number().int().min(0),
  reason: reasonSchema.optional(),
}).strict()

export const responseSubmitSchema = z.object({
  expectedVersion: z.number().int().min(0),
}).strict()

export const responseReturnSchema = z.object({
  expectedVersion: z.number().int().min(0),
  reason: reasonSchema,
}).strict()

export const responseCreateSchema = z.object({
  batchId: idSchema,
  fileVersionId: idSchema,
  results: responseDraftResultsSchema.shape.results,
}).strict()
