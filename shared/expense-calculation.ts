import type { ExpenseAmounts, SupervisionExpenseLecturer, SupervisionLineExpenseInput, SupervisionLineExpenseResult } from './expenses'

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export const calculateSupervisionLineExpense = (
  input: SupervisionLineExpenseInput,
  lecturers: SupervisionExpenseLecturer[],
): SupervisionLineExpenseResult => {
  if (lecturers.some(lecturer => lecturer.gender === null)) throw new Error('LECTURER_GENDER_REQUIRED')
  const maleLecturerCount = lecturers.filter(lecturer => lecturer.gender === 'male').length
  const femaleLecturerCount = lecturers.filter(lecturer => lecturer.gender === 'female').length
  const maleRoomCount = Math.ceil(maleLecturerCount / input.roomCapacity)
  const femaleRoomCount = Math.ceil(femaleLecturerCount / input.roomCapacity)
  const roomCount = maleRoomCount + femaleRoomCount
  const amounts: ExpenseAmounts = {
    fuel: roundCurrency(input.fuel),
    accommodation: roundCurrency(roomCount * input.roomRate * input.nights),
    allowance: roundCurrency(lecturers.length * input.allowanceRate * input.allowanceDays),
  }
  return {
    lecturerCount: lecturers.length,
    maleLecturerCount,
    femaleLecturerCount,
    maleRoomCount,
    femaleRoomCount,
    roomCount,
    amounts,
    total: roundCurrency(amounts.fuel + amounts.accommodation + amounts.allowance),
  }
}
