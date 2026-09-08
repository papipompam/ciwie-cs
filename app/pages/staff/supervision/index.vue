<script setup lang="ts">
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, RotateCcw, Search, Users, X } from '@lucide/vue'
import type { SupervisionAppointment, SupervisionAppointmentStatus } from '~/composables/useSupervisionAppointments'
import { getPageCount, paginateItems } from '~/utils/table'

definePageMeta({ title: 'ตารางนิเทศ', middleware: 'staff-prototype' })
useHead({ title: 'ตารางนิเทศ' })

const { scenario } = useScenario()
const { currentAccount } = useAuthPrototype()
const { cycleId, round } = useSupervisionContext()
const { appointments } = useSupervisionAppointments()
const { groups, getCompanies } = useSupervisionGroups()
const { people } = usePeopleDirectory()
const { studentEvaluations, companyEvaluations } = useSupervisionEvaluations()
const { exportStudentEvaluations } = useEvaluationExport()
const { showToast } = useToast()
const exportFormat = ref('xlsx')
const exporting = ref(false)
const exportError = ref('')
const handleExport = async () => {
  if (exporting.value || effectiveViewState.value !== 'data') return
  exporting.value = true
  exportError.value = ''
  try {
    const count = await exportStudentEvaluations(filteredAppointments.value, exportFormat.value)
    showToast({ title: 'ส่งออกคะแนนนักศึกษาแล้ว', description: `${count} รายการประเมิน · ${exportFormat.value.toUpperCase()}` })
  }
  catch (cause) { exportError.value = cause instanceof Error ? cause.message : 'ส่งออกไม่สำเร็จ กรุณาลองใหม่' }
  finally { exporting.value = false }
}

const searchQuery = ref('')
const statusFilter = ref<'all' | SupervisionAppointmentStatus>('all')
const pageSize = ref('10')
const currentPage = ref(1)
const detailOpen = ref(false)
const selectedAppointmentId = ref<string | null>(null)

const effectiveViewState = computed(() => scenario.value.forceError ? 'error' : scenario.value.viewState)
const companies = computed(() => getCompanies(cycleId.value))
const sourceAppointments = computed(() => scenario.value.viewState === 'empty'
  ? []
  : appointments.value.filter(item => item.cycleId === cycleId.value && item.round === round.value))
const selectedAppointment = computed(() => appointments.value.find(item => item.id === selectedAppointmentId.value) ?? null)
const statusOptions = [
  { value: 'all', label: 'ทุกสถานะ' },
  ...Object.entries(supervisionAppointmentStatusMeta).map(([value, meta]) => ({ value, label: meta.label })),
]
const pageSizeOptions = ['10', '20', '50', '100'].map(value => ({ value, label: value }))

const companyFor = (companyId: string) => companies.value.find(company => company.id === companyId)
const groupFor = (groupId: string) => groups.value.find(group => group.id === groupId)
const lecturerName = (lecturerId: string) => {
  const lecturer = people.value.find(person => person.type === 'lecturer' && person.id === lecturerId)
  return lecturer ? getPersonFullName(lecturer) : lecturerId
}
const evaluatorName = (evaluatorId: string) => {
  if (currentAccount.value?.id === evaluatorId) return currentAccount.value.name
  return lecturerName(evaluatorId)
}
const appointmentStudents = (appointment: SupervisionAppointment) => {
  const company = companyFor(appointment.companyId)
  return appointment.studentIds.map((studentId) => {
    const student = company?.students.find(item => item.studentId === studentId)
    return student?.studentName ?? studentId
  })
}
const formatDate = (date: string) => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  .format(new Date(`${date}T00:00:00+07:00`))
const submittedEvaluationCount = (appointment: SupervisionAppointment) => studentEvaluations.value
  .filter(item => item.appointmentId === appointment.id && item.status === 'submitted').length
  + companyEvaluations.value.filter(item => item.appointmentId === appointment.id && item.status === 'submitted').length
const requiredEvaluationCount = (appointment: SupervisionAppointment) => {
  const evaluatorCount = appointment.result.actualLecturerIds.length || appointment.lecturerIds.length
  return evaluatorCount * appointment.studentIds.length + 1
}

