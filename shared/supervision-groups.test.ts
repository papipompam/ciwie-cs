import { describe, expect, it } from 'vitest'
import { supervisionContextSchema } from './supervision-groups'

describe('supervision context', () => {
  it('accepts a configurable supervision occurrence after the second one', () => {
    expect(supervisionContextSchema.parse({ cycleId: 'CYCLE-1', round: 3 })).toEqual({
      cycleId: 'CYCLE-1',
      round: 3,
    })
  })

  it.each([0, 100])('rejects supervision occurrence %s outside 1-99', (round) => {
    expect(supervisionContextSchema.safeParse({ cycleId: 'CYCLE-1', round }).success).toBe(false)
  })
})
