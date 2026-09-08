import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { useStudentPlacements } from './useStudentPlacements'

describe('student placement document lifecycle', () => {
  const cancelPlacementRequest = vi.fn()
  const currentAccount = ref<{ role: 'student' | 'staff', username: string, name: string }>({ role: 'student', username: '66123456701', name: 'นายธนกฤต พูนทรัพย์' })

  beforeEach(() => {
    const state = new Map<string, ReturnType<typeof ref>>()
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useCoopCycles', () => ({ selectedCycle: ref({ id: 'CYCLE-2569-2', status: 'open' }) }))
    currentAccount.value = { role: 'student', username: '66123456701', name: 'นายธนกฤต พูนทรัพย์' }
    vi.stubGlobal('useAuthPrototype', () => ({ currentAccount }))
    vi.stubGlobal('usePlacementRequestPreview', () => ({ cancelPlacementRequest }))
    cancelPlacementRequest.mockReset()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('reflects response upload and staff confirmation in the main placement status', () => {
    const store = useStudentPlacements()

    store.syncDocumentStatus('REQ-0269-018', 'response-uploaded')
    expect(store.findRequest('REQ-0269-018')?.status).toBe('response-uploaded')

    currentAccount.value = { role: 'staff', username: 'staff001', name: 'เจ้าหน้าที่' }
    store.syncDocumentStatus('REQ-0269-018', 'confirmed')
    currentAccount.value = { role: 'student', username: '66123456701', name: 'นายธนกฤต พูนทรัพย์' }
    expect(store.confirmedRequest.value?.id).toBe('REQ-0269-018')
    expect(store.confirmedCompany.value?.id).toBe('COM-001')
    expect(store.confirmedRequest.value?.workStatus).toBe('not_started')
  })

  it('enforces document roles and status transitions at the mutation boundary', () => {
    const store = useStudentPlacements()

    currentAccount.value = { role: 'student', username: '66123456799', name: 'นักศึกษาคนอื่น' }
    expect(() => store.syncDocumentStatus('REQ-0269-018', 'response-uploaded')).toThrow('ไม่มีสิทธิ์อัปเดตคำร้องของนักศึกษาคนอื่น')
    currentAccount.value = { role: 'student', username: '66123456701', name: 'นายธนกฤต พูนทรัพย์' }
    expect(() => store.syncDocumentStatus('REQ-0269-018', 'confirmed')).toThrow('ไม่มีสิทธิ์อัปเดตสถานะเอกสาร')
    currentAccount.value = { role: 'staff', username: 'staff001', name: 'เจ้าหน้าที่' }
    expect(() => store.syncDocumentStatus('REQ-0269-018', 'confirmed')).toThrow('สถานะคำร้องไม่รองรับการดำเนินการนี้')
  })

  it('does not expose or count another student\'s placement request', () => {
    const store = useStudentPlacements()
    store.requests.value.push({
      ...store.requests.value[0]!,
      id: 'REQ-OTHER',
      studentId: '66123456799',
      status: 'submitted',
    })

    expect(store.findRequest('REQ-OTHER')).toBeUndefined()
    expect(store.cycleRequests.value.some(request => request.id === 'REQ-OTHER')).toBe(false)
  })

  it('cancels the linked document request before cancelling the placement request', () => {
    const store = useStudentPlacements()
    const request = store.findRequest('REQ-0269-018')!
    request.status = 'submitted'

    expect(store.cancelRequest(request.id)).toBe(true)
    expect(cancelPlacementRequest).toHaveBeenCalledWith(request.id)
    expect(request.status).toBe('cancelled')
  })
})
