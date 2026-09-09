<script setup lang="ts">
import { ArrowDown, ArrowUp, BriefcaseBusiness, CheckCircle2, ChevronLeft, ChevronRight, Clock3, RotateCcw, Search, Users, X } from '@lucide/vue'
import { selectableCoopSemester } from '~/composables/useCoopCycles'
import type { PersonRecord } from '~/composables/usePeopleDirectory'
import type { StudentApplication, TrackedApplicationStatus } from '~/composables/useStudentApplications'
import { getPageCount, paginateItems } from '~/utils/table'

definePageMeta({
  title: 'การสมัครสหกิจของนักศึกษา',
  middleware: 'applications-prototype',
  alias: ['/staff/applications'],
})
useHead({ title: 'การสมัครสหกิจของนักศึกษา' })

const { scenario } = useScenario()
const { people, loadPersistedPeople } = usePeopleDirectory()
const { applications, getStudentApplications, updateApplicationStatus } = useStudentApplications()
const { showToast } = useToast()
const staffApplicationsEndpoint: string = '/api/staff/student-applications'
const { data: persistedApplications, status: applicationFetchStatus, error: applicationFetchError, refresh: refreshApplications } = await useFetch<StudentApplication[]>(staffApplicationsEndpoint, { immediate: scenario.value.role === 'staff' })
watch(persistedApplications, (items) => { if (items && scenario.value.role === 'staff') applications.value = items }, { immediate: true })
const { status: peopleFetchStatus, error: peopleFetchError, refresh: refreshPeople } = await useAsyncData(
  'applications-students-directory',
  () => loadPersistedPeople('student'),
)
watch(() => scenario.value.role, (role) => {
  if (import.meta.client && (role === 'staff' || role === 'lecturer')) {
    void refreshPeople()
    if (role === 'staff') void refreshApplications()
  }
})
const { studentCohort, studentSection, studentSemester } = useStudentCohortContext()
const isStaffView = computed(() => scenario.value.role === 'staff')
const pageDescription = computed(() => isStaffView.value
  ? 'ติดตามบริษัทที่นักศึกษาแต่ละคนยื่นสมัคร ตำแหน่ง และสถานะการตอบกลับล่าสุดของนักศึกษาทั้งหมด'
  : 'ดูบริษัทที่นักศึกษาแต่ละคนยื่นสมัคร ตำแหน่ง และสถานะการตอบกลับล่าสุด')

const searchQuery = ref('')
const statusFilter = ref('all')
const provinceFilter = ref('all')
const sortDirection = ref<'asc' | 'desc'>('desc')
const pageSize = ref('10')
const currentPage = ref(1)
const detailOpen = ref(false)
const selectedStudentId = ref<string | null>(null)
const decidingApplicationId = ref<string | null>(null)

const students = computed(() => people.value.filter((person): person is PersonRecord => person.type === 'student'))
const studentFor = (studentId: string) => students.value.find(student => student.id === studentId)
const selectedStudent = computed(() => selectedStudentId.value ? studentFor(selectedStudentId.value) : undefined)
const selectedApplications = computed(() => selectedStudentId.value ? getStudentApplications(selectedStudentId.value) : [])
const effectiveViewState = computed(() => {
  if (scenario.value.forceError || (isStaffView.value && (applicationFetchError.value || peopleFetchError.value))) return 'error'
  if (scenario.value.viewState === 'loading' || (isStaffView.value && (applicationFetchStatus.value === 'pending' || peopleFetchStatus.value === 'pending'))) return 'loading'
  return scenario.value.viewState
})
const statusOptions = [
  { value: 'all', label: 'ทุกสถานะ' },
  ...trackedApplicationStatusOptions,
]
const provinceOptions = computed(() => [
  { value: 'all', label: 'ทุกจังหวัด' },
  ...[...new Set(applications.value.map(application => application.province))]
    .sort((a, b) => a.localeCompare(b, 'th'))
    .map(province => ({ value: province, label: province })),
])
const pageSizeOptions = ['10', '20', '50', '100'].map(value => ({ value, label: value }))

