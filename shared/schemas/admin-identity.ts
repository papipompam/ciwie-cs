import { z } from 'zod'
import { idSchema, reasonSchema } from './common'

export const adminUserCommandSchema = z.object({
  reason: reasonSchema,
}).strict()

export const lecturerAccountCreateSchema = z.object({
  email: z.string().trim().email().max(320),
  employeeCode: z.string().trim().min(2).max(32).optional(),
  firstNameTh: z.string().trim().min(1).max(100),
  lastNameTh: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(32).optional(),
}).strict()

export const studentAccountCreateSchema = z.object({
  studentCode: z.string().trim().min(4).max(32),
  email: z.string().trim().email().max(320),
  firstNameTh: z.string().trim().min(1).max(100),
  lastNameTh: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(32).optional(),
  coopTermId: idSchema,
}).strict()

export const studentProfileAdminUpdateSchema = z.object({
  email: z.string().trim().email().max(320),
  firstNameTh: z.string().trim().min(1).max(100),
  lastNameTh: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(6).max(32).nullable().optional(),
  reason: reasonSchema,
}).strict()

export const adminUserIdParamsSchema = z.object({ userId: idSchema }).strict()

export const profileUpdateSchema = z.object({
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().min(6).max(32).nullable().optional(),
}).strict().refine(value => value.email !== undefined || value.phone !== undefined, {
  message: 'At least one contact field is required',
})

export const profilePasswordChangeSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(12).max(128),
}).strict().refine(value => value.currentPassword !== value.newPassword, {
  message: 'New password must differ from current password',
  path: ['newPassword'],
})

export const accountActivationSchema = z.object({
  code: z.string().trim().min(32).max(128),
  newPassword: z.string().min(12).max(128),
}).strict()

export const passwordResetCompleteSchema = z.object({
  token: z.string().trim().min(32).max(128),
  newPassword: z.string().min(12).max(128),
}).strict()

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
