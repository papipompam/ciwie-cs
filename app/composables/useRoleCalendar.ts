import { calendarEventSchema, calendarEventsResponseSchema } from '#shared/calendar'
import { requestAwareFetch } from '../utils/requestAwareFetch'

export type CalendarEventType = 'supervision' | 'document' | 'deadline' | 'evaluation' | 'general'

export interface RoleCalendarEvent {
  id: string
  title: string
  description: string
  date: string
  type: CalendarEventType
  href?: string
  source: 'system' | 'custom'
}

export interface RoleCalendarEventInput {
  title: string
  description: string
  date: string
  type: CalendarEventType
}

export const calendarEventTypeMeta: Record<CalendarEventType, {
  label: string
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'interview'
  dotClass: string
}> = {
  supervision: { label: 'นัดนิเทศ', tone: 'info', dotClass: 'bg-info' },
  document: { label: 'เอกสารและคำร้อง', tone: 'warning', dotClass: 'bg-warning' },
  deadline: { label: 'กำหนดส่ง', tone: 'danger', dotClass: 'bg-danger' },
  evaluation: { label: 'การประเมิน', tone: 'interview', dotClass: 'bg-interview' },
  general: { label: 'กิจกรรมทั่วไป', tone: 'neutral', dotClass: 'bg-muted' },
}

export const useRoleCalendar = () => {
  const { appointments, loadPersistedAppointments } = useSupervisionAppointments()
  const { cycleId, round } = useSupervisionContext()
  const { currentAccount } = useAuthPrototype()
  const customEvents = useState<RoleCalendarEvent[]>('role-calendar-custom-events', () => [])
  const status = useState<'idle' | 'loading' | 'success' | 'error'>('role-calendar-status', () => 'idle')
  const error = useState<string | null>('role-calendar-error', () => null)

  const load = async () => {
    status.value = 'loading'
    error.value = null
    try {
      const [saved] = await Promise.all([
        requestAwareFetch('/api/calendar/events'),
        cycleId.value ? loadPersistedAppointments(cycleId.value, round.value) : Promise.resolve([]),
      ])
      customEvents.value = calendarEventsResponseSchema.parse(saved).events.map(event => ({ ...event, source: 'custom' as const }))
      status.value = 'success'
    }
    catch (cause) {
      customEvents.value = []
      status.value = 'error'
      error.value = cause instanceof Error ? cause.message : 'ไม่สามารถโหลดปฏิทินได้'
    }
  }
  if (status.value === 'idle') void load()
  watch([cycleId, round], () => { void load() })

  const appointmentEvents = computed<RoleCalendarEvent[]>(() => appointments.value
    .filter(appointment => appointment.status !== 'draft' && appointment.status !== 'cancelled')
    .map(appointment => ({
      id: `appointment-${appointment.id}`,
      title: `นิเทศครั้งที่ ${appointment.round} · ${appointment.display?.companyName ?? appointment.companyId}`,
      description: `${supervisionPeriodMeta[appointment.period].label} · ${supervisionAppointmentStatusMeta[appointment.status].label}`,
      date: appointment.date,
      type: 'supervision',
      href: currentAccount.value?.role === 'lecturer' ? `/lecturer/supervision/${appointment.id}` : currentAccount.value?.role === 'student' ? '/student/supervision' : '/staff/supervision',
      source: 'system',
    })))
  const events = computed(() => [...appointmentEvents.value, ...customEvents.value]
    .sort((left, right) => `${left.date}-${left.title}`.localeCompare(`${right.date}-${right.title}`)))
  const addEvent = async (input: RoleCalendarEventInput) => {
    const event = calendarEventSchema.parse(await requestAwareFetch('/api/calendar/events', { method: 'POST', body: input }))
    const mapped = { ...event, source: 'custom' as const }
    customEvents.value.unshift(mapped)
    return mapped
  }
  return { events, status, error, load, addEvent }
}
