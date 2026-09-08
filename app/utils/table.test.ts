import { describe, expect, it } from 'vitest'
import { getPageCount, paginateItems } from './table'

describe('table pagination', () => {
  const rows = Array.from({ length: 14 }, (_, index) => index + 1)

  it('calculates at least one page', () => {
    expect(getPageCount(0, 10)).toBe(1)
    expect(getPageCount(14, 10)).toBe(2)
  })

  it('returns the requested page', () => {
    expect(paginateItems(rows, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(paginateItems(rows, 2, 10)).toEqual([11, 12, 13, 14])
  })

  it('clamps pages outside the valid range', () => {
    expect(paginateItems(rows, 99, 10)).toEqual([11, 12, 13, 14])
    expect(paginateItems(rows, 0, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })
})
