<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw, Search, UsersRound, X } from '@lucide/vue'
import { getPageCount, paginateItems } from '~/utils/table'
import type { SupervisionAppointment, SupervisionAppointmentStatus } from '~/composables/useSupervisionAppointments'

definePageMeta({ title: 'ตารางนิเทศของฉัน', middleware: 'student-prototype' })
useHead({ title: 'ตารางนิเทศของฉัน' })

const currentStudentId = '66123456701'
const { scenario } = useScenario()
const { people } = usePeopleDirectory()
const { getCompanies } = useSupervisionGroups()
const { appointments } = useSupervisionAppointments()
const { selectedCycle } = useCoopCycles()

const searchQuery = ref('')
const roundFilter = ref('all')
const statusFilter = ref('all')
const currentPage = ref(1)
const pageSize = ref('10')
const detailOpen = ref(false)
const selectedAppointmentId = ref<string | null>(null)

const effectiveViewState = computed(() => scenario.value.forceError ? 'error' : scenario.value.viewState)
const companies = computed(() => getCompanies(selectedCycle.value.id))
const visibleStatuses: SupervisionAppointmentStatus[] = ['published', 'postponed', 'completed', 'cancelled']
const roundOptions = [
  { value: 'all', label: 'ทุกครั้งที่นิเทศ' },
  { value: '1', label: 'นิเทศครั้งที่ 1' },
  { value: '2', label: 'นิเทศครั้งที่ 2' },
]
const statusOptions = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'published', label: supervisionAppointmentStatusMeta.published.label },
  { value: 'postponed', label: supervisionAppointmentStatusMeta.postponed.label },
  { value: 'completed', label: supervisionAppointmentStatusMeta.completed.label },
  { value: 'cancelled', label: supervisionAppointmentStatusMeta.cancelled.label },
]
const pageSizeOptions = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
]

const company = (companyId: string) => companies.value.find(item => item.id === companyId) ?? null
const lecturerName = (lecturerId: string) => {
  const lecturer = people.value.find(person => person.type === 'lecturer' && person.id === lecturerId)
  return lecturer ? getPersonFullName(lecturer) : lecturerId
}
const appointmentLecturerIds = (appointment: SupervisionAppointment) => appointment.status === 'completed' && appointment.result.actualLecturerIds.length
  ? appointment.result.actualLecturerIds
  : appointment.lecturerIds
const appointmentStudents = (appointment: SupervisionAppointment) => company(appointment.companyId)?.students
  .filter(student => appointment.studentIds.includes(student.studentId)) ?? []
const formatDate = (date: string) => new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}).format(new Date(`${date}T00:00:00+07:00`))

const studentAppointments = computed(() => appointments.value
  .filter(item => item.cycleId === selectedCycle.value.id
    && item.studentIds.includes(currentStudentId)
    && visibleStatuses.includes(item.status)))
const filteredAppointments = computed(() => {
  if (scenario.value.viewState === 'empty') return []
  const keyword = searchQuery.value.trim().toLocaleLowerCase('th')
  return studentAppointments.value
    .filter((appointment) => {
      const appointmentCompany = company(appointment.companyId)
      const searchableText = [
        appointment.id,
        appointmentCompany?.name,
        appointmentCompany?.branch,
        appointmentCompany?.province,
        ...appointmentLecturerIds(appointment).map(lecturerName),
      ].filter(Boolean).join(' ').toLocaleLowerCase('th')
      return (!keyword || searchableText.includes(keyword))
        && (roundFilter.value === 'all' || String(appointment.round) === roundFilter.value)
        && (statusFilter.value === 'all' || appointment.status === statusFilter.value)
    })
    .sort((a, b) => `${a.date}-${a.period}`.localeCompare(`${b.date}-${b.period}`))
})
const pageSizeNumber = computed(() => Number(pageSize.value))
const pageCount = computed(() => getPageCount(filteredAppointments.value.length, pageSizeNumber.value))
const paginatedAppointments = computed(() => paginateItems(filteredAppointments.value, currentPage.value, pageSizeNumber.value))
const resultStart = computed(() => filteredAppointments.value.length ? (currentPage.value - 1) * pageSizeNumber.value + 1 : 0)
const resultEnd = computed(() => Math.min(currentPage.value * pageSizeNumber.value, filteredAppointments.value.length))
const hasActiveFilters = computed(() => Boolean(searchQuery.value.trim() || roundFilter.value !== 'all' || statusFilter.value !== 'all'))
const selectedAppointment = computed(() => appointments.value.find(item => item.id === selectedAppointmentId.value) ?? null)
const selectedCompany = computed(() => selectedAppointment.value ? company(selectedAppointment.value.companyId) : null)
const selectedStudents = computed(() => selectedAppointment.value ? appointmentStudents(selectedAppointment.value) : [])

