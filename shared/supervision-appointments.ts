import { z } from 'zod'
import { supervisionContextSchema } from './supervision-groups'

const resultFields = {
  summary: z.string().trim().max(10_000).default(''),
  issues: z.string().trim().max(10_000).default(''),
  suggestions: z.string().trim().max(10_000).default(''),
  companyRequirements: z.string().trim().max(10_000).default(''),
}

export const supervisionAppointmentsQuerySchema = supervisionContextSchema

export const supervisionAppointmentSchema = z.object({
  id: z.string(),
  cycleId: z.string(),
  round: z.union([z.literal(1), z.literal(2)]),
  groupId: z.string(),
  companyId: z.string(),
  studentIds: z.array(z.string()),
  date: z.string().date(),
  period: z.enum(['morning', 'afternoon']),
  lecturerIds: z.array(z.string()),
  splitReason: z.string().optional(),
  status: z.enum(['draft', 'published', 'postponed', 'completed', 'cancelled']),
  result: z.object({
    summary: z.string(),
    issues: z.string(),
    suggestions: z.string(),
    companyRequirements: z.string(),
    actualLecturerIds: z.array(z.string()),
    completedAt: z.string().datetime({ offset: true }).nullable(),
  }),
  createdAt: z.string().datetime({ offset: true }),
  display: z.object({
    companyName: z.string(), branchName: z.string(), address: z.string(), province: z.string(), groupName: z.string(),
    lecturers: z.array(z.object({ id: z.string(), name: z.string() })),
    students: z.array(z.object({ id: z.string(), name: z.string(), position: z.string() })),
  }).optional(),
})

export const supervisionAppointmentsResponseSchema = z.object({
  appointments: z.array(supervisionAppointmentSchema).max(5000),
})

export const supervisionAppointmentResponseSchema = z.object({
  appointment: supervisionAppointmentSchema,
})

export const createSupervisionAppointmentSchema = supervisionContextSchema.extend({
  groupId: z.string().trim().min(1).max(30),
  companyId: z.string().trim().min(1).max(30),
  studentIds: z.array(z.string().trim().min(1).max(100)).min(1).max(200),
  date: z.string().date(),
  period: z.enum(['morning', 'afternoon']),
  lecturerIds: z.array(z.string().trim().min(1).max(30)).min(1).max(20),
  splitReason: z.string().trim().max(5000).optional(),
  publish: z.boolean().default(false),
}).strict()

export const updateSupervisionResultSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update-schedule'),
    date: z.string().date(),
    period: z.enum(['morning', 'afternoon']),
    lecturerIds: z.array(z.string().trim().min(1).max(30)).min(1).max(20),
  }).strict(),
  z.object({ action: z.literal('save-result'), ...resultFields }).strict(),
  z.object({
    action: z.literal('complete'),
    ...resultFields,
    actualLecturerIds: z.array(z.string().trim().min(1).max(30)).min(1).max(20),
  }).strict(),
])
