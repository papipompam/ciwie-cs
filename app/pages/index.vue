<script setup lang="ts">
import { ArrowDown, ArrowRight, ArrowUp, BriefcaseBusiness, Building2, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, FileCheck2, GraduationCap, RotateCcw, Search, Users, UsersRound, X } from '@lucide/vue'
import type { Component } from 'vue'
import { requestStatusMeta, studentRequestStatusMeta } from '#shared/placement-requests'
import type { PlacementRequestPreview } from '#shared/placement-requests'
import type { PlacementStatus } from '~/composables/useStudentPlacements'
import { getPageCount, paginateItems } from '~/utils/table'
import { summarizeStudentPlacements } from '~/utils/studentPlacementSummary'
import type { StudentPlacementSummary } from '~/utils/studentPlacementSummary'

definePageMeta({ title: 'ภาพรวมระบบ' })
useHead({ title: 'ภาพรวมระบบ' })

const { scenario } = useScenario()
const { cycles, selectedCycle } = useCoopCycles()
const { people } = usePeopleDirectory()
const { requests: placementPreviewRequests } = usePlacementRequestPreview()
const { data: studentRequestData, status: studentRequestFetchStatus, error: studentRequestFetchError, refresh: refreshStudentRequests } = await useFetch<PlacementRequestPreview[]>('/api/student/placement-requests', { immediate: scenario.value.role === 'student' })
watch(() => scenario.value.role, (role) => { if (import.meta.client && role === 'student') void refreshStudentRequests() })
const studentRequests = computed(() => (studentRequestData.value ?? []).toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
const studentRequest = computed(() => studentRequests.value[0])
const studentProgressStatus = computed<PlacementStatus | undefined>(() => {
  const status = studentRequest.value?.status
  if (!status) return undefined
  return ({
    submitted: 'submitted',
    'letter-issued': 'letter-issued',
    'signed-uploaded': 'response-uploaded',
    returned: 'response-returned',
    confirmed: 'confirmed',
    cancelled: 'cancelled',
  } as const)[status]
})
const { getUnassignedCompanies } = useSupervisionGroups()
const { appointments } = useSupervisionAppointments()
const { studentEvaluations, companyEvaluations } = useSupervisionEvaluations()
const currentLecturerId = 'L0012'
type DashboardTone = 'neutral' | 'warning' | 'info' | 'success' | 'danger'

interface DashboardData {
  summary: Array<{ label: string, value: string, hint: string, icon: Component }>
  recentTitle: string
  primaryLabel: string
  secondaryLabel: string
  recentItems: Array<{ id: string, primary: string, secondary: string, status: string, tone: DashboardTone, updatedAt?: string, to?: string }>
}

interface QuickAction {
  label: string
  description: string
  to: string
  icon: Component
  primary?: boolean
}

const quickActions = computed<QuickAction[]>(() => ({
  staff: [],
  lecturer: [
    { label: 'ดูตารางนิเทศ', description: 'เปิดนัดหมายและงานนิเทศที่รับผิดชอบ', to: '/lecturer/supervision', icon: CalendarDays, primary: true },
    { label: 'ประเมินนักศึกษา', description: 'ทำแบบประเมินนักศึกษาที่ยังค้างอยู่', to: '/lecturer/evaluations?type=student', icon: ClipboardList },
    { label: 'ประเมินสถานประกอบการ', description: 'ประเมินสถานประกอบการหลังการนิเทศ', to: '/lecturer/evaluations?type=company', icon: Building2 },
    { label: 'ข้อมูลนักศึกษา', description: 'ดูข้อมูลนักศึกษาและสถานที่ฝึกงาน', to: '/lecturer/students', icon: GraduationCap },
  ],
  student: [
    {
      label: studentRequest.value ? 'เปิดคำร้องปัจจุบัน' : 'แจ้งข้อมูลที่ฝึกงาน',
      description: studentRequest.value ? studentRequestStatusMeta[studentRequest.value.status].description : 'เริ่มส่งข้อมูลสถานประกอบการ',
      to: '/student/applications',
      icon: ClipboardList,
      primary: true,
    },
    { label: 'ติดตามการสมัคร', description: 'ดูสถานะการติดต่อสถานประกอบการ', to: '/student/applications', icon: BriefcaseBusiness },
    { label: 'ดูตารางนิเทศ', description: 'ตรวจวัน เวลา และอาจารย์นิเทศ', to: '/student/supervision', icon: CalendarDays },
  ],
}[scenario.value.role]))

const currentCycleDashboard: { staff: DashboardData, lecturer: DashboardData, student: DashboardData } = {
  staff: {
    summary: [
      { label: 'คำร้องรอออกหนังสือ', value: '0', hint: '', icon: ClipboardList },
      { label: 'เอกสารลงนามรอตรวจ', value: '0', hint: '', icon: FileCheck2 },
      { label: 'รอจัดกลุ่มนิเทศ ครั้งที่ 1', value: '0', hint: '', icon: UsersRound },
      { label: 'นัดนิเทศที่เผยแพร่', value: '0', hint: '', icon: CalendarDays },
    ],
    recentTitle: 'คำร้องล่าสุด',
    primaryLabel: 'นักศึกษา',
    secondaryLabel: 'สถานประกอบการ',
    recentItems: [],
  },
  lecturer: {
    summary: [
      { label: 'คำร้องรอตรวจ', value: '0', hint: 'ยังไม่มีคำร้องรอตรวจ', icon: ClipboardCheck },
      { label: 'หนังสือตอบกลับรอตรวจ', value: '0', hint: 'ยังไม่มีเอกสารตอบกลับ', icon: Building2 },
      { label: 'รายการนิเทศที่รับผิดชอบ', value: '0', hint: 'ยังไม่มีการมอบหมาย', icon: CalendarDays },
      { label: 'งานประเมินค้าง', value: '0', hint: 'ยังไม่มีงานประเมิน', icon: Users },
    ],
    recentTitle: 'งานที่ต้องดำเนินการ',
    primaryLabel: 'นักศึกษา / สถานประกอบการ',
    secondaryLabel: 'รายละเอียดงาน',
    recentItems: [],
  },
  student: {
    summary: [
      { label: 'สถานะคำร้อง', value: 'ยังไม่มี', hint: 'ยังไม่ได้ส่งคำร้องสถานประกอบการ', icon: ClipboardCheck },
      { label: 'สถานที่ฝึกงาน', value: 'ยังไม่มี', hint: 'ยังไม่ได้ยืนยันสถานประกอบการ', icon: Building2 },
      { label: 'สถานะการปฏิบัติงาน', value: 'ยังไม่มี', hint: 'จะแสดงเมื่อมีข้อมูลการปฏิบัติงาน', icon: Users },
      { label: 'นัดนิเทศถัดไป', value: 'ยังไม่มี', hint: 'จะแสดงเมื่ออาจารย์เผยแพร่ตารางนิเทศ', icon: CalendarDays },
    ],
    recentTitle: 'ความคืบหน้าของฉัน',
    primaryLabel: 'รายการ',
    secondaryLabel: 'รายละเอียด',
    recentItems: [],
  },
}

const canSelectDashboardCycle = computed(() => scenario.value.role === 'staff' || scenario.value.role === 'lecturer')
const dashboardCycles = cycles
const dashboardCycleId = ref(dashboardCycles.find(cycle => cycle.id === selectedCycle.value.id)?.id ?? dashboardCycles[0]!.id)
const cycleOptions = dashboardCycles.map(cycle => ({ value: cycle.id, label: `${cycle.label} · ${cycle.cohort}` }))
const dashboardCycle = computed(() => canSelectDashboardCycle.value
  ? dashboardCycles.find(cycle => cycle.id === dashboardCycleId.value) ?? dashboardCycles[0]!
  : selectedCycle.value)
interface StaffBackendDashboard {
  students: StudentPlacementSummary
  cards: { waitingLetters: number, waitingReview: number, unassignedRoundOne: number, publishedAppointments: number }
}
const staffBackendDashboard = ref<StaffBackendDashboard | null>(null)
const loadStaffDashboard = async () => {
  if (scenario.value.role !== 'staff') return
  try {
    const [stats, requests] = await Promise.all([
      $fetch<StaffBackendDashboard>('/api/staff/dashboard', { query: { cycleId: dashboardCycleId.value } }),
      $fetch<typeof placementPreviewRequests.value>('/api/staff/placement-requests', { query: { page: 1, pageSize: 100, cycleId: dashboardCycleId.value } }),
    ])
    staffBackendDashboard.value = stats
    placementPreviewRequests.value = [
      ...placementPreviewRequests.value.filter(request => request.cycleId !== dashboardCycleId.value),
      ...requests.filter(request => request.cycleId === dashboardCycleId.value),
    ]
  }
  catch {
    staffBackendDashboard.value = null
  }
}
watch([() => scenario.value.role, dashboardCycleId], () => { if (import.meta.client) void loadStaffDashboard() })
onMounted(loadStaffDashboard)
const dashboard = computed<DashboardData>(() => {
  if (scenario.value.role === 'student') return studentDashboard.value
  if (scenario.value.role === 'staff') return staffDashboard.value
  return lecturerDashboard.value
})
const staffPlacementSummary = computed(() => summarizeStudentPlacements(
  people.value.filter(person => person.type === 'student' && person.recordStatus === 'active' && person.cycle === dashboardCycle.value.label),
  placementPreviewRequests.value,
  dashboardCycle.value.id,
))
const effectiveStaffPlacementSummary = computed(() => staffBackendDashboard.value?.students ?? staffPlacementSummary.value)
const staffRequests = computed(() => placementPreviewRequests.value
  .filter(request => request.cycleId === dashboardCycle.value.id))
const staffRequestItems = computed<DashboardData['recentItems']>(() => staffRequests.value.map(request => ({
  id: request.id,
  primary: request.studentName,
  secondary: request.application.companyName,
  status: requestStatusMeta[request.status].label,
  tone: requestStatusMeta[request.status].tone,
  updatedAt: request.updatedAt,
  to: `/staff/students/${request.application.studentId}`,
})))
const staffDashboard = computed<DashboardData>(() => ({
  summary: [
    { label: 'คำร้องรอออกหนังสือ', value: String(staffBackendDashboard.value?.cards.waitingLetters ?? staffRequests.value.filter(request => request.status === 'submitted').length), hint: '', icon: ClipboardList },
    { label: 'เอกสารลงนามรอตรวจ', value: String(staffBackendDashboard.value?.cards.waitingReview ?? staffRequests.value.filter(request => request.status === 'signed-uploaded').length), hint: '', icon: FileCheck2 },
    { label: 'รอจัดกลุ่มนิเทศ ครั้งที่ 1', value: String(staffBackendDashboard.value?.cards.unassignedRoundOne ?? getUnassignedCompanies(dashboardCycle.value.id, 1).length), hint: '', icon: UsersRound },
    { label: 'นัดนิเทศที่เผยแพร่', value: String(staffBackendDashboard.value?.cards.publishedAppointments ?? appointments.value.filter(item => item.cycleId === dashboardCycle.value.id && item.status === 'published').length), hint: '', icon: CalendarDays },
  ],
  recentTitle: 'คำร้องล่าสุด',
  primaryLabel: 'นักศึกษา',
  secondaryLabel: 'สถานประกอบการ',
  recentItems: staffRequestItems.value,
}))
const studentDashboard = computed<DashboardData>(() => {
  const request = studentRequest.value
  if (!request) return currentCycleDashboard.student
  const status = studentRequestStatusMeta[request.status]
  return {
    ...currentCycleDashboard.student,
    summary: [
      { label: 'สถานะคำร้อง', value: status.label, hint: status.description, icon: ClipboardCheck },
      { label: 'สถานที่ฝึกงาน', value: request.application.companyName, hint: request.application.position, icon: Building2 },
      ...currentCycleDashboard.student.summary.slice(2),
    ],
    recentItems: [{
      id: request.id,
      primary: request.application.companyName,
      secondary: request.application.position,
      status: status.label,
      tone: status.tone,
      updatedAt: request.updatedAt,
      to: '/student/applications',
    }],
  }
})
const lecturerAppointments = computed(() => appointments.value
  .filter(appointment => appointment.cycleId === dashboardCycle.value.id)
  .filter((appointment) => {
    const evaluatorIds = appointment.result.actualLecturerIds.length ? appointment.result.actualLecturerIds : appointment.lecturerIds
    return evaluatorIds.includes(currentLecturerId)
  }))
const pendingStudentEvaluations = computed(() => lecturerAppointments.value
  .filter(appointment => appointment.status === 'completed')
  .reduce((total, appointment) => total + appointment.studentIds.filter(studentId => !studentEvaluations.value.some(evaluation => evaluation.appointmentId === appointment.id
    && evaluation.studentId === studentId
    && evaluation.lecturerId === currentLecturerId
    && evaluation.status === 'submitted')).length, 0))
const pendingCompanyEvaluations = computed(() => lecturerAppointments.value
  .filter(appointment => appointment.status === 'completed')
  .filter((appointment) => {
    const evaluatorIds = appointment.result.actualLecturerIds.length ? appointment.result.actualLecturerIds : appointment.lecturerIds
    return evaluatorIds[0] === currentLecturerId
      && !companyEvaluations.value.some(evaluation => evaluation.appointmentId === appointment.id && evaluation.status === 'submitted')
  }).length)
const lecturerDashboard = computed<DashboardData>(() => ({
  summary: [
    { label: 'นัดนิเทศที่รับผิดชอบ', value: String(lecturerAppointments.value.filter(appointment => appointment.status !== 'cancelled').length), hint: 'รายการในรอบที่เลือก', icon: CalendarDays },
    { label: 'รอนิเทศ', value: String(lecturerAppointments.value.filter(appointment => appointment.status === 'published' || appointment.status === 'postponed').length), hint: 'นัดหมายที่ยังไม่เสร็จสิ้น', icon: ClipboardCheck },
    { label: 'ประเมินนักศึกษาค้าง', value: String(pendingStudentEvaluations.value), hint: 'แบบประเมินรายบุคคลที่ยังไม่ส่ง', icon: Users },
    { label: 'ประเมินสถานประกอบการค้าง', value: String(pendingCompanyEvaluations.value), hint: 'แบบประเมินสถานประกอบการที่ยังไม่ส่ง', icon: Building2 },
  ],
  recentTitle: '',
  primaryLabel: '',
  secondaryLabel: '',
  recentItems: [],
}))
const summaryGridClass = 'sm:grid-cols-2 xl:grid-cols-4'
const effectiveViewState = computed(() => {
  if (scenario.value.forceError || (scenario.value.role === 'student' && studentRequestFetchError.value)) return 'error'
  if (scenario.value.role === 'student' && studentRequestFetchStatus.value === 'pending') return 'loading'
  return scenario.value.viewState
})
const search = ref('')
const status = ref('all')
const sortDirection = ref<'asc' | 'desc'>('desc')
const currentPage = ref(1)
const pageSize = ref('10')
const pageSizeOptions = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
]
const summary = computed(() => scenario.value.dataSet === 'edge'
  ? dashboard.value.summary.map(item => ({ ...item, value: '0', hint: 'ยังไม่มีข้อมูลสำหรับกรณีนี้' }))
  : dashboard.value.summary.map(item => scenario.value.dataSet === 'long'
      ? { ...item, hint: `${item.hint} · ข้อความตัวอย่างแบบยาวสำหรับตรวจสอบการตัดบรรทัดและความยืดหยุ่นของพื้นที่แสดงผลบนหน้าจอขนาดต่าง ๆ` }
      : item))
