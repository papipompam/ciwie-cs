import { expenseAmountsSchema, expenseFields } from '#shared/expenses'
import type { ExpenseAmounts, ExpenseCalculation, ExpenseField, ExpenseReference } from '#shared/expenses'
import { calculateExpenseTotal, createExpenseCalculation, normalizeExpensePreview } from '~/utils/expenses'

const createEmptyAmounts = (): Record<ExpenseField, string> => ({
  fuel: '',
  accommodation: '',
  allowance: '',
})

export const useExpenseCalculator = () => {
  const amounts = reactive(createEmptyAmounts())
  const errors = reactive<Partial<Record<ExpenseField, string>>>({})
  const calculatedExpense = ref<ExpenseCalculation | null>(null)

  const toNumbers = (): ExpenseAmounts => ({
    fuel: amounts.fuel.trim() === '' ? 0 : Number(amounts.fuel),
    accommodation: amounts.accommodation.trim() === '' ? 0 : Number(amounts.accommodation),
    allowance: amounts.allowance.trim() === '' ? 0 : Number(amounts.allowance),
  })
  const previewAmounts = computed(() => normalizeExpensePreview(toNumbers()))

  const hasInput = computed(() => expenseFields.some(field => amounts[field].trim() !== ''))
  const displayedAmounts = computed(() => calculatedExpense.value?.amounts ?? previewAmounts.value)
  const displayedTotal = computed(() => calculatedExpense.value?.total ?? calculateExpenseTotal(displayedAmounts.value))

  const clearErrors = () => Object.assign(errors, { fuel: undefined, accommodation: undefined, allowance: undefined })
  const clearFieldError = (field: ExpenseField) => {
    errors[field] = undefined
    calculatedExpense.value = null
  }

  const calculateExpenses = (reference: ExpenseReference) => {
    clearErrors()
    const result = expenseAmountsSchema.safeParse(toNumbers())
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as ExpenseField
        if (!errors[field]) errors[field] = issue.message
      }
      calculatedExpense.value = null
      return null
    }

    calculatedExpense.value = createExpenseCalculation(reference, result.data)
    return calculatedExpense.value
  }

  const invalidateCalculation = () => { calculatedExpense.value = null }

  const resetExpenses = () => {
    Object.assign(amounts, createEmptyAmounts())
    clearErrors()
    calculatedExpense.value = null
  }

  return {
    amounts,
    errors,
    calculatedExpense,
    displayedAmounts,
    displayedTotal,
    hasInput,
    clearFieldError,
    calculateExpenses,
    invalidateCalculation,
    resetExpenses,
  }
}
