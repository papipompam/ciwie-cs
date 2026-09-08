import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { companyEvaluationCriteria, evaluationRatingOptions, studentEvaluationCriteria, useSupervisionEvaluations } from './useSupervisionEvaluations'

describe('evaluation form definitions', () => {
  it('uses the specified five-level rating descriptions', () => {
    expect(evaluationRatingOptions.map(option => option.value)).toEqual(['1', '2', '3', '4', '5'])
    expect(evaluationRatingOptions.map(option => option.label)).toEqual([
      '1 · น้อยที่สุด',
      '2 · น้อย',
      '3 · ปานกลาง',
      '4 · มาก',
      '5 · ดีมากที่สุด',
    ])
    expect(evaluationRatingOptions.map(option => option.shortLabel)).toEqual(['น้อยที่สุด', 'น้อย', 'ปานกลาง', 'มาก', 'ดีมากที่สุด'])
  })

  it('covers workplace conditions, welfare, transport, and nearby accommodation', () => {
    expect(companyEvaluationCriteria.map(criterion => criterion.id)).toEqual(expect.arrayContaining([
      'environment',
      'safety',
      'allowance',
      'transportation',
      'public_transport',
      'nearby_accommodation',
    ]))
  })
})

describe('company evaluation roles', () => {
  const account = ref<{ role: 'staff' | 'lecturer' | 'student' }>({ role: 'staff' })

  beforeEach(() => {
    const state = new Map<string, ReturnType<typeof ref>>()
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
    vi.stubGlobal('useScenario', () => ({ recordEvent: vi.fn() }))
    vi.stubGlobal('useAuthPrototype', () => ({ currentAccount: account }))
    account.value = { role: 'staff' }
  })

  afterEach(() => vi.unstubAllGlobals())

  const input = () => ({
    ratings: Object.fromEntries(companyEvaluationCriteria.map(criterion => [criterion.id, '4' as const])),
    recommendation: 'recommended' as const,
    observations: 'สภาพแวดล้อมเหมาะสม',
    companyRequirements: '',
    issues: '',
    suggestions: 'มีที่พักใกล้สถานประกอบการ',
  })

  const studentInput = () => ({
    ratings: Object.fromEntries(studentEvaluationCriteria.map(criterion => [criterion.id, '4' as const])),
    strengths: 'มีความรับผิดชอบ',
    issues: '',
    suggestions: '',
    followUp: '',
  })

  it('blocks staff from saving student evaluations', () => {
    const store = useSupervisionEvaluations()
    expect(() => store.saveStudentEvaluation('A1', 'student-1', 'staff-1', studentInput())).toThrow('ไม่มีสิทธิ์ประเมินนักศึกษา')
    expect(() => store.submitStudentEvaluation('A1', 'student-1', 'staff-1', studentInput())).toThrow('ไม่มีสิทธิ์ประเมินนักศึกษา')
  })

  it('allows lecturers to submit student evaluations', () => {
    account.value = { role: 'lecturer' }
    const store = useSupervisionEvaluations()
    expect(store.submitStudentEvaluation('A1', 'student-1', 'lecturer-1', studentInput())).toMatchObject({
      status: 'submitted',
      lecturerId: 'lecturer-1',
    })
  })

  it('allows lecturers to save and retrieve a student evaluation draft', () => {
    account.value = { role: 'lecturer' }
    const store = useSupervisionEvaluations()
    const saved = store.saveStudentEvaluation('A1', 'student-1', 'lecturer-1', studentInput())
    expect(saved).toMatchObject({
      status: 'draft',
      submittedAt: null,
    })
    saved.status = 'submitted'
    const retrieved = store.getStudentEvaluation('A1', 'student-1', 'lecturer-1')!
    retrieved.status = 'submitted'
    expect(store.getStudentEvaluation('A1', 'student-1', 'lecturer-1')).toMatchObject({ status: 'draft' })
  })

  it.each(['staff', 'lecturer'] as const)('allows %s to submit the shared company evaluation', (role) => {
    account.value = { role }
    const store = useSupervisionEvaluations()
    expect(store.submitCompanyEvaluation('A1', `${role}-1`, input())).toMatchObject({ status: 'submitted', evaluatorId: `${role}-1` })
  })

  it('blocks students and locks the evaluation after the first submission', () => {
    const store = useSupervisionEvaluations()
    store.submitCompanyEvaluation('A1', 'staff-1', input())
    account.value = { role: 'student' }
    expect(() => store.submitCompanyEvaluation('A2', 'student-1', input())).toThrow('ไม่มีสิทธิ์')
    account.value = { role: 'lecturer' }
    expect(() => store.submitCompanyEvaluation('A1', 'lecturer-1', input())).toThrow('evaluation-locked')
  })
})