const statusOptions = computed(() => [
  { value: 'all', label: 'ทุกสถานะ' },
  ...(scenario.value.role === 'staff'
    ? Object.values(requestStatusMeta).map(meta => ({ value: meta.label, label: meta.label }))
    : [...new Set(dashboard.value.recentItems.map(item => item.status))]
        .map(itemStatus => ({ value: itemStatus, label: itemStatus }))),
])
const filteredRecentItems = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('th')
  return dashboard.value.recentItems
    .filter(item => status.value === 'all' || item.status === status.value)
    .filter(item => !keyword || [item.id, item.primary, item.secondary, item.status]
      .some(value => value.toLocaleLowerCase('th').includes(keyword)))
    .toSorted((a, b) => {
      const comparison = (a.updatedAt ?? a.id).localeCompare(b.updatedAt ?? b.id, 'th', { numeric: true })
      return sortDirection.value === 'asc' ? comparison : -comparison
    })
})
const pageSizeNumber = computed(() => Number(pageSize.value))
const pageCount = computed(() => getPageCount(filteredRecentItems.value.length, pageSizeNumber.value))
const paginatedRecentItems = computed(() => paginateItems(filteredRecentItems.value, currentPage.value, pageSizeNumber.value))
const resultStart = computed(() => filteredRecentItems.value.length ? (currentPage.value - 1) * pageSizeNumber.value + 1 : 0)
const resultEnd = computed(() => Math.min(currentPage.value * pageSizeNumber.value, filteredRecentItems.value.length))
const hasActiveFilters = computed(() => Boolean(search.value) || status.value !== 'all')
const activeStatusLabel = computed(() => statusOptions.value.find(option => option.value === status.value)?.label)
const selectedRequestId = ref<string | null>(null)
const requestDialogOpen = ref(false)
const selectedRequest = computed(() => staffRequests.value.find(request => request.id === selectedRequestId.value) ?? null)

