export type CalendarEventType = 'supervision' | 'document' | 'deadline' | 'evaluation' | 'general'

export interface RoleCalendarEvent {
  id: string
  title: string
  description: string
  date: string
  type: CalendarEventType
  roles: ScenarioRole[]
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

const roleEventSeeds: RoleCalendarEvent[] = [
  {
    id: 'CAL-STAFF-001', title: 'ตรวจความพร้อมข้อมูลนักศึกษาในรอบ',
    description: 'ตรวจรายชื่อนักศึกษา รุ่น และหมู่เรียนก่อนเริ่มจัดตารางนิเทศ',
    date: '2026-09-01', type: 'general', roles: ['staff'], href: '/staff/students', source: 'system',
  },
  {
    id: 'CAL-STAFF-002', title: 'จัดสถานประกอบการที่ยังไม่มีกลุ่มรับผิดชอบ',
    description: 'ตรวจสถานประกอบการคงเหลือและมอบหมายให้กลุ่มอาจารย์นิเทศ',
    date: '2026-09-04', type: 'deadline', roles: ['staff'], href: '/staff/supervision/groups', source: 'system',
  },
  {
    id: 'CAL-CYCLE-001', title: 'วันสุดท้ายของการยื่นสถานประกอบการ',
    description: 'ปิดรับคำร้องสถานประกอบการสำหรับภาคเรียนที่ 2/2569',
    date: '2026-09-30', type: 'deadline', roles: ['staff', 'lecturer', 'student'], source: 'system',
  },
  {
    id: 'CAL-LECTURER-002', title: 'ติดตามแบบประเมินหลังการนิเทศ',
    description: 'ตรวจรายการที่นิเทศแล้วและส่งแบบประเมินให้ครบถ้วน',
    date: '2026-09-07', type: 'evaluation', roles: ['lecturer'], href: '/lecturer/evaluations?type=student', source: 'system',
  },
  {
    id: 'CAL-STUDENT-001', title: 'ติดตามหนังสือขออนุญาตฝึกสหกิจ',
    description: 'ตรวจสถานะเอกสารและดาวน์โหลดหนังสือเมื่อเจ้าหน้าที่เผยแพร่แล้ว',
    date: '2026-09-01', type: 'document', roles: ['student'], href: '/student/applications', source: 'system',
  },
  {
    id: 'CAL-STUDENT-002', title: 'ส่งหนังสือตอบรับให้เจ้าหน้าที่',
    description: 'อัปโหลดหนังสือตอบรับจากสถานประกอบการเพื่อยืนยันสถานที่ฝึกงาน',
    date: '2026-09-07', type: 'deadline', roles: ['student'], href: '/student/applications', source: 'system',
  },
  {
    id: 'CAL-TRAINING-001', title: 'เริ่มปฏิบัติงานสหกิจศึกษา',
    description: 'วันเริ่มต้นช่วงปฏิบัติงานของภาคเรียนที่ 2/2569',
    date: '2026-11-02', type: 'general', roles: ['staff', 'lecturer', 'student'], source: 'system',
  },
]

export const useRoleCalendar = () => {
  const { scenario, recordEvent } = useScenario()
  const { appointments } = useSupervisionAppointments()
  const { groups, companyRecords } = useSupervisionGroups()
  const customEvents = useState<RoleCalendarEvent[]>('role-calendar-custom-events-v1', () => [])
  const currentLecturerId = 'L0012'
  const currentStudentId = '66123456701'

  const appointmentEvents = computed<RoleCalendarEvent[]>(() => appointments.value
    .filter((appointment) => {
      if (scenario.value.role === 'staff') return true
      if (appointment.status === 'draft' || appointment.status === 'cancelled') return false
      if (scenario.value.role === 'student') return appointment.studentIds.includes(currentStudentId)
      const responsibleGroup = groups.value.find(group => group.id === appointment.groupId)
      return appointment.lecturerIds.includes(currentLecturerId)
        || responsibleGroup?.lecturerIds.includes(currentLecturerId) === true
    })
    .map((appointment) => {
      const company = companyRecords.value.find(item => item.id === appointment.companyId)
      const href = scenario.value.role === 'staff'
        ? '/staff/supervision'
        : scenario.value.role === 'lecturer'
          ? `/lecturer/supervision/${appointment.id}`
          : '/student/supervision'
      return {
        id: `CAL-${appointment.id}`,
        title: `นิเทศครั้งที่ ${appointment.round} · ${company?.name ?? appointment.companyId}`,
        description: `${supervisionPeriodMeta[appointment.period].label} · ${supervisionAppointmentStatusMeta[appointment.status].label}`,
        date: appointment.date,
        type: 'supervision',
        roles: [scenario.value.role],
        href,
        source: 'system',
      }
    }))

  const events = computed(() => [...roleEventSeeds, ...appointmentEvents.value, ...customEvents.value]
    .filter(event => event.roles.includes(scenario.value.role))
    .sort((a, b) => `${a.date}-${a.title}`.localeCompare(`${b.date}-${b.title}`)))

  const addEvent = (input: RoleCalendarEventInput) => {
    const event: RoleCalendarEvent = {
      ...input,
      id: `CAL-CUSTOM-${Date.now()}`,
      roles: [scenario.value.role],
      source: 'custom',
    }
    customEvents.value.push(event)
    recordEvent(`เพิ่มกิจกรรม ${event.title}`)
    return event
  }

  return { events, addEvent }
}
