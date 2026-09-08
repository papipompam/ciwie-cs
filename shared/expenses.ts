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