const cohortApplications = computed(() => {
  if (scenario.value.viewState === 'empty') return []
  return applications.value.filter((application) => {
    const student = studentFor(application.studentId)
    return student
      && (studentCohort.value === 'all' || getStudentCohortYear(student.id) === studentCohort.value)
      && (studentSection.value === 'all' || student.section === studentSection.value)
      && getStudentSemester(student.cycle) === selectableCoopSemester
  })
})
const summaryCards = computed(() => {
  const studentCount = new Set(cohortApplications.value.map(application => application.studentId)).size
  const waitingStatuses = ['submitted', 'waiting-response', 'responded', 'waiting-interview']
  return [
    { label: 'นักศึกษาที่มีการสมัคร', value: studentCount, icon: Users, tone: 'bg-surface text-ink' },
    { label: 'รายการสมัครทั้งหมด', value: cohortApplications.value.length, icon: BriefcaseBusiness, tone: 'bg-info-soft text-info' },
    { label: 'อยู่ระหว่างดำเนินการ', value: cohortApplications.value.filter(application => waitingStatuses.includes(application.status)).length, icon: Clock3, tone: 'bg-warning-soft text-warning' },
    { label: 'ผ่านการสมัคร', value: cohortApplications.value.filter(application => application.status === 'accepted').length, icon: CheckCircle2, tone: 'bg-success-soft text-success' },
  ]
})
const filteredApplications = computed(() => {
  const keyword = searchQuery.value.trim().toLocaleLowerCase('th')
  return cohortApplications.value
    .filter((application) => {
      const student = studentFor(application.studentId)
      const searchable = [
        application.studentId,
        student ? getPersonFullName(student) : '',
        application.companyName,
        application.position,
      ]
      return !keyword || searchable.some(value => value.toLocaleLowerCase('th').includes(keyword))
    })
    .filter(application => statusFilter.value === 'all' || application.status === statusFilter.value)
    .filter(application => provinceFilter.value === 'all' || application.province === provinceFilter.value)
    .toSorted((a, b) => {
      const comparison = a.appliedAt.localeCompare(b.appliedAt)
      return sortDirection.value === 'asc' ? comparison : -comparison
    })
})
const pageSizeNumber = computed(() => Number(pageSize.value))
const pageCount = computed(() => getPageCount(filteredApplications.value.length, pageSizeNumber.value))
const paginatedApplications = computed(() => paginateItems(filteredApplications.value, currentPage.value, pageSizeNumber.value))
const resultStart = computed(() => filteredApplications.value.length ? (currentPage.value - 1) * pageSizeNumber.value + 1 : 0)
const resultEnd = computed(() => Math.min(currentPage.value * pageSizeNumber.value, filteredApplications.value.length))
const hasActiveFilters = computed(() => Boolean(searchQuery.value.trim()) || statusFilter.value !== 'all' || provinceFilter.value !== 'all')
const activeStatusLabel = computed(() => statusOptions.find(option => option.value === statusFilter.value)?.label)

watch([searchQuery, statusFilter, provinceFilter, pageSize, studentCohort, studentSection, studentSemester], () => {
  currentPage.value = 1
})
watch(pageCount, (count) => {
  if (currentPage.value > count) currentPage.value = count
})

