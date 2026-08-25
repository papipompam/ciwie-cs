import { z } from 'zod'
import { VISIT_PERIODS } from '../constants/domain'
import { idSchema, isoDateSchema, reasonSchema } from './common'

export const visitScheduleSchema = z.object({
  coopTermId: idSchema,
  workSiteId: idSchema,
  round: z.number().int().min(1).max(2),
  date: isoDateSchema,
  period: z.enum(VISIT_PERIODS),
  studentTermIds: z.array(idSchema).min(1).max(100),
  lecturerIds: z.array(idSchema).min(1).max(20),
}).strict().superRefine((value, context) => {
  for (const [key, items] of [['studentTermIds', value.studentTermIds], ['lecturerIds', value.lecturerIds]] as const) {
    if (new Set(items).size !== items.length) {
      context.addIssue({ code: 'custom', message: `${key} contains duplicates`, path: [key] })
    }
  }
})

export const visitRescheduleSchema = z.object({
  expectedVersion: z.number().int().min(0),
  date: isoDateSchema,
  period: z.enum(VISIT_PERIODS),
  reason: reasonSchema,
}).strict()

export const visitReasonCommandSchema = z.object({
  expectedVersion: z.number().int().min(0),
  reason: reasonSchema,
}).strict()

export const internalNoteSchema = z.object({ content: z.string().trim().min(1).max(10_000) }).strict()
export const companyRequirementSchema = z.object({ placementId: idSchema.optional(), category: z.string().trim().min(1).max(100), technology: z.string().trim().max(255).optional(), detail: z.string().trim().min(1).max(10_000) }).strict()
export const supervisionResultSchema = z.object({ outcome: z.enum(['COMPLETED', 'ABSENT', 'MAKEUP_REQUIRED']), summary: z.string().trim().max(10_000).optional(), expectedVersion: z.number().int().min(1).optional(), reason: reasonSchema.optional() }).strict()
