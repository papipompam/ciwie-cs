import { studentApplicationFormSchema } from '#shared/student-applications'
import type { StudentApplicationRecord } from '#shared/student-applications'
import { pdfMetadataSchema, returnReasonSchema } from '#shared/placement-requests'
import type { PlacementRequestPreview } from '#shared/placement-requests'
import { requestAwareFetch } from '../utils/requestAwareFetch'

export const usePlacementRequestPreview = () => {
  const requests = useState<PlacementRequestPreview[]>('placement-request-preview', () => [])
  const { currentAccount } = useAuthPrototype()
  const setRequests = (items: PlacementRequestPreview[]) => { requests.value = items }
  const requireRole = (role: 'staff' | 'student') => {
    if (currentAccount.value?.role !== role) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
  }
  const selectAndSubmit = async (
    application: StudentApplicationRecord,
    updateStatus: (id: string, status: 'accepted' | 'completed') => Promise<StudentApplicationRecord>,
  ) => {
    requireRole('student')
    if (application.studentId !== currentAccount.value?.username) throw new Error('ไม่มีสิทธิ์ดำเนินการ')
    if (application.status === 'completed') return application
    studentApplicationFormSchema.parse(application)
    if (application.status !== 'accepted') throw new Error('รอสถานประกอบการตอบรับก่อนยืนยัน')
    return updateStatus(application.id, 'completed')
  }
  const attach = async (id: string, file: File, kind: 'letter' | 'signedDocument') => {
    requireRole(kind === 'letter' ? 'staff' : 'student')
    const parsed = pdfMetadataSchema.safeParse({ name: file.name, size: file.size })
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message)
    const body = new FormData()
    body.set('kind', kind === 'letter' ? 'outgoing' : 'company-response')
    body.set('file', file)
    await requestAwareFetch(`/api/placement-requests/${encodeURIComponent(id)}/documents`, { method: 'POST', body })
  }
  const review = async (id: string, outcome: 'return' | 'confirm', reason: string) => {
    requireRole('staff')
    const body = outcome === 'return' ? { outcome, reason: returnReasonSchema.parse(reason) } : { outcome }
    await requestAwareFetch(`/api/placement-requests/${encodeURIComponent(id)}/review`, { method: 'PATCH', body })
  }
  return { requests, setRequests, selectAndSubmit, attach, review }
}