const summaryCards = computed(() => [
  { label: 'รายการนิเทศทั้งหมด', value: sourceAppointments.value.length, icon: CalendarDays, tone: 'bg-info-soft text-info' },
  { label: 'รอการนิเทศ', value: sourceAppointments.value.filter(item => item.status === 'published').length, icon: Clock3, tone: 'bg-warning-soft text-warning' },
  { label: 'นิเทศเสร็จแล้ว', value: sourceAppointments.value.filter(item => item.status === 'completed').length, icon: CheckCircle2, tone: 'bg-success-soft text-success' },
  { label: 'นักศึกษาในตาราง', value: new Set(sourceAppointments.value.flatMap(item => item.studentIds)).size, icon: Users, tone: 'bg-surface text-ink' },
])
const filteredAppointments = computed(() => {
  const keyword = searchQuery.value.trim().toLocaleLowerCase('th')
  return sourceAppointments.value
    .filter(item => statusFilter.value === 'all' || item.status === statusFilter.value)
    .filter((item) => {
      const values = [
        item.id,
        companyFor(item.companyId)?.name ?? '',
        groupFor(item.groupId)?.name ?? '',
        ...item.lecturerIds.map(lecturerName),
        ...appointmentStudents(item),
      ]
      return !keyword || values.some(value => value.toLocaleLowerCase('th').includes(keyword))
    })
    .toSorted((a, b) => a.date.localeCompare(b.date))
})
const pageSizeNumber = computed(() => Number(pageSize.value))
const pageCount = computed(() => getPageCount(filteredAppointments.value.length, pageSizeNumber.value))
const paginatedAppointments = computed(() => paginateItems(filteredAppointments.value, currentPage.value, pageSizeNumber.value))
const resultStart = computed(() => filteredAppointments.value.length ? (currentPage.value - 1) * pageSizeNumber.value + 1 : 0)
const resultEnd = computed(() => Math.min(currentPage.value * pageSizeNumber.value, filteredAppointments.value.length))
const hasActiveFilters = computed(() => Boolean(searchQuery.value.trim()) || statusFilter.value !== 'all')
const activeStatusLabel = computed(() => statusOptions.find(option => option.value === statusFilter.value)?.label)

