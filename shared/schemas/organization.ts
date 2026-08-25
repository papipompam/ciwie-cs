import { z } from 'zod'
import { idSchema, reasonSchema } from './common'

const optionalText = (max: number) => z.string().trim().max(max).optional()

export const organizationCreateSchema = z.object({
  nameTh: z.string().trim().min(2).max(255),
  nameEn: optionalText(255),
  taxId: z.string().trim().min(10).max(32).optional(),
}).strict()

export const organizationSuggestionQuerySchema = z.object({
  name: z.string().trim().min(2).max(255),
  taxId: z.string().trim().max(32).optional(),
}).strict()

export const workSiteCreateSchema = z.object({
  organizationId: idSchema,
  name: z.string().trim().min(2).max(255),
  addressLine: z.string().trim().min(5).max(500),
  province: z.string().trim().min(2).max(100),
  region: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().regex(/^\d{5}$/).optional(),
  contact: z.object({
    name: z.string().trim().min(2).max(200),
    position: optionalText(150),
    email: z.string().trim().email().max(320).optional(),
    phone: optionalText(32),
  }).strict().optional(),
}).strict()

export const organizationMergeSchema = z.object({
  targetOrganizationId: idSchema,
  reason: reasonSchema,
}).strict()

export const organizationMergePreviewSchema = organizationMergeSchema.pick({ targetOrganizationId: true }).strict()

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>
export type WorkSiteCreateInput = z.infer<typeof workSiteCreateSchema>

