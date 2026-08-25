import { describe, expect, it } from 'vitest'
import { paginationSchema } from '../../shared/schemas/common'
import { calculateCoverage } from '../../server/services/visit-service'

describe('backend list query contract', () => {
  it('accepts the UI search/filter/sort envelope and represents default sort by omission', () => {
    expect(paginationSchema.parse({ search: 'บริษัท', status: 'DRAFT', page: '1', pageSize: '20', sort: 'updatedAt', order: 'desc' })).toMatchObject({ search: 'บริษัท', status: 'DRAFT', sort: 'updatedAt', order: 'desc' })
    const defaultQuery = paginationSchema.parse({ page: '1', pageSize: '20' })
    expect(defaultQuery).not.toHaveProperty('sort')
    expect(defaultQuery).not.toHaveProperty('order')
  })

  it('rejects incomplete sort state and unknown query keys', () => {
    expect(() => paginationSchema.parse({ sort: 'status' })).toThrow()
    expect(() => paginationSchema.parse({ page: 1, pageSize: 20, rawOrderBy: 'DROP TABLE' })).toThrow()
  })

  it('computes unscheduled coverage from placement absence rather than a visit status', () => {
    expect(calculateCoverage({ studentTermId: 'student-term-1', round: 1 }, '2026-08-18')).toBe('UNSCHEDULED')
    expect(calculateCoverage({ studentTermId: 'student-term-1', round: 1, visitStatus: 'CANCELLED' }, '2026-08-18')).toBe('UNSCHEDULED')
    expect(calculateCoverage({ studentTermId: 'student-term-1', round: 1, visitStatus: 'SCHEDULED', visitDate: '2026-08-01' }, '2026-08-18')).toBe('OVERDUE')
  })
})
