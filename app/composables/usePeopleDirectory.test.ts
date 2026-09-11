import { describe, expect, it } from 'vitest'
import { replacePeopleByType, type PersonRecord } from './usePeopleDirectory'

const person = (id: string, type: 'student' | 'lecturer'): PersonRecord => ({
  id,
  type,
  prefix: type === 'student' ? 'นาย' : 'อาจารย์',
  firstName: id,
  lastName: 'ทดสอบ',
  recordStatus: 'active',
  accountStatus: 'active',
  activities: [],
})

describe('people directory persistence', () => {
  it('removes local records when the persisted response is empty', () => {
    expect(replacePeopleByType([person('S1', 'student'), person('L1', 'lecturer')], 'student', []))
      .toEqual([person('L1', 'lecturer')])
  })
})
