import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { canTransitionRequest, pdfMetadataSchema, returnReasonSchema } from '../shared/placement-requests'
import { canCreateStudentApplication, type StudentApplicationRecord } from '../shared/student-applications'
import { usePlacementRequestPreview } from '../app/composables/usePlacementRequestPreview'

const account = ref({ role: 'student', username: '66123456701', name: 'นักศึกษาทดสอบ' })
const application: StudentApplicationRecord = { id: 'APP-test', studentId: '66123456701', companyName: 'บริษัททดสอบ', position: 'นักพัฒนา', companyLocation: 'บุรีรัมย์', recipientName: 'ฝ่ายบุคคล', letterAddress: 'กรุงเทพฯ', latitude: 15, longitude: 103, province: 'บุรีรัมย์', appliedAt: '2026-09-04', updatedAt: '2026-09-04T00:00:00Z', status: 'completed' }
beforeEach(() => {
  const state = ref([])
  account.value = { role: 'student', username: '66123456701', name: 'นักศึกษาทดสอบ' }
  vi.stubGlobal('useState', () => state)
  vi.stubGlobal('useAuthPrototype', () => ({ currentAccount: account }))
  vi.stubGlobal('useCoopCycles', () => ({ selectedCycle: ref({ id: 'CYCLE-2569-2' }) }))
  vi.stubGlobal('useSupervisionGroups', () => ({ registerConfirmedPlacement: vi.fn() }))
  vi.stubGlobal('useStudentPlacements', () => ({ syncDocumentStatus: vi.fn() }))
})
afterEach(() => vi.unstubAllGlobals())

describe('request preview guards', () => {
  it('combines company acceptance, selection and request submission', async () => {
    const store = usePlacementRequestPreview()
    const source = { ...application, status: 'submitted' as StudentApplicationRecord['status'] }
    const update = vi.fn(async (_id: string, status: 'accepted' | 'completed') => {
      source.status = status
      return source
    })
    await store.selectAndSubmit(source, update)
    expect(update.mock.calls.map(call => call[1])).toEqual(['accepted', 'completed'])
    expect(store.requests.value[0]?.status).toBe('submitted')
    await store.selectAndSubmit(source, update)
    expect(update).toHaveBeenCalledTimes(2)
    expect(store.requests.value).toHaveLength(1)
  })
  it('resumes after partial failure without submitting early or repeating acceptance', async () => {
    const store = usePlacementRequestPreview()
    const source = { ...application, status: 'submitted' as StudentApplicationRecord['status'] }
    const update = vi.fn(async (_id: string, status: 'accepted' | 'completed') => {
      if (status === 'completed') throw new Error('network')
      source.status = status
      return source
    })
    await expect(store.selectAndSubmit(source, update)).rejects.toThrow('network')
    expect(store.requests.value).toHaveLength(0)
    expect(source.status).toBe('accepted')
    const retry = vi.fn(async (_id: string, status: 'accepted' | 'completed') => ({ ...source, status }))
    await store.selectAndSubmit(source, retry)
    expect(retry.mock.calls.map(call => call[1])).toEqual(['completed'])
    expect(store.requests.value).toHaveLength(1)
  })
  it('validates before changing application status and never reopens closed applications', async () => {
    const store = usePlacementRequestPreview()
    const update = vi.fn()
    await expect(store.selectAndSubmit({ ...application, recipientName: '' }, update)).rejects.toThrow()
    for (const status of ['rejected', 'cancelled'] as const) await expect(store.selectAndSubmit({ ...application, status }, update)).rejects.toThrow()
    expect(update).not.toHaveBeenCalled()
  })
  it('requires selected company, ownership and complete letter details', () => {
    const store = usePlacementRequestPreview()
    expect(() => store.submit({ ...application, status: 'accepted' })).toThrow()
    expect(() => store.submit({ ...application, studentId: 'other' })).toThrow()
    expect(() => store.submit({ ...application, recipientName: '' })).toThrow()
    expect(store.requests.value).toHaveLength(0)
  })
  it('snapshots selected company and prevents duplicate requests', () => {
    const store = usePlacementRequestPreview()
    const source = { ...application }
    store.submit(source)
    source.letterAddress = 'changed'
    expect(store.requests.value[0]?.application.letterAddress).toBe('กรุงเทพฯ')
    expect(() => store.submit(source)).toThrow()
    expect(store.requests.value).toHaveLength(1)
  })
  it('requires staff, signed document and reason for return; final review stays locked', () => {
    const store = usePlacementRequestPreview()
    store.submit(application)
    const request = store.requests.value[0]!
    expect(() => store.review(request.id, 'confirm', '')).toThrow()
    account.value.role = 'staff'
    expect(() => store.review(request.id, 'confirm', '')).toThrow()
    request.status = 'signed-uploaded'
    request.signedDocument = { name: 'signed.pdf', dataUrl: 'data:application/pdf;base64,dGVzdA==' }
    expect(() => store.review(request.id, 'return', ' ')).toThrow()
    store.review(request.id, 'return', ' เซ็นไม่ครบ ')
    expect(request.returnReason).toBe('เซ็นไม่ครบ')
    expect(canCreateStudentApplication([request.application])).toBe(false)
    request.status = 'signed-uploaded'
    store.review(request.id, 'confirm', '')
    expect(request.status).toBe('confirmed')
    expect(canCreateStudentApplication([request.application])).toBe(false)
    expect(() => store.review(request.id, 'return', 'แก้ไข')).toThrow()
  })
  it('validates PDF metadata and return reason', () => {
    expect(pdfMetadataSchema.safeParse({ name: 'document.PDF', size: 10 }).success).toBe(true)
    for (const value of [{ name: 'image.png', size: 10 }, { name: 'empty.pdf', size: 0 }, { name: 'big.pdf', size: 5242881 }]) expect(pdfMetadataSchema.safeParse(value).success).toBe(false)
    expect(returnReasonSchema.safeParse(' ').success).toBe(false)
  })
  it('allows only the next document actions', () => {
    expect(canTransitionRequest('submitted', 'issue')).toBe(true)
    expect(canTransitionRequest('submitted', 'upload')).toBe(false)
    expect(canTransitionRequest('letter-issued', 'upload')).toBe(true)
    expect(canTransitionRequest('returned', 'upload')).toBe(true)
    expect(canTransitionRequest('returned', 'confirm')).toBe(false)
    expect(canTransitionRequest('signed-uploaded', 'return')).toBe(true)
    expect(canTransitionRequest('confirmed', 'upload')).toBe(false)
  })
})
