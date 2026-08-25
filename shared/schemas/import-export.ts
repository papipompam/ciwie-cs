import { z } from 'zod'
import { idSchema } from './common'

export const studentImportConfirmSchema = z.object({
  previewHash: z.string().regex(/^[a-f0-9]{64}$/i),
  acceptedRowNumbers: z.array(z.number().int().min(1)).max(5_000),
  coopTermId: idSchema,
}).strict()

export const exportRequestSchema = z.object({
  kind: z.enum(['STUDENT_ROSTER', 'INTERNSHIP', 'COVERAGE', 'REQUIREMENT', 'EXPENSE']),
  format: z.enum(['CSV', 'XLSX']),
  coopTermId: idSchema,
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).default({}),
}).strict()
