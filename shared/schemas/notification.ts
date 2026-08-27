import { z } from 'zod'
import { idSchema } from './common'

export const adminNotificationCreateSchema = z.object({
  recipientId: idSchema,
  eventType: z.enum(['DOCUMENT_READY', 'DELIVERY_OVERDUE', 'RESPONSE_OVERDUE', 'RESPONSE_UPLOADED', 'RESPONSE_CONFIRMED', 'PLACEMENT_CONFIRMED', 'VISIT_SCHEDULED', 'VISIT_CHANGED', 'VISIT_REMINDER']),
  title: z.string().trim().min(3).max(255),
  body: z.string().trim().min(3).max(1000),
  entityType: z.string().trim().max(100).optional(),
  entityId: idSchema.optional(),
}).strict()
