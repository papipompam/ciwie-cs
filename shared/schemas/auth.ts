import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email().max(320).transform(value => value.normalize('NFKC').toLocaleLowerCase('en-US')),
  password: z.string().min(8).max(128),
}).strict()

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(8).max(128),
  newPassword: z.string().min(12).max(128),
}).strict().refine(value => value.currentPassword !== value.newPassword, {
  message: 'New password must differ from current password',
  path: ['newPassword'],
})
