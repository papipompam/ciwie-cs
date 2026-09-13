import {
  canCreateStudentApplication,
  type CreateStudentApplicationInput,
  type StudentApplicationRecord,
  studentApplicationStatusGroupMeta,
  studentApplicationStatusGroupOptions,
  type StudentApplicationStatusGroup,
  type TrackedApplicationStatus,
} from '#shared/student-applications'
import { requestAwareFetch } from '../utils/requestAwareFetch'

export { canCreateStudentApplication, createStudentApplicationSchema } from '#shared/student-applications'
export {
  getStudentApplicationStatusGroup,
  studentApplicationStatusGroupMeta,
  studentApplicationStatusGroupOptions,
} from '#shared/student-applications'
export type { StudentApplicationStatusGroup, TrackedApplicationStatus } from '#shared/student-applications'

export type StudentApplication = StudentApplicationRecord

export const getLatestStudentApplication = <T extends Pick<StudentApplicationRecord, 'appliedAt' | 'updatedAt'>>(
  items: T[],
) => items.toSorted((a, b) => {
  const appliedComparison = b.appliedAt.localeCompare(a.appliedAt)
  return appliedComparison || b.updatedAt.localeCompare(a.updatedAt)
})[0] ?? null

export interface StudentApplicationFormValue {
  companyName: string
  position: string
  companyLocation: string
  recipientName: string
  letterAddress: string
  latitude: number | null
  longitude: number | null
  province: string
  appliedAt: string
  status: TrackedApplicationStatus
}

type ApplicationBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'interview'

export const trackedApplicationStatusMeta: Record<TrackedApplicationStatus, { label: string, tone: ApplicationBadgeTone }> = {
  submitted: { label: 'รอดำเนินการ', tone: 'neutral' },
  'waiting-response': { label: 'รอการตอบกลับ', tone: 'warning' },
  responded: { label: 'บริษัทตอบกลับแล้ว', tone: 'info' },
  'waiting-interview': { label: 'รอสัมภาษณ์', tone: 'interview' },
  accepted: { label: 'สถานประกอบการตอบรับแล้ว', tone: 'success' },
  rejected: { label: 'ปฏิเสธ', tone: 'danger' },
  completed: { label: 'ยืนยันเลือกที่ฝึกงานแล้ว', tone: 'success' },
  cancelled: { label: 'ยกเลิก', tone: 'neutral' },
}

export const trackedApplicationStatusOptions = Object.entries(trackedApplicationStatusMeta).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

export const applicationStatusGroupMeta: Record<StudentApplicationStatusGroup, { label: string, tone: ApplicationBadgeTone }> = {
  pending: { ...studentApplicationStatusGroupMeta.pending, tone: 'warning' },
  confirmed: { ...studentApplicationStatusGroupMeta.confirmed, tone: 'success' },
  rejected: { ...studentApplicationStatusGroupMeta.rejected, tone: 'danger' },
}

export const applicationStatusGroupOptions = studentApplicationStatusGroupOptions

export const useStudentApplications = () => {
  const { currentAccount } = useAuthPrototype()
  const currentStudentId = computed(() => currentAccount.value?.role === 'student' ? currentAccount.value.username : '')
  const applications = useState<StudentApplication[]>('student-applications', () => [])
  const currentStudentApplications = computed(() => applications.value.filter(application => application.studentId === currentStudentId.value))
  const latestApplication = computed(() => getLatestStudentApplication(currentStudentApplications.value))
  const canCreateApplication = computed(() => canCreateStudentApplication(currentStudentApplications.value))
  const getStudentApplications = (studentId: string) => applications.value.filter(application => application.studentId === studentId)

  const addApplication = async (value: CreateStudentApplicationInput) => {
    if (!canCreateApplication.value) throw new Error('student-application-already-active')
    const application = await requestAwareFetch<StudentApplication>('/api/student/applications', { method: 'POST', body: value })
    applications.value.unshift(application)
    return application
  }

  const updateApplication = async (id: string, value: StudentApplicationFormValue) => {
    const application = applications.value.find(item => item.id === id)
    if (!application) throw new Error('student-application-not-found')
    const updatedApplication = await requestAwareFetch<StudentApplication>(`/api/student/applications/${id}`, { method: 'PATCH', body: value })
    Object.assign(application, updatedApplication)
    return application
  }

  const updateApplicationStatus = async (id: string, status: TrackedApplicationStatus) => {
    const application = applications.value.find(item => item.id === id)
    if (!application) throw new Error('student-application-not-found')
    const updatedApplication = await requestAwareFetch<StudentApplication>(`/api/student/applications/${id}`, { method: 'PATCH', body: { status } })
    Object.assign(application, updatedApplication)
    return application
  }

  const deleteApplication = async (id: string) => {
    const index = applications.value.findIndex(item => item.id === id)
    if (index < 0) throw new Error('student-application-not-found')
    if (applications.value[index]?.status !== 'rejected') throw new Error('student-application-cannot-delete-active')
    await requestAwareFetch(`/api/student/applications/${id}`, { method: 'DELETE' })
    applications.value.splice(index, 1)
  }

  return {
    applications,
    currentStudentApplications,
    latestApplication,
    canCreateApplication,
    getStudentApplications,
    addApplication,
    updateApplication,
    updateApplicationStatus,
    deleteApplication,
  }
}