const openRequest = (id: string) => {
  if (scenario.value.role !== 'staff' || !staffRequests.value.some(request => request.id === id)) return
  selectedRequestId.value = id
  requestDialogOpen.value = true
}
const formatDate = (value: string) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Bangkok',
}).format(new Date(value))

let retryTimer: number | undefined

const clearFilters = () => {
  search.value = ''
  status.value = 'all'
}
const resetTable = () => {
  clearFilters()
  sortDirection.value = 'desc'
  pageSize.value = '10'
  currentPage.value = 1
}
const toggleItemSort = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  currentPage.value = 1
}
const retry = () => {
  scenario.value.viewState = 'loading'
  retryTimer = window.setTimeout(() => {
    scenario.value.forceError = false
    scenario.value.viewState = 'data'
  }, scenario.value.networkDelay === 'slow' ? 1500 : 650)
}

watch([search, status, pageSize], () => {
  currentPage.value = 1
})
watch(pageCount, (count) => {
  if (currentPage.value > count) currentPage.value = count
})
watch(() => scenario.value.role, () => {
  requestDialogOpen.value = false
  selectedRequestId.value = null
  dashboardCycleId.value = selectedCycle.value.id
  resetTable()
})
watch(dashboardCycleId, () => {
  requestDialogOpen.value = false
  selectedRequestId.value = null
  resetTable()
})

