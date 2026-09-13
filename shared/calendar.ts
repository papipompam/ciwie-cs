import { z } from 'zod'

export const calendarEventTypeSchema = z.enum(['supervision', 'document', 'deadline', 'evaluation', 'general'])
export const calendarEventInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).default(''),
  date: z.string().date(),
  type: calendarEventTypeSchema,
}).strict()
export const calendarEventSchema = calendarEventInputSchema.extend({ id: z.string().min(1).max(30) }).strict()
export const calendarEventsResponseSchema = z.object({ events: z.array(calendarEventSchema) }).strict()
