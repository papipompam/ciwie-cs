import type { ExpenseCalculation, ExpenseRecord } from '#shared/expenses'
import { createExpenseRecord } from '~/utils/expenses'

export const useExpenseRecords = () => {
  const records = useState<ExpenseRecord[]>('expense-records', () => [])

  const saveExpense = (calculation: ExpenseCalculation, createdBy: string) => {
    const createdAt = new Date().toISOString()
    const record = createExpenseRecord(calculation, {
      id: `EXP-${crypto.randomUUID()}`,
      createdAt,
      createdBy,
    })
    records.value.unshift(record)
    return record
  }

  return { records, saveExpense }
}