onBeforeUnmount(() => {
  if (retryTimer) window.clearTimeout(retryTimer)
})
</script>

<template>
  <div>
    <header v-if="scenario.role === 'lecturer'" class="mb-6">
      <p class="text-sm font-semibold text-primary">หน้าหลักอาจารย์นิเทศ</p>
      <h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">งานนิเทศของคุณ</h2>
      <p class="mt-1 text-sm leading-6 text-muted">ติดตามนัดหมายและทำแบบประเมินที่ได้รับมอบหมายจากจุดเดียว</p>
    </header>

    <div class="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p class="text-xs font-medium text-muted">รอบที่กำลังแสดง</p>
        <div class="mt-1 flex flex-wrap items-center gap-2">
          <p class="font-semibold text-ink">{{ dashboardCycle.label }}</p>
          <UiBadge :tone="cycleStatusMeta[dashboardCycle.status].tone">
            {{ cycleStatusMeta[dashboardCycle.status].label }}
          </UiBadge>
        </div>
      </div>
      <div class="w-full sm:w-auto sm:min-w-72">
        <UiSelect
          v-if="canSelectDashboardCycle"
          v-model="dashboardCycleId"
          :options="cycleOptions"
          label="รอบสหกิจศึกษา"
        />
      </div>
    </div>

    <StudentPlacementProgress
      v-if="scenario.role === 'student' && effectiveViewState === 'data'"
      class="mb-6"
      :cycle="dashboardCycle"
      :status="studentProgressStatus"
      :request-id="studentRequest?.id"
      :company-name="studentRequest?.application.companyName"
    />
    <CycleContextPanel v-else-if="scenario.role === 'lecturer'" class="mb-6" :cycle="dashboardCycle" />

    <section v-if="scenario.role !== 'staff' && effectiveViewState === 'data'" class="mb-6" aria-labelledby="quick-actions-title">
      <div class="mb-3">
        <h3 id="quick-actions-title" class="text-lg font-bold text-ink">ดำเนินการต่อ</h3>
        <p class="mt-1 text-sm text-muted">เปิดงานสำคัญได้ทันทีโดยไม่ต้องค้นหาในเมนู</p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          class="group flex min-h-24 items-center gap-3 rounded-panel border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="action.primary ? 'border-primary bg-warning-soft hover:bg-primary/20' : 'border-divider bg-canvas hover:bg-surface'"
        >
          <span class="grid size-10 shrink-0 place-items-center rounded-control" :class="action.primary ? 'bg-primary text-ink' : 'bg-surface text-muted'">
            <component :is="action.icon" :size="20" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block font-semibold text-ink">{{ action.label }}</span>
            <span class="mt-1 block text-xs leading-5 text-muted">{{ action.description }}</span>
          </span>
          <ArrowRight class="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </NuxtLink>
      </div>
    </section>

    <template v-if="effectiveViewState === 'loading'">
      <div v-if="scenario.role === 'staff'" class="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]" aria-label="กำลังโหลดข้อมูลสรุป">
        <div class="grid gap-3 sm:grid-cols-2">
          <UiCard v-for="index in dashboard.summary.length" :key="index">
            <UiSkeleton class="h-4 w-28" />
            <UiSkeleton class="mt-5 h-9 w-16" />
          </UiCard>
        </div>
        <UiCard>
          <UiSkeleton class="h-6 w-52" />
          <div class="mt-5 flex items-center gap-6">
            <UiSkeleton class="size-44 shrink-0 rounded-full" />
            <div class="flex-1 space-y-4"><UiSkeleton v-for="index in 3" :key="index" class="h-10 w-full" /></div>
          </div>
        </UiCard>
      </div>
      <div v-else class="grid gap-3" :class="summaryGridClass" aria-label="กำลังโหลดข้อมูลสรุป">
        <UiCard v-for="index in dashboard.summary.length" :key="index">
          <UiSkeleton class="h-4 w-28" />
          <UiSkeleton class="mt-5 h-9 w-16" />
          <UiSkeleton class="mt-3 h-3 w-40" />
        </UiCard>
      </div>
      <UiCard v-if="scenario.role !== 'lecturer'" class="mt-6">
        <UiSkeleton class="h-6 w-44" />
        <UiSkeleton v-for="index in 3" :key="index" class="mt-5 h-14 w-full" />
      </UiCard>
    </template>

    <AppEmptyState
      v-else-if="effectiveViewState === 'empty'"
      title="ยังไม่มีรายการในรอบนี้"
      description="เมื่อมีนักศึกษาส่งคำร้องหรือมีตารางนิเทศ รายการสรุปจะแสดงที่นี่"
    />
    <AppErrorState v-else-if="effectiveViewState === 'error'" @retry="retry" />

    <template v-else>
      <div v-if="scenario.role === 'staff'" class="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
        <section class="grid gap-3 sm:grid-cols-2" aria-label="ตัวเลขสรุป">
          <UiCard v-for="item in summary" :key="item.label" class="h-full">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-muted">{{ item.label }}</p>
                <p class="mt-2 text-3xl font-bold tracking-tight text-ink">{{ item.value }}</p>
              </div>
              <div class="grid size-10 shrink-0 place-items-center rounded-control bg-surface text-muted">
                <component :is="item.icon" :size="20" aria-hidden="true" />
              </div>
            </div>
          </UiCard>
        </section>
        <StudentPlacementDonut
          class="h-full"
          :summary="effectiveStaffPlacementSummary"
          :cycle-label="dashboardCycle.label"
        />
      </div>
      <section v-else class="grid gap-3" :class="summaryGridClass" aria-label="ตัวเลขสรุป">
        <UiCard v-for="item in summary" :key="item.label">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-muted">{{ item.label }}</p>
              <p class="mt-2 font-bold tracking-tight text-ink" :class="scenario.role === 'student' ? 'text-xl sm:text-2xl' : 'text-3xl'">{{ item.value }}</p>
            </div>
            <div class="grid size-10 shrink-0 place-items-center rounded-control bg-surface text-muted">
              <component :is="item.icon" :size="20" aria-hidden="true" />
            </div>
          </div>
          <p class="mt-4 text-xs leading-5 text-muted">{{ item.hint }}</p>
        </UiCard>
      </section>

      <UiCard v-if="scenario.role !== 'lecturer'" class="mt-6" :padded="false">
        <div class="border-b border-divider p-5 sm:p-6">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 class="text-lg font-bold text-ink">{{ dashboard.recentTitle }}</h3>
            </div>
            <span class="text-xs font-medium text-muted">{{ dashboard.recentItems.length }} รายการล่าสุด</span>
          </div>

          <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label class="block w-full text-sm font-semibold text-ink sm:max-w-sm lg:w-96 lg:flex-none">
              <span class="sr-only">ค้นหารายการล่าสุด</span>
              <span class="relative block">
                <Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input v-model="search" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" placeholder="ค้นหารหัส ชื่อ หรือสถานประกอบการ">
              </span>
            </label>
            <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
              <div class="w-full" :class="scenario.role === 'staff' ? 'sm:w-max sm:shrink-0 sm:whitespace-nowrap' : 'sm:w-48'">
                <UiSelect v-model="status" :options="statusOptions" label="กรองตามสถานะ" :label-visible="false" />
              </div>
              <button type="button" class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink transition-colors hover:bg-surface" aria-label="รีเซ็ตตาราง" title="รีเซ็ตตาราง" @click="resetTable">
                <RotateCcw :size="18" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div v-if="hasActiveFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span class="text-muted">ตัวกรองที่ใช้:</span>
            <span v-if="search" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">คำค้น “{{ search }}”</span>
            <span v-if="status !== 'all'" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">{{ activeStatusLabel }}</span>
            <button type="button" class="inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-semibold text-warning hover:bg-warning-soft" @click="clearFilters"><X :size="15" aria-hidden="true" />ล้างทั้งหมด</button>
          </div>
        </div>

        <div v-if="!paginatedRecentItems.length" class="p-5 sm:p-6">
          <AppEmptyState
            :title="hasActiveFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีรายการในรอบนี้'"
            :description="hasActiveFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'เมื่อมีข้อมูล รายการล่าสุดจะแสดงที่นี่'"
          >
            <UiButton v-if="hasActiveFilters" variant="secondary" @click="clearFilters">ล้างตัวกรอง</UiButton>
          </AppEmptyState>
        </div>

        <template v-else>
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full min-w-[760px] border-collapse text-left text-sm" :class="scenario.role === 'staff' ? 'table-fixed [&_td]:[overflow-wrap:anywhere]' : undefined">
              <caption class="sr-only">{{ dashboard.recentTitle }}</caption>
              <colgroup v-if="scenario.role === 'staff'">
                <col v-for="column in 4" :key="column" class="w-1/4">
              </colgroup>
              <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" class="px-6 py-3" :aria-sort="sortDirection === 'asc' ? 'ascending' : 'descending'">
                    <button type="button" class="inline-flex items-center gap-1 font-semibold hover:text-ink" :aria-label="`เรียง${scenario.role === 'staff' ? 'วันที่ปรับปรุง' : 'เลขที่รายการ'}${sortDirection === 'asc' ? 'จากมากไปน้อย' : 'จากน้อยไปมาก'}`" @click="toggleItemSort">
                      {{ scenario.role === 'staff' ? 'คำร้อง / อัปเดตล่าสุด' : 'เลขที่รายการ' }}
                      <ArrowUp v-if="sortDirection === 'asc'" :size="15" aria-hidden="true" />
                      <ArrowDown v-else :size="15" aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" class="px-4 py-3">{{ dashboard.primaryLabel }}</th>
                  <th scope="col" class="px-4 py-3">{{ dashboard.secondaryLabel }}</th>
                  <th scope="col" class="px-4 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-divider">
                <tr
                  v-for="item in paginatedRecentItems"
                  :key="item.id"
                  class="transition-colors"
                  :class="scenario.role === 'staff' ? 'cursor-pointer hover:bg-surface/70' : 'hover:bg-surface/70'"
                  :title="scenario.role === 'staff' ? 'เปิดรายละเอียดและดำเนินการ' : undefined"
                  @click="openRequest(item.id)"
                >
                  <td class="px-6 py-4">
                    <p class="font-semibold text-ink">{{ item.id }}</p>
                    <p v-if="item.updatedAt" class="mt-1 text-xs font-normal text-muted">{{ formatDate(item.updatedAt) }}</p>
                  </td>
                  <td class="px-4 py-4 text-ink">
                    <button v-if="scenario.role === 'staff'" type="button" class="text-left font-medium hover:underline" @click.stop="openRequest(item.id)">{{ item.primary }}</button>
                    <NuxtLink v-else-if="item.to" :to="item.to" class="font-medium hover:underline">{{ item.primary }}</NuxtLink>
                    <template v-else>{{ item.primary }}</template>
                  </td>
                  <td class="px-4 py-4 text-muted">{{ item.secondary }}</td>
                  <td class="px-4 py-4">
                    <div class="flex items-center justify-between gap-3">
                      <UiBadge :tone="item.tone">{{ item.status }}</UiBadge>
                      <NuxtLink v-if="scenario.role !== 'staff' && item.to" :to="item.to" class="inline-flex min-h-9 items-center rounded-control px-3 text-xs font-semibold text-primary hover:bg-warning-soft">ทำต่อ</NuxtLink>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divide-y divide-divider md:hidden">
            <article v-for="item in paginatedRecentItems" :key="item.id" class="relative p-5">
              <button
                v-if="scenario.role === 'staff'"
                type="button"
                class="absolute inset-0 w-full rounded-control"
                :aria-label="`เปิดรายละเอียดคำร้อง ${item.id} ของ ${item.primary}`"
                @click="openRequest(item.id)"
              />
              <NuxtLink
                v-else-if="item.to"
                :to="item.to"
                class="absolute inset-0 z-10 w-full rounded-control focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                :aria-label="`เปิด ${item.primary} สถานะ ${item.status}`"
              />
              <div class="pointer-events-none relative">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-sm font-semibold text-ink">{{ item.primary }}</p>
                  <UiBadge :tone="item.tone">{{ item.status }}</UiBadge>
                </div>
                <p class="mt-2 text-sm text-muted">{{ item.secondary }}</p>
                <p class="mt-3 text-xs font-medium text-muted">
                  {{ item.id }}<template v-if="item.updatedAt"> · {{ formatDate(item.updatedAt) }}</template>
                </p>
              </div>
            </article>
          </div>

          <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div class="flex items-center gap-3">
              <p class="whitespace-nowrap text-muted">แสดง {{ resultStart }}–{{ resultEnd }} จาก {{ filteredRecentItems.length }} รายการ</p>
              <div class="w-20 shrink-0"><UiSelect v-model="pageSize" :options="pageSizeOptions" label="จำนวนรายการต่อหน้า" :label-visible="false" /></div>
            </div>
            <nav class="flex items-center gap-2" aria-label="การแบ่งหน้าตาราง">
              <button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-45" :disabled="currentPage === 1" aria-label="หน้าก่อนหน้า" @click="currentPage--"><ChevronLeft :size="18" aria-hidden="true" /></button>
              <span class="min-w-20 text-center font-semibold text-ink">หน้า {{ currentPage }} / {{ pageCount }}</span>
              <button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-45" :disabled="currentPage === pageCount" aria-label="หน้าถัดไป" @click="currentPage++"><ChevronRight :size="18" aria-hidden="true" /></button>
            </nav>
          </div>
        </template>
      </UiCard>
    </template>

    <UiDialog
      v-model:open="requestDialogOpen"
      size="xl"
      title="รายละเอียดคำร้อง"
      :description="selectedRequest ? `${selectedRequest.studentName} · ${selectedRequest.application.studentId}` : undefined"
    >
      <div v-if="selectedRequest" class="space-y-6">
        <dl class="grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-xs text-muted">เลขที่คำร้อง</dt>
            <dd class="mt-1 font-semibold text-ink">{{ selectedRequest.id }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">วันที่ส่งคำร้อง</dt>
            <dd class="mt-1 text-ink">{{ formatDate(selectedRequest.submittedAt) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">สถานประกอบการ</dt>
            <dd class="mt-1 font-semibold text-ink">{{ selectedRequest.application.companyName }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">ตำแหน่งงาน</dt>
            <dd class="mt-1 text-ink">{{ selectedRequest.application.position }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">ผู้รับหนังสือ</dt>
            <dd class="mt-1 text-ink">{{ selectedRequest.application.recipientName || 'ยังไม่ระบุ' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">ที่อยู่สำหรับออกหนังสือ</dt>
            <dd class="mt-1 whitespace-pre-line leading-6 text-ink">{{ selectedRequest.application.letterAddress || 'ยังไม่ระบุ' }}</dd>
          </div>
        </dl>

        <div class="border-t border-divider pt-5">
          <h3 class="mb-4 font-semibold text-ink">สถานะและการดำเนินการ</h3>
          <AppRequestDocuments :key="selectedRequest.id" :request="selectedRequest" staff />
        </div>
      </div>
    </UiDialog>
  </div>
</template>
