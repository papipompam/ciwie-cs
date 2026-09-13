import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const { requestAwareFetch } = vi.hoisted(() => ({ requestAwareFetch: vi.fn() }))
vi.mock('../utils/requestAwareFetch', () => ({ requestAwareFetch }))

const { companyEvaluationCriteria, useSupervisionEvaluations } = await import('./useSupervisionEvaluations')

describe('persisted company evaluation', () => {
  beforeEach(() => {
    const state = new Map<string, ReturnType<typeof ref>>()
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
    vi.stubGlobal('useScenario', () => ({ recordEvent: vi.fn() }))
    vi.stubGlobal('useAuthPrototype', () => ({ currentAccount: ref({ role: 'staff' }) }))
    requestAwareFetch.mockReset()
  })

  it('does not reload before it retrieves the saved company evaluation', async () => {
    requestAwareFetch.mockImplementation(async (request: string, options?: { body?: { recommendation?: string } }) => request.startsWith('/api/evaluations/companies/')
      ? (() => {
          if (options?.body?.recommendation === '') throw new Error('COMPANY_EVALUATION_INVALID')
          return { id: 'E1', status: 'draft', submittedAt: null }
        })()
      : {
          appointmentId: 'A1', studentEvaluations: [],
          companyEvaluation: {
            appointmentId: 'A1', evaluatorId: 'staff-1', status: 'draft', submittedAt: null,
            ratings: Object.fromEntries(companyEvaluationCriteria.map(criterion => [criterion.id, '4'])),
            recommendation: '', observations: '', companyRequirements: '', issues: '', suggestions: '',
          },
        })
    const store = useSupervisionEvaluations()
    await expect(store.persistCompanyEvaluation('A1', 'staff-1', {
      ratings: Object.fromEntries(companyEvaluationCriteria.map(criterion => [criterion.id, '4'])),
      recommendation: '', observations: '', companyRequirements: '', issues: '', suggestions: '',
    }, 'draft')).resolves.toMatchObject({ evaluatorId: 'staff-1', status: 'draft' })

    expect(requestAwareFetch.mock.calls[0]).toEqual([
      '/api/evaluations/companies/A1',
      expect.objectContaining({ method: 'PUT', reload: false, body: expect.not.objectContaining({ recommendation: '' }) }),
    ])
  })
})