watch([searchQuery, roundFilter, statusFilter, pageSize], () => {
  currentPage.value = 1
})
watch(pageCount, (count) => {
  if (currentPage.value > count) currentPage.value = count
})

const clearFilters = () => {
  searchQuery.value = ''
  roundFilter.value = 'all'
  statusFilter.value = 'all'
}
const resetTable = () => {
  clearFilters()
  pageSize.value = '10'
  currentPage.value = 1
}
const retry = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
}
const openDetails = (appointmentId: string) => {
  selectedAppointmentId.value = appointmentId
  detailOpen.value = true
}
</script>

<template>
  <div>
    <header class="mb-6">
      <p class="text-sm font-semibold text-primary">{{ selectedCycle.label }}</p>
      <h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">ตารางนิเทศของฉัน</h2>
      <p class="mt-1 text-sm leading-6 text-muted">ดูวัน เวลา สถานประกอบการ อาจารย์ผู้นิเทศ และเพื่อนที่อยู่ในรายการเดียวกัน</p>
    </header>

    <UiCard :padded="false">
      <div class="border-b border-divider p-5 sm:p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-bold text-ink">รายการนัดนิเทศ</h3>
            <p class="mt-1 text-sm leading-6 text-muted">แสดงเฉพาะรายการที่เผยแพร่และมีชื่อคุณอยู่ในรายการ</p>
          </div>
          <span class="grid size-10 shrink-0 place-items-center rounded-control bg-info-soft text-info">
            <CalendarDays :size="20" aria-hidden="true" />
          </span>
        </div>

        <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label class="block w-full text-sm font-semibold text-ink sm:max-w-sm lg:w-96 lg:flex-none">
            <span class="sr-only">ค้นหารายการนิเทศ</span>
            <span class="relative block">
              <Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input v-model="searchQuery" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" placeholder="ค้นหาบริษัท สาขา จังหวัด หรืออาจารย์">
            </span>
          </label>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center lg:ml-auto">
            <div class="w-full sm:w-48"><UiSelect v-model="roundFilter" :options="roundOptions" label="กรองตามครั้งที่นิเทศ" :label-visible="false" /></div>
            <div class="w-full sm:w-48"><UiSelect v-model="statusFilter" :options="statusOptions" label="กรองตามสถานะ" :label-visible="false" /></div>
            <button type="button" class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink transition-colors hover:bg-surface" aria-label="รีเซ็ตตาราง" title="รีเซ็ตตาราง" @click="resetTable">
              <RotateCcw :size="18" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div v-if="hasActiveFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="text-muted">ตัวกรองที่ใช้:</span>
          <span v-if="searchQuery" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">คำค้น “{{ searchQuery }}”</span>
          <span v-if="roundFilter !== 'all'" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">{{ roundOptions.find(option => option.value === roundFilter)?.label }}</span>
          <span v-if="statusFilter !== 'all'" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">{{ supervisionAppointmentStatusMeta[statusFilter as SupervisionAppointmentStatus].label }}</span>
          <button type="button" class="inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-semibold text-warning hover:bg-warning-soft" @click="clearFilters"><X :size="15" aria-hidden="true" />ล้างทั้งหมด</button>
        </div>
      </div>

      <div v-if="effectiveViewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดตารางนิเทศ">
        <div v-for="row in 3" :key="row" class="grid grid-cols-[7rem_1fr_9rem_1fr_8rem_2rem] gap-4 max-md:grid-cols-[1fr_7rem]">
          <UiSkeleton class="h-10" /><UiSkeleton class="h-10 max-md:hidden" /><UiSkeleton class="h-10 max-md:hidden" /><UiSkeleton class="h-10 max-md:hidden" /><UiSkeleton class="h-10" /><UiSkeleton class="h-10 max-md:hidden" />
        </div>
      </div>
      <div v-else-if="effectiveViewState === 'error'" class="p-5 sm:p-6">
        <AppErrorState title="โหลดตารางนิเทศไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองดึงข้อมูลอีกครั้ง" @retry="retry" />
      </div>
      <div v-else-if="!paginatedAppointments.length" class="p-5 sm:p-6">
        <AppEmptyState :title="hasActiveFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีรายการนิเทศที่เผยแพร่'" :description="hasActiveFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'เมื่อเจ้าหน้าที่เผยแพร่ตารางที่มีชื่อคุณ รายการจะแสดงที่หน้านี้'">
          <UiButton v-if="hasActiveFilters" variant="secondary" @click="clearFilters">ล้างตัวกรอง</UiButton>
        </AppEmptyState>
      </div>

      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[980px] border-collapse text-left text-sm">
            <caption class="sr-only">รายการนัดนิเทศของฉัน</caption>
            <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" class="px-6 py-3">ครั้งที่ / วันที่</th>
                <th scope="col" class="px-4 py-3">สถานประกอบการ</th>
                <th scope="col" class="px-4 py-3">ช่วงเวลา</th>
                <th scope="col" class="px-4 py-3">อาจารย์ผู้นิเทศ</th>
                <th scope="col" class="px-4 py-3">สถานะ</th>
                <th scope="col" class="w-28 px-4 py-3"><span class="sr-only">ดูข้อมูล</span></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-divider">
              <tr v-for="appointment in paginatedAppointments" :key="appointment.id" class="transition-colors hover:bg-surface/70">
                <td class="whitespace-nowrap px-6 py-4"><p class="font-semibold text-ink">นิเทศครั้งที่ {{ appointment.round }}</p><p class="mt-1 text-xs text-muted">{{ formatDate(appointment.date) }}</p></td>
                <td class="max-w-sm px-4 py-4"><p class="font-medium text-ink">{{ company(appointment.companyId)?.name }}</p><p class="mt-1 text-xs text-muted">{{ company(appointment.companyId)?.branch }} · {{ company(appointment.companyId)?.province }}</p></td>
                <td class="whitespace-nowrap px-4 py-4 text-ink">{{ supervisionPeriodMeta[appointment.period].label }}</td>
                <td class="max-w-xs px-4 py-4"><p v-for="lecturerId in appointmentLecturerIds(appointment)" :key="lecturerId" class="leading-6 text-ink">{{ lecturerName(lecturerId) }}</p></td>
                <td class="whitespace-nowrap px-4 py-4"><UiBadge :tone="supervisionAppointmentStatusMeta[appointment.status].tone">{{ supervisionAppointmentStatusMeta[appointment.status].label }}</UiBadge></td>
                <td class="px-4 py-4 text-right"><button type="button" class="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-control border border-divider bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface" :aria-label="`ดูข้อมูล ${appointment.id}`" @click="openDetails(appointment.id)">ดูข้อมูล</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="divide-y divide-divider md:hidden">
          <article v-for="appointment in paginatedAppointments" :key="appointment.id" class="p-5">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0"><p class="font-semibold text-ink">{{ company(appointment.companyId)?.name }}</p><p class="mt-1 text-sm text-muted">นิเทศครั้งที่ {{ appointment.round }} · {{ supervisionPeriodMeta[appointment.period].label }}</p></div>
              <UiBadge :tone="supervisionAppointmentStatusMeta[appointment.status].tone">{{ supervisionAppointmentStatusMeta[appointment.status].label }}</UiBadge>
            </div>
            <p class="mt-3 text-sm font-medium text-ink">{{ formatDate(appointment.date) }}</p>
            <p class="mt-1 text-xs leading-5 text-muted">{{ appointmentLecturerIds(appointment).map(lecturerName).join(', ') }}</p>
            <div class="mt-4 flex justify-end border-t border-divider pt-3"><UiButton size="sm" variant="secondary" @click="openDetails(appointment.id)">ดูข้อมูล</UiButton></div>
          </article>
        </div>

        <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div class="flex items-center gap-3">
            <p class="whitespace-nowrap text-muted">แสดง {{ resultStart }}–{{ resultEnd }} จาก {{ filteredAppointments.length }} รายการ</p>
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

    <UiDialog v-model:open="detailOpen" size="xl" :title="selectedCompany?.name ?? 'รายละเอียดการนิเทศ'" :description="selectedAppointment ? `นิเทศครั้งที่ ${selectedAppointment.round} · ${formatDate(selectedAppointment.date)} · ${supervisionPeriodMeta[selectedAppointment.period].label}` : undefined">
      <div v-if="selectedAppointment" class="space-y-5">
        <div class="grid gap-4 rounded-control border border-divider bg-surface p-4 sm:grid-cols-2">
          <div><p class="text-xs text-muted">สาขา / จังหวัด</p><p class="mt-1 text-sm font-semibold text-ink">{{ selectedCompany?.branch }} · {{ selectedCompany?.province }}</p></div>
          <div><p class="text-xs text-muted">สถานะ</p><div class="mt-1"><UiBadge :tone="supervisionAppointmentStatusMeta[selectedAppointment.status].tone">{{ supervisionAppointmentStatusMeta[selectedAppointment.status].label }}</UiBadge></div></div>
          <div class="sm:col-span-2"><p class="text-xs text-muted">ที่อยู่สถานประกอบการ</p><p class="mt-1 text-sm leading-6 text-ink">{{ selectedCompany?.address }}</p></div>
        </div>

        <section aria-labelledby="student-supervision-lecturers">
          <div class="flex items-center gap-2"><UsersRound :size="18" class="text-primary" aria-hidden="true" /><h4 id="student-supervision-lecturers" class="font-bold text-ink">อาจารย์ผู้นิเทศ</h4></div>
          <div class="mt-3 divide-y divide-divider overflow-hidden rounded-control border border-divider">
            <p v-for="lecturerId in appointmentLecturerIds(selectedAppointment)" :key="lecturerId" class="px-4 py-3 text-sm font-medium text-ink">{{ lecturerName(lecturerId) }}</p>
          </div>
        </section>

        <section aria-labelledby="student-supervision-peers">
          <div class="flex items-center justify-between gap-3"><h4 id="student-supervision-peers" class="font-bold text-ink">นักศึกษาในรายการเดียวกัน</h4><UiBadge tone="info">{{ selectedStudents.length }} คน</UiBadge></div>
          <div class="mt-3 overflow-x-auto rounded-control border border-divider">
            <table class="w-full min-w-[560px] border-collapse text-left text-sm">
              <caption class="sr-only">รายชื่อนักศึกษาในรายการนิเทศเดียวกัน</caption>
              <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th scope="col" class="px-4 py-3">รหัสนักศึกษา</th><th scope="col" class="px-4 py-3">ชื่อ–นามสกุล</th><th scope="col" class="px-4 py-3">ตำแหน่งงาน</th></tr></thead>
              <tbody class="divide-y divide-divider"><tr v-for="student in selectedStudents" :key="student.studentId"><td class="whitespace-nowrap px-4 py-3 text-muted">{{ student.studentId }}</td><td class="px-4 py-3 font-medium text-ink">{{ student.studentName }}<UiBadge v-if="student.studentId === currentStudentId" class="ml-2" tone="info">คุณ</UiBadge></td><td class="px-4 py-3 text-muted">{{ student.position }}</td></tr></tbody>
            </table>
          </div>
        </section>

        <UiAlert v-if="selectedAppointment.status === 'postponed'" tone="warning" title="รายการนี้เลื่อนโดยยังไม่กำหนดวันใหม่">โปรดติดตามวันที่ใหม่จากการแจ้งเตือนในระบบ</UiAlert>
        <UiAlert v-else-if="selectedAppointment.status === 'cancelled'" tone="warning" title="รายการนี้ถูกยกเลิก" />
      </div>
    </UiDialog>
  </div>
</template>
