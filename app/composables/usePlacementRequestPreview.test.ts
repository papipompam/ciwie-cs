import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { usePlacementRequestPreview } from './usePlacementRequestPreview'

describe('placement document request synchronization', () => {
  const currentAccount = ref({ role: 'student', username: '66123456701', name: 'นายธนกฤต พูนทรัพย์' })

  beforeEach(() => {
    const state = new Map<string, ReturnType<typeof ref>>()
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
    vi.stubGlobal('useAuthPrototype', () => ({ currentAccount }))
    vi.stubGlobal('useCoopCycles', () => ({ selectedCycle: ref({ id: 'CYCLE-2569-2' }) }))
    currentAccount.value = { role: 'student', username: '66123456701', name: 'นายธนกฤต พูนทรัพย์' }
  })

  afterEach(() => vi.unstubAllGlobals())

  const source = {
    id: 'REQ-NEW-001',
    cycleId: 'CYCLE-2569-2',
    studentId: '66123456701',
    studentName: 'นายธนกฤต พูนทรัพย์',
    companyName: 'บริษัท ทดสอบ จำกัด',
    companyLocation: 'บุรีรัมย์',
    province: 'บุรีรัมย์',
    position: 'นักพัฒนาระบบ',
    recipientName: 'ผู้จัดการฝ่ายบุคคล',
    letterAddress: 'บริษัท ทดสอบ จำกัด จังหวัดบุรีรัมย์',
    appliedAt: '2026-09-08',
  }

  it('makes a submitted placement request available to the shared document workflow', () => {
    const store = usePlacementRequestPreview()
    const synced = store.syncPlacementRequest(source)

    expect(synced).toMatchObject({ id: source.id, status: 'submitted', cycleId: source.cycleId })
    expect(store.requests.value.find(request => request.id === source.id)?.application).toMatchObject({
      studentId: source.studentId,
      companyName: source.companyName,
      position: source.position,
    })
  })

  it('does not allow another role to synchronize a student request', () => {
    currentAccount.value = { role: 'staff', username: 'staff001', name: 'เจ้าหน้าที่' }
    const store = usePlacementRequestPreview()

    expect(() => store.syncPlacementRequest(source)).toThrow('ไม่มีสิทธิ์ดำเนินการ')
  })
})