const openStudentApplications = (studentId: string) => {
  selectedStudentId.value = studentId
  detailOpen.value = true
}
const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
  provinceFilter.value = 'all'
}
const resetTable = () => {
  clearFilters()
  sortDirection.value = 'desc'
  pageSize.value = '10'
  currentPage.value = 1
}
const retry = async () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
  await refreshPeople()
  if (isStaffView.value) await refreshApplications()
}
const toggleDateSort = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  currentPage.value = 1
}
const decideApplication = async (id: string, status: Extract<TrackedApplicationStatus, 'accepted' | 'rejected'>) => {
  if (!isStaffView.value || decidingApplicationId.value) return
  decidingApplicationId.value = id
  try {
    await updateApplicationStatus(id, status)
    showToast({ title: status === 'accepted' ? 'บันทึกการตอบรับแล้ว' : 'บันทึกการปฏิเสธแล้ว' })
  }
  catch {
    await refreshApplications()
    showToast({ title: 'บันทึกผลไม่สำเร็จ', description: 'สถานะอาจเปลี่ยนแล้ว กรุณาตรวจสอบอีกครั้ง' })
  }
  finally { decidingApplicationId.value = null }
}
const formatDate = (date: string) => new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}).format(new Date(`${date}T00:00:00+07:00`))
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">การสมัครสหกิจของนักศึกษา</h2>
      <p class="mt-1 text-sm leading-6 text-muted">{{ pageDescription }}</p>
    </div>

    <div v-if="effectiveViewState === 'loading'" class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="กำลังโหลดสรุปการสมัคร">
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
          <h3 class="text-lg font-bold text-ink">รายการสมัครของนักศึกษา</h3>
          <p class="mt-1 text-sm leading-6 text-muted">หนึ่งแถวต่อหนึ่งบริษัทที่นักศึกษาบันทึกไว้</p>
        </div>
        <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label class="block w-full text-sm font-semibold text-ink sm:max-w-md lg:w-96 lg:flex-none">
            <span class="sr-only">ค้นหานักศึกษา บริษัท หรือตำแหน่ง</span>
            <span class="relative block"><Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" /><input v-model="searchQuery" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" placeholder="ค้นหารหัส ชื่อนักศึกษา บริษัท หรือตำแหน่ง"></span>
          </label>
          <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
            <div class="w-full sm:w-52"><UiSelect v-model="statusFilter" :options="statusOptions" label="กรองตามสถานะ" :label-visible="false" /></div>
            <div class="w-full sm:w-48"><UiSelect v-model="provinceFilter" :options="provinceOptions" label="กรองตามจังหวัด" :label-visible="false" /></div>
            <button type="button" class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink hover:bg-surface" aria-label="รีเซ็ตตาราง" title="รีเซ็ตตาราง" @click="resetTable"><RotateCcw :size="18" aria-hidden="true" /></button>
          </div>
        </div>
        <div v-if="hasActiveFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="text-muted">ตัวกรองที่ใช้:</span>
          <span v-if="searchQuery" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">คำค้น “{{ searchQuery }}”</span>
          <span v-if="statusFilter !== 'all'" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">{{ activeStatusLabel }}</span>
          <span v-if="provinceFilter !== 'all'" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">{{ provinceFilter }}</span>
          <button type="button" class="inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-semibold text-warning hover:bg-warning-soft" @click="clearFilters"><X :size="15" aria-hidden="true" />ล้างทั้งหมด</button>
        </div>
      </div>

      <div v-if="effectiveViewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดการสมัครของนักศึกษา"><div v-for="row in 5" :key="row" class="grid grid-cols-[1fr_1.3fr_8rem_9rem_6rem] gap-4 max-md:grid-cols-[1fr_8rem]"><UiSkeleton class="h-10" /><UiSkeleton class="h-10 max-md:hidden" /><UiSkeleton class="h-10 max-md:hidden" /><UiSkeleton class="h-10" /><UiSkeleton class="h-10 max-md:hidden" /></div></div>
      <div v-else-if="effectiveViewState === 'error'" class="p-5 sm:p-6"><AppErrorState title="โหลดข้อมูลการสมัครไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองดึงข้อมูลอีกครั้ง" @retry="retry" /></div>
      <div v-else-if="!paginatedApplications.length" class="p-5 sm:p-6">
        <AppEmptyState :title="hasActiveFilters ? 'ไม่พบการสมัครที่ตรงกับตัวกรอง' : 'ยังไม่มีข้อมูลการสมัครในกลุ่มที่เลือก'" :description="hasActiveFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'เมื่อนักศึกษาเพิ่มบริษัทที่สมัคร รายการจะแสดงที่หน้านี้'"><UiButton v-if="hasActiveFilters" variant="secondary" @click="clearFilters">ล้างตัวกรอง</UiButton></AppEmptyState>
      </div>

      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[1080px] border-collapse text-left text-sm">
            <caption class="sr-only">รายการบริษัทที่นักศึกษาแต่ละคนสมัครสหกิจ</caption>
            <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th class="px-6 py-3">นักศึกษา</th><th class="px-4 py-3">บริษัท / ตำแหน่ง</th><th class="px-4 py-3">จังหวัด</th><th class="px-4 py-3" :aria-sort="sortDirection === 'asc' ? 'ascending' : 'descending'"><button type="button" class="inline-flex items-center gap-1 font-semibold hover:text-ink" :aria-label="`เรียงวันที่สมัคร${sortDirection === 'asc' ? 'จากใหม่ไปเก่า' : 'จากเก่าไปใหม่'}`" @click="toggleDateSort">วันที่สมัคร <ArrowUp v-if="sortDirection === 'asc'" :size="15" aria-hidden="true" /><ArrowDown v-else :size="15" aria-hidden="true" /></button></th><th class="px-4 py-3">สถานะ</th><th class="w-28 px-4 py-3"><span class="sr-only">ดูข้อมูล</span></th></tr></thead>
            <tbody class="divide-y divide-divider">
              <tr v-for="application in paginatedApplications" :key="application.id" class="hover:bg-surface/70">
                <td class="px-6 py-4"><p class="font-semibold text-ink">{{ studentFor(application.studentId) ? getPersonFullName(studentFor(application.studentId)!) : 'ไม่พบข้อมูลนักศึกษา' }}</p><p class="mt-1 text-xs text-muted">{{ application.studentId }} · {{ studentFor(application.studentId)?.section || 'ยังไม่กำหนดหมู่' }}</p></td>
                <td class="max-w-md px-4 py-4"><p class="font-medium text-ink">{{ application.companyName }}</p><p class="mt-1 text-xs text-muted">{{ application.position }}</p></td>
                <td class="whitespace-nowrap px-4 py-4 text-muted">{{ application.province }}</td>
                <td class="whitespace-nowrap px-4 py-4 text-muted">{{ formatDate(application.appliedAt) }}</td>
                <td class="whitespace-nowrap px-4 py-4"><UiBadge :tone="trackedApplicationStatusMeta[application.status].tone">{{ trackedApplicationStatusMeta[application.status].label }}</UiBadge></td>
                <td class="px-4 py-4 text-right"><UiButton class="whitespace-nowrap" size="sm" variant="secondary" @click="openStudentApplications(application.studentId)">ดูทั้งหมด</UiButton></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="divide-y divide-divider md:hidden">
          <article v-for="application in paginatedApplications" :key="application.id" class="p-5">
            <div class="flex items-start justify-between gap-3"><div><h3 class="font-semibold text-ink">{{ studentFor(application.studentId) ? getPersonFullName(studentFor(application.studentId)!) : application.studentId }}</h3><p class="mt-1 text-xs text-muted">{{ application.studentId }} · {{ studentFor(application.studentId)?.section || 'ยังไม่กำหนดหมู่' }}</p></div><UiBadge :tone="trackedApplicationStatusMeta[application.status].tone">{{ trackedApplicationStatusMeta[application.status].label }}</UiBadge></div>
            <div class="mt-4"><p class="font-medium text-ink">{{ application.companyName }}</p><p class="mt-1 text-sm text-muted">{{ application.position }}</p><p class="mt-2 text-xs text-muted">{{ application.province }} · {{ formatDate(application.appliedAt) }}</p></div>
            <div class="mt-4 flex justify-end border-t border-divider pt-3"><UiButton class="whitespace-nowrap" size="sm" variant="secondary" @click="openStudentApplications(application.studentId)">ดูบริษัททั้งหมด</UiButton></div>
          </article>
        </div>
        <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"><div class="flex items-center gap-3"><p class="whitespace-nowrap text-muted">แสดง {{ resultStart }}–{{ resultEnd }} จาก {{ filteredApplications.length }} รายการ</p><div class="w-20 shrink-0"><UiSelect v-model="pageSize" :options="pageSizeOptions" label="จำนวนรายการต่อหน้า" :label-visible="false" /></div></div><nav class="flex items-center gap-2" aria-label="การแบ่งหน้าตาราง"><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === 1" aria-label="หน้าก่อนหน้า" @click="currentPage--"><ChevronLeft :size="18" aria-hidden="true" /></button><span class="min-w-20 text-center font-semibold text-ink">หน้า {{ currentPage }} / {{ pageCount }}</span><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === pageCount" aria-label="หน้าถัดไป" @click="currentPage++"><ChevronRight :size="18" aria-hidden="true" /></button></nav></div>
      </template>
    </UiCard>

    <UiDialog v-model:open="detailOpen" size="xl" :title="selectedStudent ? `บริษัทที่ ${getPersonFullName(selectedStudent)} สมัคร` : 'รายการสมัครของนักศึกษา'" :description="selectedStudent ? `${selectedStudent.id} · ${selectedStudent.section || 'ยังไม่กำหนดหมู่'} · ${selectedApplications.length} บริษัท` : undefined">
      <div v-if="selectedApplications.length" class="overflow-hidden rounded-panel border border-divider">
        <div class="hidden overflow-x-auto sm:block"><table class="w-full min-w-[820px] text-left text-sm"><thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th class="px-4 py-3">บริษัท / ตำแหน่ง</th><th class="px-4 py-3">จังหวัด</th><th class="px-4 py-3">วันที่สมัคร</th><th class="px-4 py-3">สถานะ</th><th v-if="isStaffView" class="px-4 py-3">ผลจากบริษัท</th></tr></thead><tbody class="divide-y divide-divider"><tr v-for="application in selectedApplications" :key="application.id"><td class="px-4 py-4"><p class="font-medium text-ink">{{ application.companyName }}</p><p class="mt-1 text-xs text-muted">{{ application.position }}</p></td><td class="px-4 py-4 text-muted">{{ application.province }}</td><td class="whitespace-nowrap px-4 py-4 text-muted">{{ formatDate(application.appliedAt) }}</td><td class="px-4 py-4"><UiBadge :tone="trackedApplicationStatusMeta[application.status].tone">{{ trackedApplicationStatusMeta[application.status].label }}</UiBadge></td><td v-if="isStaffView" class="px-4 py-4"><div v-if="!['accepted', 'rejected', 'completed', 'cancelled'].includes(application.status)" class="flex gap-2"><UiButton size="sm" :loading="decidingApplicationId === application.id" @click="decideApplication(application.id, 'accepted')">ตอบรับ</UiButton><UiButton size="sm" variant="secondary" :disabled="Boolean(decidingApplicationId)" @click="decideApplication(application.id, 'rejected')">ปฏิเสธ</UiButton></div><span v-else class="text-xs text-muted">บันทึกผลแล้ว</span></td></tr></tbody></table></div>
        <div class="divide-y divide-divider sm:hidden"><article v-for="application in selectedApplications" :key="application.id" class="p-4"><div class="flex items-start justify-between gap-3"><div><p class="font-medium text-ink">{{ application.companyName }}</p><p class="mt-1 text-sm text-muted">{{ application.position }}</p></div><UiBadge :tone="trackedApplicationStatusMeta[application.status].tone">{{ trackedApplicationStatusMeta[application.status].label }}</UiBadge></div><p class="mt-3 text-xs text-muted">{{ application.province }} · {{ formatDate(application.appliedAt) }}</p><div v-if="isStaffView && !['accepted', 'rejected', 'completed', 'cancelled'].includes(application.status)" class="mt-4 flex gap-2 border-t border-divider pt-3"><UiButton size="sm" :loading="decidingApplicationId === application.id" @click="decideApplication(application.id, 'accepted')">ตอบรับ</UiButton><UiButton size="sm" variant="secondary" :disabled="Boolean(decidingApplicationId)" @click="decideApplication(application.id, 'rejected')">ปฏิเสธ</UiButton></div></article></div>
      </div>
      <AppEmptyState v-else title="ยังไม่มีบริษัทที่สมัคร" description="นักศึกษารายนี้ยังไม่ได้เพิ่มข้อมูลบริษัทที่สมัครไว้" />
    </UiDialog>
  </div>
</template>
