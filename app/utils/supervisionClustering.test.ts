import { describe, expect, it } from 'vitest'
import { clusterCompanies, distanceKm } from '../../shared/supervision-clustering'

describe('geographic complete-link clustering', () => {
  const companies = [
    { id: 'a', latitude: 15, longitude: 103 },
    { id: 'b', latitude: 15.01, longitude: 103.01 },
    { id: 'c', latitude: 18, longitude: 99 },
  ]
  it('groups nearby companies without splitting a company or duplicating membership', () => {
    expect(clusterCompanies(companies, { maxDistanceKm: 10, maxCompanies: 5 }).groups).toEqual([['a', 'b'], ['c']])
    expect(clusterCompanies([...companies].reverse(), { maxDistanceKm: 10, maxCompanies: 5 }).groups).toEqual([['a', 'b'], ['c']])
  })
  it('respects capacity and skips missing or invalid coordinates including null', () => {
    const result = clusterCompanies([...companies, { id: 'missing' }, { id: 'null', latitude: null, longitude: 103 }, { id: 'invalid', latitude: 91, longitude: 103 }], { maxDistanceKm: 500, maxCompanies: 1 })
    expect(result.groups).toHaveLength(3)
    expect(result.missingIds).toEqual(['invalid', 'missing', 'null'])
  })
  it('groups companies without coordinates by their administrative area', () => {
    const result = clusterCompanies([
      { id: 'bkk-1', region: 'ภาคกลาง', province: 'กรุงเทพมหานคร', address: 'เขตพญาไท กรุงเทพมหานคร' },
      { id: 'bkk-2', region: 'ภาคกลาง', province: 'กรุงเทพมหานคร', address: 'เขตพญาไท กรุงเทพมหานคร' },
      { id: 'brm-1', region: 'ภาคตะวันออกเฉียงเหนือ', province: 'บุรีรัมย์', address: 'อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์' },
      { id: 'unknown' },
    ], { maxDistanceKm: 10, maxCompanies: 5 })

    expect(result.groups).toEqual([['bkk-1', 'bkk-2'], ['brm-1']])
    expect(result.missingIds).toEqual(['unknown'])
  })
  it('does not chain together companies beyond the pairwise distance limit', () => {
    const result = clusterCompanies([0, 0.06, 0.12].map((longitude, index) => ({ id: String(index), latitude: 0, longitude })), { maxDistanceKm: 10, maxCompanies: 5 })
    expect(result.groups).toHaveLength(2)
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0)
  })
  it('validates inputs and handles empty input', () => {
    expect(clusterCompanies([], { maxDistanceKm: 10, maxCompanies: 2 }).groups).toEqual([])
    expect(() => clusterCompanies(companies, { maxDistanceKm: 0, maxCompanies: 1 })).toThrow()
    expect(() => clusterCompanies(companies, { maxDistanceKm: 10, maxCompanies: 1.5 })).toThrow()
    expect(() => clusterCompanies([companies[0]!, companies[0]!], { maxDistanceKm: 10, maxCompanies: 1 })).toThrow()
  })
})
