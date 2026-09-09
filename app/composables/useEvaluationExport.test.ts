import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useEvaluationExport } from './useEvaluationExport'
import type { StudentEvaluation } from './useSupervisionEvaluations'
import type { SupervisionAppointment } from './useSupervisionAppointments'

describe('useEvaluationExport', () => {
  const click = vi.fn()
  const createObjectURL = vi.fn(() => 'blob:evaluation-export')
  const currentAccount = ref({ id: 'lecturer-001', role: 'lecturer', name: 'อาจารย์ผู้นิเทศ' })
  const submitted = (appointmentId: string, lecturerId: string): StudentEvaluation => ({
    appointmentId,
    studentId: 'S1',
    lecturerId,
    status: 'submitted',
    submittedAt: '2026-09-04',
    ratings: { responsibility: '5', ethics: '5', communication: '5', knowledge: '5', work_quality: '5', problem_solving: '5' },
    strengths: '', issues: '', suggestions: '', followUp: '',
  })

  beforeEach(() => {
    click.mockClear()
    createObjectURL.mockClear()
    vi.stubGlobal('useAuthPrototype', () => ({ currentAccount }))
    vi.stubGlobal('useSupervisionEvaluations', () => ({
      studentEvaluations: ref([submitted('A1', 'L0012'), submitted('A1', 'L0030'), submitted('A2', 'L0012')]),
      companyEvaluations: ref([]),
    }))
    vi.stubGlobal('usePeopleDirectory', () => ({ people: ref([]) }))
    vi.stubGlobal('useSupervisionGroups', () => ({
      companyRecords: ref([]),
      placements: ref([{ studentId: 'S1', cycleId: 'C1', companyId: 'CO1', studentName: 'สมชาย ใจดี', position: 'Developer', company: 'บริษัท ตัวอย่าง จำกัด' }]),
    }))
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })
    vi.stubGlobal('document', { createElement: () => ({ href: '', download: '', click }) })
    vi.stubGlobal('$fetch', {
      raw: vi.fn(async () => ({
        _data: new TextEncoder().encode('csv').buffer,
        headers: new Headers({ 'content-disposition': 'attachment; filename="student-evaluation-scores.csv"', 'x-export-count': '1' }),
      })),
    })
  })

  it('downloads the server-scoped lecturer export', async () => {
    const appointments = [
      { id: 'A1', cycleId: 'C1', companyId: 'CO1', studentIds: ['S1'], lecturerIds: ['L0012'], result: { actualLecturerIds: ['L0012'] } },
      { id: 'A2', cycleId: 'C1', companyId: 'CO1', studentIds: ['S1'], lecturerIds: ['L0030'], result: { actualLecturerIds: ['L0030'] } },
    ] as SupervisionAppointment[]

    await expect(useEvaluationExport().exportStudentEvaluations(appointments, 'csv')).resolves.toBe(1)
    expect(click).toHaveBeenCalledOnce()
  })
})