const openDetails = (appointment: SupervisionAppointment) => {
  selectedAppointmentId.value = appointment.id
  detailOpen.value = true
}
const clearFilters = () => {
  searchQuery.value = ''
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

watch([searchQuery, statusFilter, pageSize, cycleId, round], () => { currentPage.value = 1 })
watch(pageCount, (count) => { if (currentPage.value > count) currentPage.value = count })
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">ตารางนิเทศ</h2>
      <p class="mt-1 text-sm leading-6 text-muted">ติดตามรายการนิเทศของทุกกลุ่ม อาจารย์ผู้เข้าร่วม นักศึกษา และความคืบหน้าการประเมิน</p>
      <div class="mt-3 flex justify-end">
        <UiDialog :close-on-confirm="false" title="ส่งออกคะแนนประเมินนักศึกษา" description="ส่งออกเฉพาะแบบประเมินนักศึกษาที่ส่งแล้ว ตามรอบ ครั้ง และตัวกรองปัจจุบัน หนึ่งแถวต่อรายการ พร้อมชื่อ ตำแหน่ง บริษัท คะแนนเฉลี่ย และคะแนนทุกหัวข้อ">
          <template #trigger><UiButton variant="secondary" :icon="Download" :disabled="effectiveViewState !== 'data'">ส่งออกคะแนนนักศึกษา</UiButton></template>
          <UiSelect v-model="exportFormat" :options="[{ value: 'xlsx', label: 'Excel (.xlsx)' }, { value: 'csv', label: 'CSV (.csv)' }]" label="รูปแบบไฟล์" />
          <p v-if="exportError" role="alert" class="mt-3 text-sm text-danger">{{ exportError }}</p>
          <template #cancel><UiButton variant="ghost">ปิด</UiButton></template>
          <template #confirm><UiButton :icon="Download" :loading="exporting" @click="handleExport">ดาวน์โหลดคะแนน</UiButton></template>
        </UiDialog>
      </div>
    </div>

    <div v-if="effectiveViewState === 'loading'" class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="กำลังโหลดสรุปตารางนิเทศ">
      <UiCard v-for="item in 4" :key="item"><UiSkeleton class="h-16" /></UiCard>
    </div>
    <div v-else class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <UiCard v-for="card in summaryCards" :key="card.label" class="flex items-center gap-4">
        <span class="grid size-11 shrink-0 place-items-center rounded-control" :class="card.tone"><component :is="card.icon" :size="20" aria-hidden="true" /></span>
        <div><p class="text-xs font-medium text-muted">{{ card.label }}</p><p class="mt-1 text-2xl font-bold text-ink">{{ card.value }}</p></div>
      </UiCard>
    </div>

    <UiCard :padded="false">
      <div class="border-b border-divider p-5 sm:p-6">
        <div>
          <h3 class="text-lg font-bold text-ink">รายการนิเทศทุกกลุ่ม</h3>
          <p class="mt-1 text-sm leading-6 text-muted">เลือกดูรายละเอียดเพื่อเช็กบริษัท รายชื่อนักศึกษา และอาจารย์ผู้เข้าร่วม</p>
        </div>
        <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label class="block w-full text-sm font-semibold text-ink sm:max-w-md lg:w-96 lg:flex-none">
            <span class="sr-only">ค้นหารายการนิเทศ</span>
            <span class="relative block"><Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" /><input v-model="searchQuery" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" placeholder="ค้นหาบริษัท กลุ่ม อาจารย์ หรือนักศึกษา"></span>
          </label>
          <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
            <div class="w-full sm:w-52"><UiSelect v-model="statusFilter" :options="statusOptions" label="กรองตามสถานะ" :label-visible="false" /></div>
            <button type="button" class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink hover:bg-surface" aria-label="รีเซ็ตตาราง" title="รีเซ็ตตาราง" @click="resetTable"><RotateCcw :size="18" aria-hidden="true" /></button>
          </div>
        </div>
        <div v-if="hasActiveFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="text-muted">ตัวกรองที่ใช้:</span>
          <span v-if="searchQuery" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">คำค้น “{{ searchQuery }}”</span>
          <span v-if="statusFilter !== 'all'" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">{{ activeStatusLabel }}</span>
          <button type="button" class="inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-semibold text-warning hover:bg-warning-soft" @click="clearFilters"><X :size="15" aria-hidden="true" />ล้างทั้งหมด</button>
        </div>
      </div>

      <div v-if="effectiveViewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดรายการนิเทศ"><UiSkeleton v-for="row in 5" :key="row" class="h-14" /></div>
      <div v-else-if="effectiveViewState === 'error'" class="p-5 sm:p-6"><AppErrorState title="โหลดตารางนิเทศไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง" @retry="retry" /></div>
      <div v-else-if="!paginatedAppointments.length" class="p-5 sm:p-6"><AppEmptyState :title="hasActiveFilters ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีตารางนิเทศในรอบนี้'" :description="hasActiveFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'จัดกลุ่มอาจารย์และกำหนดรายการนิเทศก่อน ตารางจึงจะแสดงที่นี่'" /></div>
      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[1120px] border-collapse text-left text-sm">
            <caption class="sr-only">รายการนิเทศของทุกกลุ่มอาจารย์</caption>
            <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th class="px-6 py-3">สถานประกอบการ</th><th class="px-4 py-3">วันนิเทศ</th><th class="px-4 py-3">กลุ่ม / อาจารย์</th><th class="px-4 py-3">นักศึกษา</th><th class="px-4 py-3">การประเมิน</th><th class="px-4 py-3">สถานะ</th><th class="w-28 px-4 py-3"><span class="sr-only">ดูข้อมูล</span></th></tr></thead>
            <tbody class="divide-y divide-divider">
              <tr v-for="appointment in paginatedAppointments" :key="appointment.id" class="hover:bg-surface/70">
                <td class="px-6 py-4"><p class="font-semibold text-ink">{{ companyFor(appointment.companyId)?.name ?? appointment.companyId }}</p><p class="mt-1 text-xs text-muted">{{ companyFor(appointment.companyId)?.branch }} · {{ companyFor(appointment.companyId)?.province }}</p></td>
                <td class="whitespace-nowrap px-4 py-4"><p class="font-medium text-ink">{{ formatDate(appointment.date) }}</p><p class="mt-1 text-xs text-muted">{{ appointment.id }}</p></td>
                <td class="px-4 py-4"><p class="font-medium text-ink">{{ groupFor(appointment.groupId)?.name ?? appointment.groupId }}</p><p class="mt-1 text-xs text-muted">{{ appointment.lecturerIds.map(lecturerName).join(', ') || 'ยังไม่มีอาจารย์' }}</p></td>
                <td class="px-4 py-4"><p class="font-semibold text-ink">{{ appointment.studentIds.length }} คน</p><p class="mt-1 text-xs text-muted">ดูรายชื่อในรายละเอียด</p></td>
                <td class="whitespace-nowrap px-4 py-4 text-muted"><template v-if="appointment.status === 'completed'">{{ submittedEvaluationCount(appointment) }} / {{ requiredEvaluationCount(appointment) }} รายการ</template><template v-else>ยังไม่เริ่ม</template></td>
                <td class="whitespace-nowrap px-4 py-4"><UiBadge :tone="supervisionAppointmentStatusMeta[appointment.status].tone">{{ supervisionAppointmentStatusMeta[appointment.status].label }}</UiBadge></td>
                <td class="px-4 py-4 text-right"><UiButton size="sm" variant="secondary" @click="openDetails(appointment)">ดูข้อมูล</UiButton></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="divide-y divide-divider md:hidden">
          <article v-for="appointment in paginatedAppointments" :key="appointment.id" class="p-5">
            <div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="font-semibold text-ink">{{ companyFor(appointment.companyId)?.name ?? appointment.companyId }}</h3><p class="mt-1 text-xs text-muted">{{ appointment.id }} · {{ groupFor(appointment.groupId)?.name }}</p></div><UiBadge :tone="supervisionAppointmentStatusMeta[appointment.status].tone">{{ supervisionAppointmentStatusMeta[appointment.status].label }}</UiBadge></div>
            <p class="mt-3 text-sm text-muted">{{ formatDate(appointment.date) }} · นักศึกษา {{ appointment.studentIds.length }} คน</p>
            <div class="mt-4 flex justify-end border-t border-divider pt-3"><UiButton size="sm" variant="secondary" @click="openDetails(appointment)">ดูข้อมูล</UiButton></div>
          </article>
        </div>
        <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"><div class="flex items-center gap-3"><p class="whitespace-nowrap text-muted">แสดง {{ resultStart }}–{{ resultEnd }} จาก {{ filteredAppointments.length }} รายการ</p><div class="w-20 shrink-0"><UiSelect v-model="pageSize" :options="pageSizeOptions" label="จำนวนรายการต่อหน้า" :label-visible="false" /></div></div><nav class="flex items-center gap-2" aria-label="การแบ่งหน้าตาราง"><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === 1" aria-label="หน้าก่อนหน้า" @click="currentPage--"><ChevronLeft :size="18" aria-hidden="true" /></button><span class="min-w-20 text-center font-semibold text-ink">หน้า {{ currentPage }} / {{ pageCount }}</span><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === pageCount" aria-label="หน้าถัดไป" @click="currentPage++"><ChevronRight :size="18" aria-hidden="true" /></button></nav></div>
      </template>
    </UiCard>

    <UiDialog v-model:open="detailOpen" size="xl" :title="selectedAppointment ? `รายละเอียด ${selectedAppointment.id}` : 'รายละเอียดการนิเทศ'" :description="selectedAppointment ? `${companyFor(selectedAppointment.companyId)?.name ?? selectedAppointment.companyId} · ${formatDate(selectedAppointment.date)}` : undefined">
      <div v-if="selectedAppointment" class="space-y-5">
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-control bg-surface p-4"><p class="text-xs font-medium text-muted">กลุ่มรับผิดชอบ</p><p class="mt-1 font-semibold text-ink">{{ groupFor(selectedAppointment.groupId)?.name ?? selectedAppointment.groupId }}</p></div>
          <div class="rounded-control bg-surface p-4"><p class="text-xs font-medium text-muted">สถานะ</p><UiBadge class="mt-2" :tone="supervisionAppointmentStatusMeta[selectedAppointment.status].tone">{{ supervisionAppointmentStatusMeta[selectedAppointment.status].label }}</UiBadge></div>
          <div class="rounded-control bg-surface p-4"><p class="text-xs font-medium text-muted">ความคืบหน้าการประเมิน</p><p class="mt-1 font-semibold text-ink">{{ selectedAppointment.status === 'completed' ? `${submittedEvaluationCount(selectedAppointment)} / ${requiredEvaluationCount(selectedAppointment)} รายการ` : 'ยังไม่เริ่ม' }}</p></div>
        </div>
        <div><h3 class="text-sm font-bold text-ink">อาจารย์ผู้เข้าร่วม</h3><div class="mt-2 rounded-control border border-divider p-4"><p v-for="lecturerId in selectedAppointment.lecturerIds" :key="lecturerId" class="text-sm leading-7 text-ink">{{ lecturerName(lecturerId) }}</p><p v-if="!selectedAppointment.lecturerIds.length" class="text-sm text-muted">ยังไม่มีอาจารย์ผู้เข้าร่วม</p></div></div>
        <div><h3 class="text-sm font-bold text-ink">นักศึกษา</h3><div class="mt-2 overflow-hidden rounded-control border border-divider"><div v-for="(studentName, index) in appointmentStudents(selectedAppointment)" :key="selectedAppointment.studentIds[index]" class="flex items-center justify-between gap-4 border-b border-divider px-4 py-3 last:border-0"><p class="text-sm font-medium text-ink">{{ studentName }}</p><p class="text-xs text-muted">{{ selectedAppointment.studentIds[index] }}</p></div></div></div>
        <UiAlert v-if="selectedAppointment.status !== 'completed'" tone="info" title="ยังไม่เปิดให้ประเมินสถานประกอบการ">สามารถประเมินได้หลังรายการนิเทศเสร็จแล้ว</UiAlert>
        <SupervisionEvaluationPanel
          v-else
          :appointment="selectedAppointment"
          :students="[]"
          :current-lecturer-id="currentAccount?.id ?? 'staff'"
          :lecturer-name="evaluatorName"
          :can-manage="true"
          company-only
          allow-company-evaluation
        />
      </div>
    </UiDialog>
  </div>
</template>
