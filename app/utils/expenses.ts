import type { ExpenseAmounts, ExpenseCalculation, ExpenseRecord, ExpenseRecordMetadata, ExpenseReference } from '../../shared/expenses'

const validPreviewAmount = (value: number) => Number.isFinite(value) && value >= 0 ? value : 0

export const normalizeExpensePreview = (amounts: ExpenseAmounts): ExpenseAmounts => ({
  fuel: validPreviewAmount(amounts.fuel),
  accommodation: validPreviewAmount(amounts.accommodation),
  allowance: validPreviewAmount(amounts.allowance),
})

export const calculateExpenseTotal = (amounts: ExpenseAmounts) => (
  Math.round((amounts.fuel + amounts.accommodation + amounts.allowance) * 100) / 100
)

export const createExpenseCalculation = (reference: ExpenseReference, amounts: ExpenseAmounts): ExpenseCalculation => ({
  reference: { ...reference },
  amounts: { ...amounts },
  total: calculateExpenseTotal(amounts),
})

export const createExpenseRecord = (calculation: ExpenseCalculation, metadata: ExpenseRecordMetadata): ExpenseRecord => ({
  id: metadata.id,
  reference: { ...calculation.reference },
  amounts: { ...calculation.amounts },
  total: calculation.total,
  createdAt: metadata.createdAt,
  createdBy: metadata.createdBy,
})
