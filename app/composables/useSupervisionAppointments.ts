import type { SupervisionRound } from './useSupervisionGroups'

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

const appointmentsSeed: SupervisionAppointment[] = [
  {
    id: 'SA-001', cycleId: 'CYCLE-2569-2', round: 1, groupId: 'SG-001', companyId: 'SC-001',
    studentIds: ['66123456701', '66123456702'], date: '2026-09-02', period: 'morning',
    lecturerIds: ['L0012'], status: 'published', result: emptyResult(), createdAt: '2026-08-30T15:20:00+07:00',
  },
  {
    id: 'SA-002', cycleId: 'CYCLE-2569-2', round: 1, groupId: 'SG-001', companyId: 'SC-002',
    studentIds: ['66123456704'], date: '2026-09-03', period: 'afternoon',
    lecturerIds: ['L0012'], status: 'published', result: emptyResult(), createdAt: '2026-08-30T15:25:00+07:00',
  },
  {
    id: 'SA-003', cycleId: 'CYCLE-2569-2', round: 1, groupId: 'SG-003', companyId: 'SC-003',
    studentIds: ['66123456708', '66123456723'], date: '2026-09-02', period: 'morning',
    lecturerIds: ['L0021'], status: 'published', result: emptyResult(), createdAt: '2026-08-30T15:30:00+07:00',
  },
  {
    id: 'SA-004', cycleId: 'CYCLE-2569-2', round: 2, groupId: 'SG-002', companyId: 'SC-001',
    studentIds: ['66123456701', '66123456702'], date: '2026-10-07', period: 'morning',
    lecturerIds: ['L0021'], status: 'published', result: emptyResult(), createdAt: '2026-08-30T15:35:00+07:00',
  },
  {
    id: 'SA-005', cycleId: 'CYCLE-2569-2', round: 2, groupId: 'SG-002', companyId: 'SC-003',
    studentIds: ['66123456708', '66123456723'], date: '2026-10-08', period: 'afternoon',
    lecturerIds: ['L0021'], status: 'published', result: emptyResult(), createdAt: '2026-08-30T15:40:00+07:00',
  },
  {
    id: 'SA-006', cycleId: 'CYCLE-2569-2', round: 1, groupId: 'SG-001', companyId: 'SC-001',
    studentIds: ['66123456701', '66123456702'], date: '2026-08-20', period: 'morning',
    lecturerIds: ['L0012', 'L0030'], status: 'completed',
    result: {
      summary: 'นักศึกษาปฏิบัติงานตามแผน สามารถอธิบายงานและสาธิตระบบที่รับผิดชอบได้',
      issues: 'ยังต้องปรับปรุงการจัดลำดับความสำคัญของงานเมื่อมีงานเร่งด่วนหลายรายการ',
      suggestions: 'ให้นักศึกษาสรุปแผนงานรายสัปดาห์และทบทวนร่วมกับพี่เลี้ยง',
      companyRequirements: 'สนใจรับนักศึกษาด้านพัฒนาเว็บและทดสอบระบบในรอบถัดไป',
      actualLecturerIds: ['L0012'],
      completedAt: '2026-08-20T16:30:00+07:00',
    },
    createdAt: '2026-08-10T09:00:00+07:00',
  },
]

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
  const appointments = useState<SupervisionAppointment[]>('supervision-appointments-v1', () => structuredClone(appointmentsSeed))
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

  return { appointments, createAppointment, joinAppointment, leaveAppointment, updateAppointment, saveResult, completeAppointment }
}
