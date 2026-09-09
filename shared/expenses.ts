import { z } from 'zod'

export const expenseFields = ['fuel', 'accommodation', 'allowance'] as const
export type ExpenseField = typeof expenseFields[number]

export const expenseAmountsSchema = z.object({
  fuel: z.number({ error: 'กรุณากรอกค่าน้ำมันเป็นตัวเลข' }).min(0, 'ค่าน้ำมันต้องไม่ติดลบ'),
  accommodation: z.number({ error: 'กรุณากรอกค่าที่พักเป็นตัวเลข' }).min(0, 'ค่าที่พักต้องไม่ติดลบ'),
  allowance: z.number({ error: 'กรุณากรอกเบี้ยเลี้ยงเป็นตัวเลข' }).min(0, 'เบี้ยเลี้ยงต้องไม่ติดลบ'),
})

export type ExpenseAmounts = z.infer<typeof expenseAmountsSchema>

export interface ExpenseReference {
  cycleId: string
  round: 1 | 2
}

export interface ExpenseCalculation {
  reference: ExpenseReference
  amounts: ExpenseAmounts
  total: number
}

export interface ExpenseRecord extends ExpenseCalculation {
  id: string
  createdAt: string
  createdBy: string
}

export type ExpenseRecordMetadata = Pick<ExpenseRecord, 'id' | 'createdAt' | 'createdBy'>

export const lecturerGenderSchema = z.enum(['male', 'female'])
export type LecturerGender = z.infer<typeof lecturerGenderSchema>

export const supervisionLineExpenseInputSchema = z.object({
  fuel: z.number().min(0).max(10_000_000),
  roomRate: z.number().min(0).max(1_000_000),
  nights: z.number().int().min(0).max(365),
  allowanceRate: z.number().min(0).max(1_000_000),
  allowanceDays: z.number().int().min(0).max(365),
  roomCapacity: z.number().int().min(1).max(10),
}).strict()

export type SupervisionLineExpenseInput = z.infer<typeof supervisionLineExpenseInputSchema>

export interface SupervisionExpenseLecturer {
  id: string
  gender: LecturerGender | null
}

export interface SupervisionLineExpenseResult {
  lecturerCount: number
  maleLecturerCount: number
  femaleLecturerCount: number
  maleRoomCount: number
  femaleRoomCount: number
  roomCount: number
  amounts: ExpenseAmounts
  total: number
}

export const supervisionExpenseContextSchema = z.object({
  cycleId: z.string().trim().min(1).max(30),
  round: z.coerce.number().int().refine(value => value === 1 || value === 2),
}).strict()

export interface SupervisionExpenseLecturerSnapshot extends SupervisionExpenseLecturer {
  name: string
}

export interface SupervisionExpenseRecord extends SupervisionLineExpenseResult, SupervisionLineExpenseInput {
  id: string
  groupId: string
  groupName: string
  cycleId: string
  round: 1 | 2
  companyCount: number
  lecturers: SupervisionExpenseLecturerSnapshot[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface SupervisionExpenseGroup {
  id: string
  name: string
  cycleId: string
  round: 1 | 2
  companyCount: number
  lecturers: SupervisionExpenseLecturerSnapshot[]
}

export interface SupervisionExpensesResponse {
  groups: SupervisionExpenseGroup[]
  records: SupervisionExpenseRecord[]
}
