import { z } from 'zod'

export const coopCycleStatusSchema = z.enum(['open', 'closed_to_requests', 'training', 'closed'])
export type CoopCycleStatus = z.infer<typeof coopCycleStatusSchema>

export const nextCoopCycleStatus: Partial<Record<CoopCycleStatus, CoopCycleStatus>> = {
  open: 'closed_to_requests',
  closed_to_requests: 'training',
  training: 'closed',
}

export const academicTermSchema = z.enum(['FIRST', 'SECOND', 'SUMMER', 'OTHER'])
export type AcademicTerm = z.infer<typeof academicTermSchema>

export const academicTermLabels: Record<AcademicTerm, string> = {
  FIRST: 'ภาคเรียนที่ 1',
  SECOND: 'ภาคเรียนที่ 2',
  SUMMER: 'ภาคฤดูร้อน',
  OTHER: 'ภาคเรียนอื่น',
}

export const coopCycleInputSchema = z.object({
  academicYear: z.coerce.number().int().min(2500).max(2700),
  term: academicTermSchema,
  targetCohortYear: z.coerce.number().int().min(2500).max(2700),
  requestStart: z.string().date().optional(),
  requestEnd: z.string().date().optional(),
  trainingStart: z.string().date().optional(),
  trainingEnd: z.string().date().optional(),
}).strict().superRefine((value, context) => {
  if (value.requestStart && value.requestEnd && value.requestStart > value.requestEnd) context.addIssue({ code: 'custom', path: ['requestEnd'], message: 'วันสิ้นสุดรับคำร้องต้องไม่น้อยกว่าวันเริ่มต้น' })
  if (value.requestEnd && value.trainingStart && value.requestEnd > value.trainingStart) context.addIssue({ code: 'custom', path: ['trainingStart'], message: 'ช่วงฝึกงานต้องเริ่มหลังช่วงรับคำร้อง' })
  if (value.trainingStart && value.trainingEnd && value.trainingStart > value.trainingEnd) context.addIssue({ code: 'custom', path: ['trainingEnd'], message: 'วันสิ้นสุดฝึกงานต้องไม่น้อยกว่าวันเริ่มต้น' })
})
export type CoopCycleInput = z.infer<typeof coopCycleInputSchema>

export const coopCycleStatusInputSchema = z.object({
  status: coopCycleStatusSchema,
  reason: z.string().trim().max(500).optional(),
}).strict()

export const coopCycleSchema = z.object({
  id: z.string().min(1).max(30),
  code: z.string().min(1).max(50),
  label: z.string().min(1).max(150),
  academicYear: z.number().int(),
  term: academicTermSchema,
  semester: z.string().min(1).max(100),
  targetCohortYear: z.number().int(),
  cohort: z.string().min(1).max(50),
  requestStart: z.string().date().optional(),
  requestEnd: z.string().date().optional(),
  trainingStart: z.string().date().optional(),
  trainingEnd: z.string().date().optional(),
  status: coopCycleStatusSchema,
}).strict()

export type CoopCycle = z.infer<typeof coopCycleSchema>
export const coopCyclesResponseSchema = z.object({ cycles: z.array(coopCycleSchema) }).strict()

export const sortCoopCycles = <TCycle extends { academicYear: number, requestStart?: string, term?: string }>(cycles: TCycle[]) => [...cycles].sort((left, right) =>
  right.academicYear - left.academicYear
  || (right.requestStart ?? '').localeCompare(left.requestStart ?? '')
  || String(right.term ?? '').localeCompare(String(left.term ?? '')),
)
