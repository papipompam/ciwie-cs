import type { PersonRecord } from '../composables/usePeopleDirectory'

export const hasConfirmedPlacement = (person: Pick<PersonRecord, 'company'>) => Boolean(person.company?.trim())
export const compareStudentPlacement = (a: Pick<PersonRecord, 'company'>, b: Pick<PersonRecord, 'company'>, first: 'placed' | 'unplaced') => {
  const difference = Number(hasConfirmedPlacement(a)) - Number(hasConfirmedPlacement(b))
  return first === 'placed' ? -difference : difference
}
