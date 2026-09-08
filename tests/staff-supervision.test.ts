import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { useSupervisionGroups } from '../app/composables/useSupervisionGroups'
import { useLetterBatches } from '../app/composables/useLetterBatches'
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
  it('blocks non-staff mutations and legacy letter issuance', () => {
    const store = setup()
    account.value.role = 'lecturer'
    expect(() => store.createSuggestedGroups('C1', 1, [['CO1']])).toThrow()
    const letters = useLetterBatches()
    expect(letters.canIssueLetter.value).toBe(false)
    expect(() => letters.saveLetterBatch({ requestIds: [], letterDate: '2026-09-04', fileName: 'letter.pdf' })).toThrow('เฉพาะเจ้าหน้าที่')
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
})
