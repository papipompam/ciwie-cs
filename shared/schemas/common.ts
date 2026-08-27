import { z } from 'zod'
import { PAGE_SIZES } from '../constants/domain'

export const idSchema = z.string().trim().min(1).max(191)
export const reasonSchema = z.string().trim().min(3).max(1_000)
export const idempotencyKeySchema = z.string().trim().min(8).max(191)
export const isoDateSchema = z.iso.date()

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().refine(
    value => (PAGE_SIZES as readonly number[]).includes(value),
    'pageSize must be one of 10, 20, 50, 100',
  ).default(20),
  search: z.string().trim().max(200).optional(),
  sort: z.string().trim().max(100).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  status: z.string().trim().max(64).optional(),
  coverage: z.enum(['UNSCHEDULED', 'SCHEDULED', 'OVERDUE', 'MISSING_RESULT', 'COMPLETED']).optional(),
  coopTermId: idSchema.optional(),
  organizationId: idSchema.optional(),
  province: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
}).strict().refine(value => Boolean(value.sort) === Boolean(value.order), {
  message: 'sort and order must be provided together',
  path: ['sort'],
})

export const commandHeadersSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
}).strict()
