import { z } from 'zod'

export const companyInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  branch: z.string().trim().min(1).max(150),
  province: z.string().trim().min(1).max(100),
  region: z.enum(['ภาคเหนือ', 'ภาคตะวันออกเฉียงเหนือ', 'ภาคกลาง', 'ภาคตะวันออก', 'ภาคตะวันตก', 'ภาคใต้']),
  address: z.string().trim().min(1).max(5000),
  contactName: z.string().trim().min(1).max(150),
  contactPhone: z.string().trim().min(1).max(50),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
}).strict()

export const companyStatusSchema = z.object({ status: z.enum(['active', 'inactive']) }).strict()

export const companyRecordSchema = companyInputSchema.extend({
  id: z.string(), status: z.enum(['active', 'inactive']),
  createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }),
})

export const companiesResponseSchema = z.object({ companies: z.array(companyRecordSchema).max(5000) })
