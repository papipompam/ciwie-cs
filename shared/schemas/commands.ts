import { z } from 'zod'
import { idSchema, isoDateSchema, reasonSchema } from './common'
import { VISIT_PERIODS } from '../constants/domain'

export const visitLifecycleSchema = z.object({ expectedVersion: z.number().int().min(1), reason: reasonSchema }).strict()
export const visitRescheduleCommandSchema = visitLifecycleSchema.extend({ date: isoDateSchema, period: z.enum(VISIT_PERIODS) }).strict()

export const placementCorrectSchema = z.object({ expectedVersion: z.number().int().min(1), workSiteId: idSchema, reason: reasonSchema }).strict()
export const placementReverseSchema = z.object({ expectedVersion: z.number().int().min(1), reason: reasonSchema }).strict()

export const documentRevisionSchema = z.object({ fileVersionId: idSchema, kind: z.enum(['LETTER', 'BLANK_RESPONSE']), reason: reasonSchema.optional() }).strict()
export const documentSendSchema = z.object({ expectedVersion: z.number().int().min(1), documentNo: z.string().trim().min(1).max(100), documentYear: z.number().int().min(2500).max(3000), documentDate: isoDateSchema }).strict()
const deliveryOwnerFields = { ownerType: z.enum(['STUDENT', 'LECTURER']), ownerUserId: idSchema } as const
export const deliveryAssignmentSchema = z.object({ ...deliveryOwnerFields, reason: reasonSchema }).strict()
export const deliveryDirectSendSchema = z.object({ ...deliveryOwnerFields, channel: z.string().trim().min(1).max(100), recipient: z.string().trim().min(1).max(255), sentAt: z.iso.datetime(), note: z.string().trim().max(1000).optional(), evidenceFileVersionId: idSchema.optional() }).strict()
export const deliveryCreateSchema = z.union([deliveryAssignmentSchema, deliveryDirectSendSchema])
export const deliverySendSchema = z.object({ channel: z.string().trim().min(1).max(100), recipient: z.string().trim().min(1).max(255), sentAt: z.iso.datetime(), note: z.string().trim().max(1000).optional(), evidenceFileVersionId: idSchema.optional() }).strict()
export const deliveryAcknowledgeSchema = z.object({ acknowledgedAt: z.iso.datetime(), note: z.string().trim().max(1000).optional() }).strict()

const expenseAmounts = { travelDays: z.number().int().min(1).max(365), travelAmount: z.number().finite().nonnegative().max(9_999_999_999), lodgingAmount: z.number().finite().nonnegative().max(9_999_999_999), mealAmount: z.number().finite().nonnegative().max(9_999_999_999), note: z.string().trim().max(1000).optional() } as const
export const expenseSchema = z.object({ visitId: idSchema, round: z.number().int().min(1).max(2), ...expenseAmounts }).strict()
export const expenseCorrectionSchema = z.object({ expectedVersion: z.number().int().min(1), reason: reasonSchema, ...expenseAmounts }).strict()
