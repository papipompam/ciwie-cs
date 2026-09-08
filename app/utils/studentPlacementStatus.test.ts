import { describe, expect, it } from 'vitest'
import { compareStudentPlacement, hasConfirmedPlacement } from './studentPlacementStatus'

describe('student placement status', () => {
  it('recognizes only a non-empty confirmed company field', () => {
    expect(hasConfirmedPlacement({})).toBe(false)
    expect(hasConfirmedPlacement({ company: ' ' })).toBe(false)
    expect(hasConfirmedPlacement({ company: 'บริษัททดสอบ' })).toBe(true)
  })
  it('sorts both ways without changing the original list', () => {
    const students = [{ company: '' }, { company: 'บริษัททดสอบ' }, {}]
    expect(students.toSorted((a, b) => compareStudentPlacement(a, b, 'placed')).map(hasConfirmedPlacement)).toEqual([true, false, false])
    expect(students.toSorted((a, b) => compareStudentPlacement(a, b, 'unplaced')).map(hasConfirmedPlacement)).toEqual([false, false, true])
    expect(students.map(hasConfirmedPlacement)).toEqual([false, true, false])
  })
})
