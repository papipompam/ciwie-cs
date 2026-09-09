import { createStudentApplicationSchema, studentApplicationFormSchema } from '#shared/student-applications'
import type { StudentApplicationRecord } from '#shared/student-applications'
import { canTransitionRequest, pdfMetadataSchema, returnReasonSchema } from '#shared/placement-requests'
import type { PlacementRequestPreview, RequestDocument } from '#shared/placement-requests'

const previewRequestsSeed: PlacementRequestPreview[] = [
  {
    id: 'REQ-0269-018', cycleId: 'CYCLE-2569-2', studentName: 'นายธนกฤต พูนทรัพย์', status: 'letter-issued',
    submittedAt: '2026-08-18T09:30:00+07:00', updatedAt: '2026-08-28T09:30:00+07:00',
    letter: { name: 'หนังสือขอความอนุเคราะห์-REQ-0269-018.pdf', dataUrl: '/api/mock-documents/หนังสือขอความอนุเคราะห์-REQ-0269-018.pdf' },
    application: { id: 'APP-PREVIEW-001', studentId: '66123456701', companyName: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด', position: 'นักพัฒนาเว็บไซต์', companyLocation: '88 ถนนจิระ ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000', recipientName: 'ผู้จัดการฝ่ายทรัพยากรบุคคล', letterAddress: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด 88 ถนนจิระ ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000', latitude: 14.993, longitude: 103.102, province: 'บุรีรัมย์', appliedAt: '2026-08-24', status: 'completed', updatedAt: '2026-08-28T09:30:00+07:00' },
  },
  {
    id: 'PREVIEW-002', cycleId: 'CYCLE-2569-2', studentName: 'นางสาวภัทรวดี คำแสน', status: 'submitted',
    submittedAt: '2026-08-30T10:00:00+07:00', updatedAt: '2026-08-30T10:00:00+07:00',
    application: { id: 'APP-PREVIEW-002', studentId: '66123456704', companyName: 'บริษัท บุรีรัมย์เว็บ จำกัด', position: 'Web Developer', companyLocation: '125 ถนนจิระ ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000', recipientName: 'กรรมการผู้จัดการ', letterAddress: 'บริษัท บุรีรัมย์เว็บ จำกัด จังหวัดบุรีรัมย์', latitude: 14.999, longitude: 103.108, province: 'บุรีรัมย์', appliedAt: '2026-08-26', status: 'completed', updatedAt: '2026-08-30T10:00:00+07:00' },
  },
]

interface PlacementDocumentSource {
  id: string
  cycleId: string
  studentId: string
  studentName: string
  companyName: string
  companyLocation: string
  province: string
  position: string
  recipientName: string
  letterAddress: string
  appliedAt: string
}

