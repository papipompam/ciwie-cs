import type { SupervisionRound } from './useSupervisionGroups'
import {
  supervisionAppointmentResponseSchema,
  supervisionAppointmentsResponseSchema,
} from '#shared/supervision-appointments'
import { requestAwareFetch } from '../utils/requestAwareFetch'

export type SupervisionPeriod = 'morning' | 'afternoon'
export type SupervisionAppointmentStatus = 'draft' | 'published' | 'postponed' | 'completed' | 'cancelled'

export interface SupervisionResult {
  summary: string
  issues: string
  suggestions: string
  companyRequirements: string
  actualLecturerIds: string[]
  completedAt: string | null
}

export interface SupervisionAppointment {
  id: string
  cycleId: string
  round: SupervisionRound
  groupId: string
  companyId: string
  studentIds: string[]
  date: string
  period: SupervisionPeriod
  lecturerIds: string[]
  splitReason?: string
  status: SupervisionAppointmentStatus
  result: SupervisionResult
  createdAt: string
  display?: {
    companyName: string
    branchName: string
    address: string
    province: string
    groupName: string
    lecturers: Array<{ id: string, name: string }>
    students: Array<{ id: string, name: string, position: string }>
  }
}

export interface SupervisionAppointmentInput {
  cycleId: string
  round: SupervisionRound
  groupId: string
  companyId: string
  studentIds: string[]
  date: string
  period: SupervisionPeriod
  lecturerIds: string[]
  splitReason?: string
}

export interface SupervisionResultInput {
  summary: string
  issues: string
  suggestions: string
  companyRequirements: string
  actualLecturerIds: string[]
}

const emptyResult = (): SupervisionResult => ({
  summary: '',
  issues: '',
  suggestions: '',
  companyRequirements: '',
  actualLecturerIds: [],
  completedAt: null,
})

export const supervisionPeriodMeta: Record<SupervisionPeriod, { label: string }> = {
  morning: { label: 'ช่วงเช้า' },
  afternoon: { label: 'ช่วงบ่าย' },
}

export const supervisionAppointmentStatusMeta: Record<SupervisionAppointmentStatus, { label: string, tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }> = {
  draft: { label: 'ฉบับร่าง', tone: 'neutral' },
  published: { label: 'รอการนิเทศ', tone: 'info' },
  postponed: { label: 'เลื่อนนัด', tone: 'warning' },
  completed: { label: 'นิเทศเสร็จแล้ว', tone: 'success' },
  cancelled: { label: 'ยกเลิก', tone: 'danger' },
}

