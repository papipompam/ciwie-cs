import { z } from 'zod'

export const coopCycleStatusSchema = z.enum(['draft', 'open', 'closed_to_requests', 'training', 'closed'])
export type CoopCycleStatus = z.infer<typeof coopCycleStatusSchema>

export const coopCycleSchema = z.object({
  id: z.string().min(1).max(30),
  code: z.string().min(1).max(50),
  label: z.string().min(1).max(150),
  academicYear: z.number().int(),
  semester: z.string().min(1).max(100),
  cohort: z.string().min(1).max(50),
  requestStart: z.string().date(),
  requestEnd: z.string().date(),
  trainingStart: z.string().date(),
  trainingEnd: z.string().date(),
  status: coopCycleStatusSchema,
}).strict()

export type CoopCycle = z.infer<typeof coopCycleSchema>
export const coopCyclesResponseSchema = z.object({ cycles: z.array(coopCycleSchema) }).strict()

export const sortCoopCycles = <TCycle extends { academicYear: number, requestStart: string, term?: string }>(cycles: TCycle[]) => [...cycles].sort((left, right) =>
  right.academicYear - left.academicYear
  || right.requestStart.localeCompare(left.requestStart)
  || String(right.term ?? '').localeCompare(String(left.term ?? '')),
)
