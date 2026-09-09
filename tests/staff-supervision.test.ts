import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { useSupervisionGroups } from '../app/composables/useSupervisionGroups'
import type { PlacementRequestPreview } from '../shared/placement-requests'

const account = ref({ role: 'staff', name: 'เจ้าหน้าที่ทดสอบ' })
const people = ref([{ id: 'L1', type: 'lecturer', recordStatus: 'active', accountStatus: 'active' }, { id: 'S1', type: 'student', recordStatus: 'active', accountStatus: 'active' }])
beforeEach(() => {
  const state = new Map<string, ReturnType<typeof ref>>()
  vi.stubGlobal('useState', (key: string, init: () => unknown) => {
    if (!state.has(key)) state.set(key, ref(init()))
    return state.get(key)
  })
  account.value.role = 'staff'
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useAuthPrototype', () => ({ currentAccount: account }))
  vi.stubGlobal('useScenario', () => ({ recordEvent: vi.fn() }))
  vi.stubGlobal('usePeopleDirectory', () => ({ people }))
  vi.stubGlobal('$fetch', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

describe('staff supervision workflow', () => {
  const setup = () => {
    const store = useSupervisionGroups()
    store.placements.value = []
    store.groups.value = []
    store.companyRecords.value = []
    store.placements.value.push({ id: 'P1', cycleId: 'C1', studentId: 'S1', studentName: 'Test', companyId: 'CO1', company: 'Company', branch: 'HQ', province: 'บุรีรัมย์', region: 'อีสาน', position: 'Dev' })
    return store
  }
  it('saves groups before assigning lecturers and prevents repeat assignment', () => {
    const store = setup()
    const [group] = store.createSuggestedGroups('C1', 1, [['CO1']])
    expect(group!.lecturerIds).toEqual([])
    store.assignLecturers(group!.id, ['L1'])
    expect(group!.lecturerIds).toEqual(['L1'])
    expect(() => store.assignLecturers(group!.id, ['S1'])).toThrow()
    expect(() => store.createSuggestedGroups('C1', 1, [['CO1']])).toThrow()
    expect(store.createSuggestedGroups('C1', 2, [['CO1']])).toHaveLength(1)
  })
  it('saves lecturer selections with suggested groups and rejects duplicate assignments atomically', () => {
    const store = setup()
    const [group] = store.createSuggestedGroups('C1', 1, [['CO1']], [['L1']])
    expect(group!.lecturerIds).toEqual(['L1'])

    store.groups.value = []
    store.placements.value.push({ id: 'P2', cycleId: 'C1', studentId: 'S2', studentName: 'Test 2', companyId: 'CO2', company: 'Company 2', branch: 'HQ', province: 'บุรีรัมย์', region: 'อีสาน', position: 'QA' })
    expect(() => store.createSuggestedGroups('C1', 1, [['CO1'], ['CO2']], [['L1'], ['L1']])).toThrow('อาจารย์ไม่พร้อมใช้งาน')
    expect(store.groups.value).toHaveLength(0)
  })
  it('validates the full proposed batch before saving anything', () => {
    const store = setup()
    expect(() => store.createSuggestedGroups('C1', 1, [['CO1'], ['unknown']])).toThrow()
    expect(store.groups.value).toHaveLength(0)
    expect(() => store.createSuggestedGroups('C1', 1, [['CO1'], ['CO1']])).toThrow()
    expect(store.groups.value).toHaveLength(0)
  })
  it('blocks non-staff grouping mutations', () => {
    const store = setup()
    account.value.role = 'lecturer'
    expect(() => store.createSuggestedGroups('C1', 1, [['CO1']])).toThrow()
  })
  it('registers the confirmed request coordinates and does not duplicate placements', () => {
    const store = useSupervisionGroups()
    store.placements.value = []
    store.groups.value = []
    store.companyRecords.value = []
    const request = { id: 'R1', studentName: 'Test', application: { studentId: 'S1', companyName: 'Company', companyLocation: 'Address', province: 'บุรีรัมย์', position: 'Dev', latitude: 15, longitude: 103 } } as PlacementRequestPreview
    store.registerConfirmedPlacement(request, 'C1')
    store.registerConfirmedPlacement(request, 'C1')
    expect(store.placements.value).toHaveLength(1)
    expect(store.getCompanies('C1')[0]).toMatchObject({ latitude: 15, longitude: 103, studentCount: 1 })
    expect(store.getCompanies('C2')).toHaveLength(0)
  })

  it('hydrates the grouping UI from persisted confirmed placements', async () => {
    vi.mocked($fetch).mockResolvedValueOnce({
      companies: [{
        id: 'SITE-1', cycleId: 'C1', name: 'Company', branch: 'สำนักงานใหญ่', province: 'บุรีรัมย์', region: 'ภาคตะวันออกเฉียงเหนือ',
        address: 'Address', contactName: 'HR', contactPhone: '-', status: 'active', latitude: 15, longitude: 103, studentCount: 1,
        students: [{ id: 'R1', studentId: 'S1', studentName: 'นาย Test Student', prefix: 'นาย', firstName: 'Test', lastName: 'Student', section: '1', position: 'Dev' }],
      }],
      groups: [{ id: 'G1', cycleId: 'C1', round: 1, name: 'กลุ่มนิเทศ 1', lecturerIds: [], companyIds: ['SITE-1'], createdAt: '2026-09-09T00:00:00.000Z' }],
      lecturers: [{ id: 'L1', name: 'อาจารย์ทดสอบ' }],
    })
    const store = useSupervisionGroups()
    await store.loadPersistedGroups('C1', 1)
    expect(store.groups.value.filter(group => group.cycleId === 'C1')).toHaveLength(1)
    expect(store.getCompanies('C1')[0]).toMatchObject({ id: 'SITE-1', studentCount: 1, latitude: 15 })
    expect(store.supervisionLecturers.value).toEqual([{ id: 'L1', name: 'อาจารย์ทดสอบ' }])
  })
})
