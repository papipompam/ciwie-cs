import { describe, expect, it } from 'vitest'
import { calculateCoverage, countUnscheduledRounds } from '../../server/services/visit-service'

describe('visit coverage projection', () => {
  it('computes unscheduled without creating a visit state', () => {
    expect(calculateCoverage({ studentTermId: 's1', round: 1 }, '2026-08-18')).toBe('UNSCHEDULED')
    expect(calculateCoverage({ studentTermId: 's1', round: 1, visitStatus: 'CANCELLED' }, '2026-08-18')).toBe('UNSCHEDULED')
  })

  it('distinguishes overdue and missing result', () => {
    expect(calculateCoverage({ studentTermId: 's1', round: 1, visitStatus: 'SCHEDULED', visitDate: '2026-08-17' }, '2026-08-18')).toBe('OVERDUE')
    expect(calculateCoverage({ studentTermId: 's1', round: 1, visitStatus: 'COMPLETED', hasResult: false }, '2026-08-18')).toBe('MISSING_RESULT')
  })

  it('does not count a visit at a placement work site that was later corrected', () => {
    expect(countUnscheduledRounds({ currentWorkSiteId: 'site-new', visits: [
      { round: 1, workSiteId: 'site-old' },
      { round: 2, workSiteId: 'site-new' },
    ] })).toBe(1)
  })
})