// UI prototype only: serializable state survives role switches, not browser reloads.
export const usePlacementRequestPreview = () => {
  const requests = useState<PlacementRequestPreview[]>('placement-request-preview', () => structuredClone(previewRequestsSeed))
  const { currentAccount } = useAuthPrototype()
  const { selectedCycle } = useCoopCycles()
  const requireRole = (role: 'staff' | 'student') => {
    if (currentAccount.value?.role !== role) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
  }
  const submit = (application: StudentApplicationRecord) => {
    requireRole('student')
    if (application.studentId !== currentAccount.value?.username || application.status !== 'completed') throw new Error('กรุณายืนยันเลือกที่ฝึกงานก่อน')
    createStudentApplicationSchema.parse(application)
    if (requests.value.some(item => item.application.id === application.id)) throw new Error('ส่งคำร้องนี้แล้ว')
    const now = new Date().toISOString()
    if (!application.placementRequestId) throw new Error('ระบบยังไม่ได้สร้างเลขคำร้อง กรุณาโหลดข้อมูลใหม่')
    requests.value.unshift({ id: application.placementRequestId, cycleId: selectedCycle.value.id, application: { ...application }, studentName: currentAccount.value.name, status: 'submitted', submittedAt: now, updatedAt: now })
  }
  const selectAndSubmit = async (
    application: StudentApplicationRecord,
    updateStatus: (id: string, status: 'accepted' | 'completed') => Promise<StudentApplicationRecord>,
  ) => {
    requireRole('student')
    if (application.studentId !== currentAccount.value?.username) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
    if (['rejected', 'cancelled'].includes(application.status)) throw new Error('รายการนี้สิ้นสุดแล้ว')
    studentApplicationFormSchema.parse(application)
    if (!['accepted', 'completed'].includes(application.status)) throw new Error('รอสถานประกอบการตอบรับก่อนยืนยัน')
    if (requests.value.some(item => item.application.id === application.id)) return
    let selected = application
    if (selected.status !== 'completed') selected = await updateStatus(selected.id, 'completed')
    submit(selected)
  }
  const syncPlacementRequest = (source: PlacementDocumentSource) => {
    requireRole('student')
    if (source.studentId !== currentAccount.value?.username) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
    const now = new Date().toISOString()
    const application: StudentApplicationRecord = {
      id: source.id,
      studentId: source.studentId,
      companyName: source.companyName,
      position: source.position,
      companyLocation: source.companyLocation,
      recipientName: source.recipientName,
      letterAddress: source.letterAddress,
      province: source.province,
      appliedAt: source.appliedAt,
      status: 'completed',
      updatedAt: now,
    }
    const existing = requests.value.find(item => item.id === source.id)
    if (existing) {
      if (!['submitted', 'returned'].includes(existing.status)) return existing
      Object.assign(existing, {
        cycleId: source.cycleId,
        studentName: source.studentName,
        application,
        status: 'submitted' as const,
        returnReason: undefined,
        updatedAt: now,
      })
      return existing
    }
    const request: PlacementRequestPreview = {
      id: source.id,
      cycleId: source.cycleId,
      studentName: source.studentName,
      application,
      status: 'submitted',
      submittedAt: now,
      updatedAt: now,
    }
    requests.value.unshift(request)
    return request
  }
  const cancelPlacementRequest = (id: string) => {
    requireRole('student')
    const request = requests.value.find(item => item.id === id)
    if (!request) return
    if (request.application.studentId !== currentAccount.value?.username) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
    if (!['submitted', 'returned'].includes(request.status)) throw new Error('คำร้องอยู่ระหว่างจัดทำเอกสารและยกเลิกไม่ได้')
    request.status = 'cancelled'
    request.returnReason = undefined
    request.updatedAt = new Date().toISOString()
  }
  const attach = async (id: string, file: File, kind: 'letter' | 'signedDocument') => {
    const role = kind === 'letter' ? 'staff' : 'student'
    requireRole(role)
    const request = requests.value.find(item => item.id === id)
    const action = kind === 'letter' ? 'issue' : 'upload'
    if (!request || !canTransitionRequest(request.status, action)) throw new Error('สถานะคำร้องเปลี่ยนแล้ว กรุณาตรวจสอบอีกครั้ง')
    if (role === 'student' && request.application.studentId !== currentAccount.value?.username) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
    const parsed = pdfMetadataSchema.safeParse({ name: file.name, size: file.size })
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message)
    requireRole(role)
    if (role === 'student' && request.application.studentId !== currentAccount.value?.username) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
    if (!canTransitionRequest(request.status, action)) throw new Error('สถานะคำร้องเปลี่ยนแล้ว')
    const body = new FormData()
    body.set('kind', kind === 'letter' ? 'outgoing' : 'company-response')
    body.set('file', file)
    const document = await $fetch<RequestDocument>(`/api/placement-requests/${id}/documents`, { method: 'POST', body })
    request[kind] = document
    request.status = kind === 'letter' ? 'letter-issued' : 'signed-uploaded'
    request.returnReason = undefined
    request.updatedAt = new Date().toISOString()
    useStudentPlacements().syncDocumentStatus(id, kind === 'letter' ? 'letter-issued' : 'response-uploaded')
  }
  const review = async (id: string, outcome: 'return' | 'confirm', reason: string) => {
    requireRole('staff')
    const request = requests.value.find(item => item.id === id)
    if (!request || !request.signedDocument || !canTransitionRequest(request.status, outcome)) throw new Error('ยังไม่มีเอกสารลงนามให้ตรวจสอบ')
    if (outcome === 'confirm') {
      if (!request.cycleId) throw new Error('คำร้องเดิมไม่มีรอบสหกิจศึกษา กรุณาส่งคำร้องใหม่')
    }
    const returnReason = outcome === 'return' ? returnReasonSchema.parse(reason) : undefined
    await $fetch(`/api/placement-requests/${id}/review`, { method: 'PATCH', body: { outcome, reason: returnReason ?? '' } })
    if (outcome === 'confirm') useSupervisionGroups().registerConfirmedPlacement(request, request.cycleId!)
    request.returnReason = returnReason
    request.status = outcome === 'return' ? 'returned' : 'confirmed'
    request.updatedAt = new Date().toISOString()
    useStudentPlacements().syncDocumentStatus(id, outcome === 'return' ? 'response-returned' : 'confirmed', request.returnReason)
  }
  return { requests, submit, selectAndSubmit, syncPlacementRequest, cancelPlacementRequest, attach, review }
}
