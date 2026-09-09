import { describe, expect, it } from 'vitest'
import { canCreateStudentApplication, createStudentApplicationSchema, type TrackedApplicationStatus } from '../../shared/student-applications'

const application = (status: TrackedApplicationStatus) => ({
  status,
  appliedAt: '2026-09-01',
  updatedAt: '2026-09-01T08:00:00.000Z',
})

describe('student company application limit', () => {
  it('allows the first application', () => {
    expect(canCreateStudentApplication([])).toBe(true)
  })

  it('allows a new company only after the previous company rejects the application', () => {
    expect(canCreateStudentApplication([application('rejected')])).toBe(true)
  })
  it.each(['submitted', 'waiting-response', 'responded', 'waiting-interview', 'accepted', 'completed', 'cancelled'] as const)(
    'blocks another company while an application is %s',
    status => expect(canCreateStudentApplication([application(status)])).toBe(false),
  )

  it('allows another company when every previous application was rejected', () => {
    expect(canCreateStudentApplication([application('rejected'), application('rejected')])).toBe(true)
  })

  it('does not allow a rejected latest record to hide an older active application', () => {
    expect(canCreateStudentApplication([application('rejected'), application('waiting-response')])).toBe(false)
  })
})

describe('company map coordinates', () => {
  const validInput = {
    companyName: 'บริษัทตัวอย่าง',
    position: 'นักพัฒนาเว็บไซต์',
    companyLocation: 'บุรีรัมย์',
    province: 'บุรีรัมย์',
    recipientName: 'ผู้จัดการฝ่ายทรัพยากรบุคคล',
    letterAddress: 'บริษัทตัวอย่าง บุรีรัมย์ 31000',
    latitude: 14.9941234,
    longitude: 103.1035678,
  }

  it('preserves latitude and longitude as numbers', () => {
    expect(createStudentApplicationSchema.parse(validInput)).toEqual(validInput)
  })

  it.each(['recipientName', 'letterAddress'] as const)('requires %s for letter preparation', (field) => {
    expect(createStudentApplicationSchema.safeParse({ ...validInput, [field]: '   ' }).success).toBe(false)
    expect(createStudentApplicationSchema.safeParse({ ...validInput, [field]: undefined }).success).toBe(false)
  })

  it('trims recipient and letter address without changing the company location', () => {
    const result = createStudentApplicationSchema.parse({ ...validInput, recipientName: '  ผู้จัดการ  ', letterAddress: '  สาขากรุงเทพ  ' })
    expect(result.recipientName).toBe('ผู้จัดการ')
    expect(result.letterAddress).toBe('สาขากรุงเทพ')
    expect(result.companyLocation).toBe(validInput.companyLocation)
  })

  it.each([
    { latitude: null, longitude: null },
    { latitude: undefined },
    { longitude: undefined },
    { latitude: 90.01 },
    { latitude: -90.01 },
    { longitude: 180.01 },
    { longitude: -180.01 },
    { latitude: Number.NaN },
    { longitude: Number.POSITIVE_INFINITY },
    { latitude: '14.99' },
  ])('rejects a missing or invalid pin: %j', (coordinates) => {
    expect(createStudentApplicationSchema.safeParse({ ...validInput, ...coordinates }).success).toBe(false)
  })

  it('accepts valid zero coordinates', () => {
    expect(createStudentApplicationSchema.safeParse({ ...validInput, latitude: 0, longitude: 0 }).success).toBe(true)
  })
})
