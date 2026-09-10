import { describe, expect, it } from 'vitest'
import { isStudentVisibleForCoopSemester } from './useStudentCohortContext'

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
