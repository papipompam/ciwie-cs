import { z } from 'zod'
import { idSchema } from './common'

export const addBatchMemberSchema = z.object({
  requestId: idSchema,
  expectedBatchVersion: z.number().int().min(1),
}).strict()

export const removeBatchMemberSchema = z.object({
  memberId: idSchema,
  expectedBatchVersion: z.number().int().min(1),
  reason: z.string().trim().min(3).max(1000),
}).strict()

export const documentRequestTransitionSchema = z.object({
  to: z.enum(['IN_PROGRESS', 'READY_TO_SEND', 'CANCELLED']),
  reason: z.string().trim().min(3).max(1000),
}).strict()

export const createDocumentRequestSchema = z.object({ applicationId: idSchema }).strict()
export const createDocumentBatchSchema = z.object({ coopTermId: idSchema, workSiteId: idSchema, documentType: z.string().trim().min(1).max(64) }).strict()
export const assignDeliveryOwnerSchema = z.object({ ownerType: z.enum(['STUDENT', 'LECTURER']), ownerUserId: idSchema, reason: z.string().trim().min(3).max(1000) }).strict()
