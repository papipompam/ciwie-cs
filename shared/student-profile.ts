import { z } from 'zod'
import { studentPersonPrefixes } from './people'

const phoneSchema = z.string().trim().regex(/^[0-9+()\-\s]{8,30}$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง')
const emailSchema = z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง').max(254)

export const studentProfileInputSchema = z.object({
  prefix: z.enum(studentPersonPrefixes),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  section: z.enum(['1', '2']),
  phone: phoneSchema,
  email: emailSchema,
}).strict()

export const studentProfileSchema = studentProfileInputSchema.extend({
  id: z.string(),
  username: z.string(),
  cohortYear: z.number().int().nullable(),
  section: z.enum(['1', '2']).nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
})

export const studentProfileResponseSchema = z.object({ profile: studentProfileSchema })

export type StudentProfile = z.infer<typeof studentProfileSchema>
