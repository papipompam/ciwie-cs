import { z } from 'zod'

export const personTypeSchema = z.enum(['student', 'lecturer'])
export const personGenderSchema = z.enum(['male', 'female'])
export const personPrefixSchema = z.enum(['นาย', 'นาง', 'นางสาว', 'อาจารย์', 'ดร.', 'ผศ.', 'ผศ.ดร.', 'รศ.', 'รศ.ดร.', 'ศ.', 'ศ.ดร.'])
export const studentPersonPrefixes = ['นาย', 'นาง', 'นางสาว'] as const
export const lecturerPersonPrefixes = ['อาจารย์', 'ดร.', 'ผศ.', 'ผศ.ดร.', 'รศ.', 'รศ.ดร.', 'ศ.', 'ศ.ดร.'] as const

export const personInputSchema = z.object({
  id: z.string().trim().min(1).max(100),
  prefix: personPrefixSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100),
  gender: personGenderSchema.optional(),
  cycle: z.string().trim().max(150).optional(),
  section: z.enum(['หมู่ 1', 'หมู่ 2']).optional(),
}).strict()

export const personAccountActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('suspend') }).strict(),
  z.object({ action: z.literal('activate') }).strict(),
  z.object({ action: z.literal('terminate') }).strict(),
  z.object({ action: z.literal('restore') }).strict(),
  z.object({ action: z.literal('reset-password'), temporaryPassword: z.string().min(8).max(200) }).strict(),
])

export const lecturerStudentNameSchema = z.object({
  prefix: z.enum(studentPersonPrefixes),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
}).strict()

export const personActivitySchema = z.object({
  id: z.string(), action: z.string(), detail: z.string(), actor: z.string(),
  occurredAt: z.string().datetime({ offset: true }),
})

export const personRecordSchema = personInputSchema.extend({
  accountId: z.string(),
  type: personTypeSchema,
  recordStatus: z.enum(['active', 'inactive']),
  accountStatus: z.enum(['first-login', 'active', 'suspended', 'terminated']),
  company: z.string().optional(),
  activities: z.array(personActivitySchema),
})

export const peopleResponseSchema = z.object({ people: z.array(personRecordSchema).max(10_000) })
