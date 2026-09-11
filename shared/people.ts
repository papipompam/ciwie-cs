import { z } from 'zod'

export const personTypeSchema = z.enum(['student', 'lecturer'])
export const personGenderSchema = z.enum(['male', 'female'])
export const personPrefixSchema = z.enum(['นาย', 'นาง', 'นางสาว', 'อาจารย์', 'ดร.', 'ผศ.', 'ผศ.ดร.', 'รศ.', 'รศ.ดร.', 'ศ.', 'ศ.ดร.'])
export const studentPersonPrefixes = ['นาย', 'นาง', 'นางสาว'] as const
export const lecturerPersonPrefixes = ['นาย', 'นาง', 'นางสาว', 'อาจารย์', 'ดร.', 'ผศ.', 'ผศ.ดร.', 'รศ.', 'รศ.ดร.', 'ศ.', 'ศ.ดร.'] as const

export const genderFromPersonPrefix = (prefix: z.infer<typeof personPrefixSchema>): z.infer<typeof personGenderSchema> | undefined => {
  if (prefix === 'นาย') return 'male'
  if (prefix === 'นาง' || prefix === 'นางสาว') return 'female'
  return undefined
}

export const personInputSchema = z.object({
  id: z.string().trim().min(1).max(100),
  prefix: personPrefixSchema,
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100),
  phone: z.string().trim().regex(/^[0-9+()\-\s]{8,30}$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง').optional(),
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง').max(254).optional(),
  cohortYear: z.coerce.number().int().min(2500).max(3000).optional(),
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

export const peopleImportRequestSchema = z.object({
  type: personTypeSchema,
  people: z.array(personInputSchema).min(1).max(1000),
}).strict()

export const peopleImportCredentialSchema = z.object({
  username: z.string(),
  name: z.string(),
  temporaryPassword: z.string(),
}).strict()

export const peopleImportResponseSchema = z.object({
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  duplicates: z.array(z.string()),
  credentials: z.array(peopleImportCredentialSchema),
}).strict()

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
