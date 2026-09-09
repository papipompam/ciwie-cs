import { describe, expect, it } from 'vitest'
import { bangkokCalendarDate } from './studentApplications'

describe('bangkokCalendarDate', () => {
  it('uses the Bangkok calendar day across a UTC date boundary', () => {
    expect(bangkokCalendarDate(new Date('2026-09-08T18:00:00.000Z')).toISOString()).toBe('2026-09-09T00:00:00.000Z')
  })
})
