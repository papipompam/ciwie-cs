import { describe, expect, it } from 'vitest'
import { neutralizeSpreadsheetFormula } from '../../server/domain/csv'
import { createCsv, hashNormalizedRows, normalizeStudentCode } from '../../server/services/import-export-service'
import { normalizeExportFilters } from '../../server/services/export-service'

describe('import and export safety', () => {
  it('normalizes student codes at the boundary', () => {
    expect(normalizeStudentCode('  abc 12 ')).toBe('ABC12')
  })

  it('neutralizes spreadsheet formulas and emits UTF-8 BOM', () => {
    expect(neutralizeSpreadsheetFormula(' =SUM(A1:A2)')).toBe("' =SUM(A1:A2)")
    const csv = createCsv(['name'], [['=cmd']])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain("'=cmd")
  })

  it('retains supported export filters and drops table pagination controls', () => {
    expect(normalizeExportFilters('INTERNSHIP', { search: ' ACME ', status: 'ACTIVE', page: 3, pageSize: 20, sort: 'createdAt', order: 'desc' }))
      .toEqual({ search: 'ACME', status: 'ACTIVE' })
  })

  it('rejects filters that would otherwise be silently ignored', () => {
    expect(() => normalizeExportFilters('EXPENSE', { hiddenField: 'value' })).toThrow('Unsupported export filters')
  })

  it('hashes preview rows independently of JSON object key order', () => {
    expect(hashNormalizedRows([{ studentCode: '6501', firstNameTh: 'เอ' }]))
      .toBe(hashNormalizedRows([{ firstNameTh: 'เอ', studentCode: '6501' }]))
  })
})
