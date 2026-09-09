import type { SupervisionExpenseRecord, SupervisionExpensesResponse, SupervisionLineExpenseInput } from '#shared/expenses'
import { requestAwareFetch } from '../utils/requestAwareFetch'

export const useSupervisionExpenses = () => {
  const groups = useState<SupervisionExpensesResponse['groups']>('supervision-expense-groups', () => [])
  const records = useState<SupervisionExpenseRecord[]>('supervision-expense-records-v2', () => [])

  const loadExpenses = async (cycleId: string, round: 1 | 2) => {
    const response = await requestAwareFetch('/api/staff/expenses', { query: { cycleId, round } }) as SupervisionExpensesResponse
    groups.value = response.groups
    records.value = response.records
    return response
  }

  const saveExpense = async (groupId: string, input: SupervisionLineExpenseInput) => {
    const saved = await requestAwareFetch(`/api/staff/expenses/${encodeURIComponent(groupId)}`, {
      method: 'PUT', body: input,
    }) as SupervisionExpenseRecord
    const index = records.value.findIndex(record => record.groupId === groupId)
    if (index === -1) records.value.unshift(saved)
    else records.value[index] = saved
    return saved
  }

  return { groups, records, loadExpenses, saveExpense }
}
