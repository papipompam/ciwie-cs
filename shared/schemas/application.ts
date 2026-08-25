import { z } from 'zod'
import { APPLICATION_STATUSES } from '../constants/domain'
import { idSchema, isoDateSchema, reasonSchema } from './common'

export const applicationTransitionSchema = z.object({
  to: z.enum(APPLICATION_STATUSES),
  reason: reasonSchema.optional(),
  occurredAt: isoDateSchema.optional(),
  note: z.string().trim().max(2_000).optional(),
  evidenceFileVersionIds: z.array(idSchema).max(10).refine(ids => new Set(ids).size === ids.length, 'Evidence file ids must be unique').optional(),
  expectedVersion: z.number().int().min(0),
}).strict()

export const createApplicationSchema = z.object({
  studentTermId: idSchema,
  workSiteId: idSchema,
  contactId: idSchema.optional(),
  positionTitle: z.string().trim().min(1).max(255),
  appliedAt: isoDateSchema,
  evidenceFileVersionIds: z.array(idSchema).max(10).refine(ids => new Set(ids).size === ids.length, 'Evidence file ids must be unique').default([]),
  note: z.string().trim().max(2_000).optional(),
}).strict()

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>
