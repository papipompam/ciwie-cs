import { describe, expect, it } from 'vitest'
import { compareStudentDirectoryPeople, getDefaultStudentCohort, getStudentAcademicYear, isStudentVisibleForCoopSemester } from './useStudentCohortContext'

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

describe('student directory academic year', () => {
  it('reads the academic year from a coop cycle label', () => {
    expect(getStudentAcademicYear('ภาคเรียนที่ 2/2569')).toBe('2569')
    expect(getStudentAcademicYear('ภาคฤดูร้อน/2570')).toBe('2570')
  })

  it('returns no year when the student has no coop cycle', () => {
    expect(getStudentAcademicYear()).toBeUndefined()
  })
})

describe('student directory ordering', () => {
  it('orders numbered sections before the next section, then sorts by student ID', () => {
    const sectionTwo = { id: '66123456700', firstName: 'ก้อง', lastName: 'ใจดี', section: 'หมู่ 2' }
    const sectionOne = { id: '66123456799', firstName: 'สมชาย', lastName: 'ใจดี', section: 'หมู่ 1' }
    const anotherSectionOne = { id: '66123456701', firstName: 'กมล', lastName: 'ดีมาก', section: 'หมู่ 1' }

    expect([sectionTwo, sectionOne, anotherSectionOne].sort(compareStudentDirectoryPeople))
      .toEqual([anotherSectionOne, sectionOne, sectionTwo])
  })

  it('puts students without a section after numbered sections', () => {
    const unknownSection = { firstName: 'ก้อง', lastName: 'ใจดี' }
    const sectionTwo = { firstName: 'สมชาย', lastName: 'ใจดี', section: 'หมู่ 2' }

    expect([unknownSection, sectionTwo].sort(compareStudentDirectoryPeople)).toEqual([sectionTwo, unknownSection])
  })
})

describe('student directory default cohort', () => {
  it('chooses the latest cohort that belongs to the current semester', () => {
    expect(getDefaultStudentCohort([
      { id: '67123456703', cycle: 'ภาคเรียนที่ 1/2570' },
      { id: '66123456701', cycle: 'ภาคเรียนที่ 2/2569' },
    ])).toBe('2566')
  })

  it('returns all when there are no students in the current semester', () => {
    expect(getDefaultStudentCohort([{ id: '67123456703', cycle: 'ภาคเรียนที่ 1/2570' }])).toBe('all')
  })
})
