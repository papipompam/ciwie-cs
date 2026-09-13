import { describe, expect, it } from 'vitest'
import { sortCoopCycles } from './coop-cycles'

describe('cooperative cycle ordering', () => {
  it('keeps every term and puts the newest cycle first', () => {
    expect(sortCoopCycles([
      { id: 'summer', academicYear: 2569, term: 'SUMMER', requestStart: '2027-01-04' },
      { id: 'first', academicYear: 2570, term: 'FIRST', requestStart: '2027-04-01' },
      { id: 'second', academicYear: 2569, term: 'SECOND', requestStart: '2026-08-01' },
    ]).map(cycle => cycle.id)).toEqual(['first', 'summer', 'second'])
  })
})
