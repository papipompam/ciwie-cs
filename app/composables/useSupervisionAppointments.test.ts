import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useSupervisionAppointments } from './useSupervisionAppointments'

const appointment = {
  id: 'APPOINTMENT-1', cycleId: 'CYCLE-1', round: 1 as const, groupId: 'GROUP-1', companyId: 'SITE-1',
  studentIds: ['66123456701'], date: '2026-09-20', period: 'morning' as const,
  lecturerIds: ['lecturer-001'], status: 'published' as const,
  result: { summary: '', issues: '', suggestions: '', companyRequirements: '', actualLecturerIds: [], completedAt: null },
  createdAt: '2026-09-01T00:00:00.000Z',
}

describe('persisted supervision appointments', () => {
  beforeEach(() => {
    const state = new Map<string, ReturnType<typeof ref>>()
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
    vi.stubGlobal('useScenario', () => ({ recordEvent: vi.fn() }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('replaces one cycle and round with appointments returned by the API', async () => {
    const fetch = vi.fn(async () => ({ appointments: [appointment] }))
    vi.stubGlobal('$fetch', fetch)
    const store = useSupervisionAppointments()

    await store.loadPersistedAppointments('CYCLE-1', 1)

    expect(fetch).toHaveBeenCalledWith('/api/supervision/appointments', { query: { cycleId: 'CYCLE-1', round: 1 } })
    expect(store.appointments.value.filter(item => item.cycleId === 'CYCLE-1' && item.round === 1)).toEqual([appointment])
  })

  it('persists completion before updating the client state', async () => {
    const fetch = vi.fn(async (_url: string, options?: { method?: string }) => options?.method === 'PATCH'
      ? { completedAt: '2026-09-20T08:00:00.000Z' }
      : { appointments: [appointment] })
    vi.stubGlobal('$fetch', fetch)
    const store = useSupervisionAppointments()
    await store.loadPersistedAppointments('CYCLE-1', 1)

    const completed = await store.persistCompleteAppointment('APPOINTMENT-1', {
      summary: 'เรียบร้อย', issues: '', suggestions: '', companyRequirements: '', actualLecturerIds: ['lecturer-001'],
    })

    expect(fetch).toHaveBeenLastCalledWith('/api/supervision/appointments/APPOINTMENT-1', {
      method: 'PATCH',
      body: expect.objectContaining({ action: 'complete', actualLecturerIds: ['lecturer-001'] }),
    })
    expect(completed).toMatchObject({ status: 'completed', result: { completedAt: '2026-09-20T08:00:00.000Z' } })
  })
})
