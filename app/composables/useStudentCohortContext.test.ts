import { describe, expect, it } from 'vitest'
import { compareStudentDirectoryPeople, isStudentVisibleForCoopSemester } from './useStudentCohortContext'

describe('student directory cycle visibility', () => {
  it('keeps imported students visible before they are assigned to a coop cycle', () => {
    expect(isStudentVisibleForCoopSemester()).toBe(true)
  })

  it('keeps students in the selectable semester visible', () => {
    expect(isStudentVisibleForCoopSemester('ภาคเรียนที่ 2/2569')).toBe(true)
  })

  it('hides students from another semester', () => {
    expect(isStudentVisibleForCoopSemester('ภาคเรียนที่ 1/2569')).toBe(false)
  })
})

describe('student directory ordering', () => {
  it('orders numbered sections before the next section, then sorts by name', () => {
    const sectionTwo = { firstName: 'ก้อง', lastName: 'ใจดี', section: 'หมู่ 2' }
    const sectionOne = { firstName: 'สมชาย', lastName: 'ใจดี', section: 'หมู่ 1' }
    const anotherSectionOne = { firstName: 'กมล', lastName: 'ดีมาก', section: 'หมู่ 1' }

    expect([sectionTwo, sectionOne, anotherSectionOne].sort(compareStudentDirectoryPeople))
      .toEqual([anotherSectionOne, sectionOne, sectionTwo])
  })

  it('puts students without a section after numbered sections', () => {
    const unknownSection = { firstName: 'ก้อง', lastName: 'ใจดี' }
    const sectionTwo = { firstName: 'สมชาย', lastName: 'ใจดี', section: 'หมู่ 2' }

    expect([unknownSection, sectionTwo].sort(compareStudentDirectoryPeople)).toEqual([sectionTwo, unknownSection])
  })
})
