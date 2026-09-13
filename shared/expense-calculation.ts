import type { ExpenseAmounts, SupervisionExpenseLecturer, SupervisionLineExpenseInput, SupervisionLineExpenseResult } from './expenses'

const roundCurrency = (value: number) => Math.round(value * 100) / 100

export const calculateSupervisionLineExpense = (
  input: SupervisionLineExpenseInput,
  lecturers: SupervisionExpenseLecturer[],
): SupervisionLineExpenseResult => {
  const maleLecturerCount = lecturers.filter(lecturer => lecturer.gender === 'male').length
  const femaleLecturerCount = lecturers.filter(lecturer => lecturer.gender === 'female').length
  const maleRoomCount = maleLecturerCount ? Math.ceil(maleLecturerCount / input.roomCapacity) : 0
  const femaleRoomCount = femaleLecturerCount ? Math.ceil(femaleLecturerCount / input.roomCapacity) : 0
  const roomCount = maleLecturerCount + femaleLecturerCount
    ? maleRoomCount + femaleRoomCount
    : Math.ceil(lecturers.length / input.roomCapacity)
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