export const useSupervisionAppointments = () => {
  const appointments = useState<SupervisionAppointment[]>('supervision-appointments-v2', () => [])
  const { recordEvent } = useScenario()

  const createAppointment = (input: SupervisionAppointmentInput) => {
    const nextNumber = Math.max(0, ...appointments.value.map(item => Number(item.id.replace('SA-', '')) || 0)) + 1
    const appointment: SupervisionAppointment = {
      ...input,
      id: `SA-${String(nextNumber).padStart(3, '0')}`,
      status: 'draft',
      result: emptyResult(),
      createdAt: new Date().toISOString(),
    }
    appointments.value.unshift(appointment)
    recordEvent(`สร้างนัดนิเทศ ${appointment.id}`)
    return appointment
  }

  const joinAppointment = (appointmentId: string, lecturerId: string) => {
    const appointment = appointments.value.find(item => item.id === appointmentId)
    if (!appointment) throw new Error('appointment-not-found')
    if (appointment.status === 'completed' || appointment.status === 'cancelled') throw new Error('appointment-locked')
    if (appointment.lecturerIds.includes(lecturerId)) return appointment

    appointment.lecturerIds.push(lecturerId)
    recordEvent(`เข้าร่วมนิเทศ ${appointment.id}`)
    return appointment
  }

  const leaveAppointment = (appointmentId: string, lecturerId: string) => {
    const appointment = appointments.value.find(item => item.id === appointmentId)
    if (!appointment) throw new Error('appointment-not-found')
    if (appointment.status === 'completed' || appointment.status === 'cancelled') throw new Error('appointment-locked')
    appointment.lecturerIds = appointment.lecturerIds.filter(id => id !== lecturerId)
    recordEvent(`ยกเลิกการเข้าร่วมนิเทศ ${appointment.id}`)
    return appointment
  }

  const updateAppointment = (appointmentId: string, input: Pick<SupervisionAppointmentInput, 'date' | 'period' | 'lecturerIds'>) => {
    const appointment = appointments.value.find(item => item.id === appointmentId)
    if (!appointment) throw new Error('appointment-not-found')
    if (appointment.status === 'completed' || appointment.status === 'cancelled') throw new Error('appointment-locked')
    if (!input.lecturerIds.length) throw new Error('lecturer-required')
    Object.assign(appointment, input)
    if (appointment.status === 'postponed') appointment.status = 'published'
    recordEvent(`แก้ไขตารางนิเทศ ${appointment.id}`)
    return appointment
  }

  const saveResult = (appointmentId: string, input: Omit<SupervisionResultInput, 'actualLecturerIds'>) => {
    const appointment = appointments.value.find(item => item.id === appointmentId)
    if (!appointment) throw new Error('appointment-not-found')
    if (appointment.status === 'cancelled') throw new Error('appointment-locked')
    Object.assign(appointment.result, input)
    recordEvent(`บันทึกผลนิเทศ ${appointment.id}`)
    return appointment
  }

  const completeAppointment = (appointmentId: string, input: SupervisionResultInput) => {
    const appointment = appointments.value.find(item => item.id === appointmentId)
    if (!appointment) throw new Error('appointment-not-found')
    if (!['published', 'postponed'].includes(appointment.status)) throw new Error('appointment-not-completable')
    if (!input.actualLecturerIds.length) throw new Error('actual-lecturer-required')
    if (input.actualLecturerIds.some(id => !appointment.lecturerIds.includes(id))) throw new Error('actual-lecturer-invalid')
    appointment.result = {
      ...input,
      summary: input.summary.trim(),
      issues: input.issues.trim(),
      suggestions: input.suggestions.trim(),
      companyRequirements: input.companyRequirements.trim(),
      actualLecturerIds: [...input.actualLecturerIds],
      completedAt: new Date().toISOString(),
    }
    appointment.status = 'completed'
    recordEvent(`ยืนยันนิเทศเสร็จแล้ว ${appointment.id}`)
    return appointment
  }

  const mergeAppointment = (appointment: SupervisionAppointment) => {
    const index = appointments.value.findIndex(item => item.id === appointment.id)
    if (index === -1) appointments.value.unshift(appointment)
    else appointments.value[index] = appointment
    return appointment
  }

  const loadPersistedAppointments = async (cycleId: string, round: SupervisionRound) => {
    const response = supervisionAppointmentsResponseSchema.parse(await requestAwareFetch('/api/supervision/appointments', {
      query: { cycleId, round },
    }))
    appointments.value = [
      ...appointments.value.filter(item => item.cycleId !== cycleId || item.round !== round),
      ...response.appointments,
    ]
    return response.appointments
  }

  const loadPersistedAppointment = async (appointmentId: string) => {
    const response = supervisionAppointmentResponseSchema.parse(await requestAwareFetch(`/api/supervision/appointments/${appointmentId}`))
    return mergeAppointment(response.appointment)
  }

  const persistSaveResult = async (appointmentId: string, input: Omit<SupervisionResultInput, 'actualLecturerIds'>) => {
    await requestAwareFetch(`/api/supervision/appointments/${appointmentId}`, {
      method: 'PATCH', body: { action: 'save-result', ...input },
    })
    return saveResult(appointmentId, input)
  }

  const persistUpdateAppointment = async (appointmentId: string, input: Pick<SupervisionAppointmentInput, 'date' | 'period' | 'lecturerIds'>) => {
    await requestAwareFetch(`/api/supervision/appointments/${appointmentId}`, {
      method: 'PATCH', body: { action: 'update-schedule', ...input },
    })
    return updateAppointment(appointmentId, input)
  }

  const persistCompleteAppointment = async (appointmentId: string, input: SupervisionResultInput) => {
    const response = await requestAwareFetch(`/api/supervision/appointments/${appointmentId}`, {
      method: 'PATCH', body: { action: 'complete', ...input },
    }) as { completedAt: string }
    const appointment = completeAppointment(appointmentId, input)
    appointment.result.completedAt = response.completedAt
    return appointment
  }

  return {
    appointments,
    createAppointment,
    joinAppointment,
    leaveAppointment,
    updateAppointment,
    saveResult,
    completeAppointment,
    loadPersistedAppointments,
    loadPersistedAppointment,
    persistUpdateAppointment,
    persistSaveResult,
    persistCompleteAppointment,
  }
}
