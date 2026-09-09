import { describe, expect, it } from 'vitest'
import { companySourceCode, provinceSourceCode } from './companySites'

describe('confirmed placement company identity', () => {
  it('normalizes equivalent names and addresses to one deterministic company code', () => {
    expect(companySourceCode(' บริษัท ทดสอบ จำกัด ', '88  ถนนจิระ', 'บุรีรัมย์'))
      .toBe(companySourceCode('บริษัท ทดสอบ จำกัด', '88 ถนนจิระ ', 'บุรีรัมย์'))
  })

  it('keeps different sites separate and produces database-safe codes', () => {
    const first = companySourceCode('บริษัท ทดสอบ จำกัด', '88 ถนนจิระ', 'บุรีรัมย์')
    const second = companySourceCode('บริษัท ทดสอบ จำกัด', '99 ถนนจิระ', 'บุรีรัมย์')
    expect(first).not.toBe(second)
    expect(first.length).toBeLessThanOrEqual(50)
    expect(provinceSourceCode('บุรีรัมย์')).toMatch(/^P-[a-f0-9]{8}$/)
  })
})
