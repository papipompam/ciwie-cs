<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Plus, RotateCcw, Search, Upload } from '@lucide/vue'
import type { PeopleFileFormat } from '~/composables/usePeopleImport'
import type { PersonRecord, PersonType } from '~/composables/usePeopleDirectory'
import { selectableCoopSemester } from '~/composables/useCoopCycles'
import { getPageCount, paginateItems } from '~/utils/table'
import { hasConfirmedPlacement as hasPlacement } from '~/utils/studentPlacementStatus'

definePageMeta({ title: 'ข้อมูลบุคคล', middleware: 'staff-prototype' })

const route = useRoute()
const { scenario } = useScenario()
const { showToast } = useToast()
const { people } = usePeopleDirectory()
const { exportPeople } = usePeopleImport()
const { studentCohort, studentCohortOptions, studentSection, studentSectionOptions, studentSemester, ensureAvailableStudentFilters } = useStudentCohortContext()
const { getPermissions, setPermission } = useLecturerPermissions()

const personType = computed<PersonType>(() => route.params.type === 'lecturers' ? 'lecturer' : 'student')
const isValidType = computed(() => ['students', 'lecturers'].includes(String(route.params.type)))
if (!isValidType.value) throw createError({ statusCode: 404, statusMessage: 'Page not found' })

const context = computed(() => personType.value === 'student'
  ? { title: 'ข้อมูลนักศึกษา', singular: 'นักศึกษา', idLabel: 'รหัสนักศึกษา' }
  : { title: 'ข้อมูลอาจารย์', singular: 'อาจารย์', idLabel: 'รหัสอาจารย์' })
useHead({ title: () => context.value.title })

const search = ref('')
const recordStatus = ref('all')
const accountStatus = ref('all')
const placementStatus = ref('all')
const placementStatusOptions = [{ value: 'all', label: 'ทุกสถานะที่ฝึกงาน' }, { value: 'placed', label: 'ได้ที่ฝึกงานแล้ว' }, { value: 'unplaced', label: 'ยังไม่ได้ที่ฝึกงาน' }]
const academicYearOptions = computed(() => studentCohortOptions.value.map(option => option.value === 'all' ? { ...option, label: 'ปีการศึกษา' } : option))
const sortDirection = ref<'asc' | 'desc'>('asc')
const pageSize = ref('10')
const currentPage = ref(1)
const exportFormat = ref<PeopleFileFormat>('xlsx')
const isExporting = ref(false)
const permissionsDialogOpen = ref(false)
const editingLecturer = ref<PersonRecord | null>(null)
const permissionDraft = ref(false)
const effectiveViewState = computed(() => scenario.value.forceError ? 'error' : scenario.value.viewState)

const recordStatusOptions = [
  { value: 'all', label: 'ทุกสถานะข้อมูล' },
  { value: 'active', label: 'ใช้งาน' },
  { value: 'inactive', label: 'ยุติการใช้งาน' },
]
const accountStatusOptions = [
  { value: 'all', label: 'ทุกสถานะบัญชี' },
  { value: 'first-login', label: 'รอเข้าสู่ระบบครั้งแรก' },
  { value: 'active', label: 'ใช้งาน' },
  { value: 'suspended', label: 'ระงับชั่วคราว' },
  { value: 'terminated', label: 'ยุติการใช้งาน' },
]
const pageSizeOptions = ['10', '20', '50', '100'].map(value => ({ value, label: value }))
const exportFormatOptions = [
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV (.csv)' },
]
const exportDescription = computed(() => personType.value === 'student'
  ? 'ไฟล์จะมีรหัส คำนำหน้าชื่อ ชื่อ นามสกุล รุ่น หมู่เรียน สถานประกอบการ และตำแหน่งที่ฝึก'
  : 'ไฟล์จะมีรหัส คำนำหน้าชื่อ ชื่อ และนามสกุล')

const filteredPeople = computed(() => {
  if (scenario.value.viewState === 'empty') return []
  const keyword = search.value.trim().toLocaleLowerCase('th')
  return people.value
    .filter(person => person.type === personType.value)
    .filter(person => personType.value !== 'student' || studentCohort.value === 'all' || getStudentCohortYear(person.id) === studentCohort.value)
    .filter(person => personType.value !== 'student' || getStudentSemester(person.cycle) === selectableCoopSemester)
    .filter(person => personType.value !== 'student' || studentSection.value === 'all' || person.section === studentSection.value)
    .filter(person => !keyword || [person.id, person.prefix, person.firstName, person.lastName, person.company]
      .some(value => value?.toLocaleLowerCase('th').includes(keyword)))
    .filter(person => personType.value === 'student' || recordStatus.value === 'all' || person.recordStatus === recordStatus.value)
    .filter(person => personType.value === 'student' || accountStatus.value === 'all' || person.accountStatus === accountStatus.value)
    .filter(person => personType.value !== 'student' || placementStatus.value === 'all' || hasPlacement(person) === (placementStatus.value === 'placed'))
    .sort((a, b) => {
      const comparison = `${a.firstName}${a.lastName}`.localeCompare(`${b.firstName}${b.lastName}`, 'th')
      return sortDirection.value === 'asc' ? comparison : -comparison
    })
})
const pageSizeNumber = computed(() => Number(pageSize.value))
const pageCount = computed(() => getPageCount(filteredPeople.value.length, pageSizeNumber.value))
const paginatedPeople = computed(() => paginateItems(filteredPeople.value, currentPage.value, pageSizeNumber.value))
const resultStart = computed(() => filteredPeople.value.length ? (currentPage.value - 1) * pageSizeNumber.value + 1 : 0)
const resultEnd = computed(() => Math.min(currentPage.value * pageSizeNumber.value, filteredPeople.value.length))
const hasFilters = computed(() => Boolean(search.value) || (personType.value === 'lecturer' && (recordStatus.value !== 'all' || accountStatus.value !== 'all')) || (personType.value === 'student' && (placementStatus.value !== 'all' || studentSection.value !== 'all' || studentCohort.value !== 'all')))

watch([search, recordStatus, accountStatus, placementStatus, sortDirection, pageSize, personType, studentCohort, studentSection, studentSemester], () => { currentPage.value = 1 })
watch(pageCount, count => { if (currentPage.value > count) currentPage.value = count })
watchEffect(() => {
  if (personType.value !== 'student') return
  studentSemester.value = selectableCoopSemester
  ensureAvailableStudentFilters()
})

const clearFilters = () => {
  search.value = ''
  recordStatus.value = 'all'
  accountStatus.value = 'all'
  placementStatus.value = 'all'
  if (personType.value === 'student') {
    studentSection.value = 'all'
    studentCohort.value = 'all'
    studentSemester.value = selectableCoopSemester
  }
}
const resetTable = () => {
  clearFilters()
  sortDirection.value = 'asc'
  pageSize.value = '10'
  currentPage.value = 1
}
const retry = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
}
const handleExport = async () => {
  if (isExporting.value) return
  isExporting.value = true
  try {
    await exportPeople(people.value, personType.value, exportFormat.value)
    showToast({ title: `ส่งออก${context.value.title}แล้ว`, description: `${people.value.filter(person => person.type === personType.value).length} รายการ · ${exportFormat.value.toUpperCase()}` })
  }
  catch (error) {
    console.error(error)
    showToast({ title: 'ส่งออกข้อมูลไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' })
  }
  finally {
    isExporting.value = false
  }
}
const openPermissions = (person: PersonRecord) => {
  editingLecturer.value = person
  permissionDraft.value = getPermissions(person.id).placements
  permissionsDialogOpen.value = true
}
const savePermissions = () => {
  if (!editingLecturer.value) return
  setPermission(editingLecturer.value.id, permissionDraft.value)
  showToast({ title: 'บันทึกสิทธิ์แล้ว', description: `กำหนดสิทธิ์การใช้งานให้ ${getPersonFullName(editingLecturer.value)}` })
  permissionsDialogOpen.value = false
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ context.title }}</h2>
        <p class="mt-1 text-sm leading-6 text-muted">ค้นหา เพิ่ม แก้ไข และจัดการสถานะข้อมูลกับบัญชีโดยไม่ลบประวัติเดิม</p>
      </div>
      <div class="flex flex-wrap gap-2 sm:justify-end">
        <UiButton variant="secondary" :icon="Upload" @click="navigateTo({ path: '/staff/people/import', query: { type: personType } })">นำเข้าข้อมูล</UiButton>
        <UiDialog :title="`ส่งออก${context.title}`" :description="exportDescription">
          <template #trigger><UiButton variant="secondary" :icon="Download">ส่งออกข้อมูล</UiButton></template>
          <UiSelect v-model="exportFormat" :options="exportFormatOptions" :placeholder="exportFormatOptions.find(item => item.value === exportFormat)?.label" label="รูปแบบไฟล์" />
          <template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template>
          <template #confirm><UiButton :loading="isExporting" :icon="Download" @click="handleExport">ดาวน์โหลดไฟล์</UiButton></template>
        </UiDialog>
        <UiButton :icon="Plus" @click="navigateTo(`/staff/${route.params.type}/new`)">เพิ่ม{{ context.singular }}</UiButton>
      </div>
    </div>

    <UiCard :padded="false">
      <div class="border-b border-divider p-5 sm:p-6">
        <div class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <label class="block w-full text-sm font-semibold text-ink sm:max-w-md xl:w-96 xl:flex-none">
            <span class="sr-only">ค้นหา{{ context.singular }}</span>
            <span class="relative block">
              <Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input v-model="search" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" :placeholder="`ค้นหา${context.idLabel} ชื่อ หรือนามสกุล`">
            </span>
          </label>
          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:ml-auto">
            <div v-if="personType === 'student'" class="w-full sm:w-52"><UiSelect v-model="placementStatus" :options="placementStatusOptions" label="กรองสถานะที่ฝึกงาน" :label-visible="false" /></div>
            <div v-if="personType === 'student'" class="w-full sm:w-40"><UiSelect v-model="studentSection" :options="studentSectionOptions" label="กรองตามหมู่เรียน" :label-visible="false" /></div>
            <div v-if="personType === 'student'" class="w-full sm:w-44"><UiSelect v-model="studentCohort" :options="academicYearOptions" label="กรองตามปีการศึกษา" :label-visible="false" /></div>
            <div v-if="personType === 'lecturer'" class="w-full sm:w-52"><UiSelect :key="`record-${personType}`" v-model="recordStatus" :options="recordStatusOptions" :placeholder="recordStatusOptions.find(item => item.value === recordStatus)?.label" label="กรองสถานะข้อมูล" :label-visible="false" /></div>
            <div v-if="personType === 'lecturer'" class="w-full sm:w-56"><UiSelect :key="`account-${personType}`" v-model="accountStatus" :options="accountStatusOptions" :placeholder="accountStatusOptions.find(item => item.value === accountStatus)?.label" label="กรองสถานะบัญชี" :label-visible="false" /></div>
            <button type="button" class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink transition-colors hover:bg-surface" aria-label="รีเซ็ตตาราง" title="รีเซ็ตตาราง" @click="resetTable"><RotateCcw :size="18" aria-hidden="true" /></button>
          </div>
        </div>
      </div>

      <div v-if="effectiveViewState === 'loading'" class="space-y-3 p-5 sm:p-6" :aria-label="`กำลังโหลด${context.title}`">
        <div v-for="row in 4" :key="row" class="grid grid-cols-[1fr_1fr_9rem_9rem_3rem] gap-4 max-md:grid-cols-[1fr_8rem]"><UiSkeleton class="h-10" /><UiSkeleton class="h-10 max-md:hidden" /><UiSkeleton class="h-10" /><UiSkeleton class="h-10 max-md:hidden" /><UiSkeleton class="h-10 max-md:hidden" /></div>
      </div>
      <div v-else-if="effectiveViewState === 'error'" class="p-5 sm:p-6"><AppErrorState :title="`โหลด${context.title}ไม่สำเร็จ`" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองดึงข้อมูลอีกครั้ง" @retry="retry" /></div>
      <div v-else-if="!paginatedPeople.length" class="p-5 sm:p-6">
        <AppEmptyState :title="hasFilters ? 'ไม่พบข้อมูลที่ตรงกับตัวกรอง' : `ยังไม่มี${context.title}`" :description="hasFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : `เพิ่ม${context.singular}คนแรกเพื่อสร้างข้อมูลและบัญชีผู้ใช้`">
          <UiButton v-if="hasFilters" variant="secondary" @click="clearFilters">ล้างตัวกรอง</UiButton>
          <UiButton v-else :icon="Plus" @click="navigateTo(`/staff/${route.params.type}/new`)">เพิ่ม{{ context.singular }}</UiButton>
        </AppEmptyState>
      </div>
      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[1120px] border-collapse text-left text-sm" :class="personType === 'student' ? 'table-fixed [&_td]:[overflow-wrap:anywhere]' : undefined">
            <caption class="sr-only">{{ context.title }}</caption>
            <colgroup v-if="personType === 'student'">
              <col class="w-[14%]">
              <col class="w-[20%]">
              <col class="w-[14%]">
              <col class="w-[11%]">
              <col class="w-[21%]">
              <col class="w-[11%]">
              <col class="w-[9%]">
            </colgroup>
            <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" class="px-6 py-3">{{ context.idLabel }}</th>
                <th scope="col" class="px-4 py-3" :aria-sort="sortDirection === 'asc' ? 'ascending' : 'descending'">
                  <button type="button" class="inline-flex items-center gap-1 font-semibold hover:text-ink" :aria-label="`เรียงชื่อ${sortDirection === 'asc' ? 'จาก ฮ ถึง ก' : 'จาก ก ถึง ฮ'}`" @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'">ชื่อ–นามสกุล <ArrowUp v-if="sortDirection === 'asc'" :size="15" aria-hidden="true" /><ArrowDown v-else :size="15" aria-hidden="true" /></button>
                </th>
                <th v-if="personType === 'student'" scope="col" class="px-4 py-3">รอบสหกิจ</th>
                <th v-if="personType === 'student'" scope="col" class="px-4 py-3">หมู่เรียน</th>
                <th v-if="personType === 'student'" scope="col" class="px-4 py-3">สถานประกอบการ</th>
                <th scope="col" class="px-4 py-3">สถานะข้อมูล</th>
                <th v-if="personType === 'lecturer'" scope="col" class="px-4 py-3">สถานะบัญชี</th>
                <th v-if="personType === 'lecturer'" scope="col" class="px-4 py-3">สิทธิ์ตรวจคำร้อง</th>
                <th scope="col" class="px-4 py-3">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-divider">
              <tr v-for="person in paginatedPeople" :key="person.id" class="transition-colors hover:bg-surface/70">
                <td class="whitespace-nowrap px-6 py-4 font-semibold text-ink">{{ person.id }}</td>
                <td class="px-4 py-4"><p class="font-semibold text-ink">{{ getPersonFullName(person) }}</p><p class="mt-1 text-xs text-muted">ชื่อผู้ใช้: {{ person.id }}</p></td>
                <td v-if="personType === 'student'" class="px-4 py-4 text-ink">{{ person.cycle || 'ยังไม่กำหนด' }}</td>
                <td v-if="personType === 'student'" class="whitespace-nowrap px-4 py-4 text-ink">{{ person.section || 'ยังไม่กำหนด' }}</td>
                <td v-if="personType === 'student'" class="px-4 py-4"><p :class="person.company ? 'text-ink' : 'text-muted'">{{ person.company || 'ยังไม่มีสถานประกอบการ' }}</p></td>
                <td class="px-4 py-4">
                  <div>
                    <UiBadge :tone="recordStatusMeta[person.recordStatus].tone">{{ recordStatusMeta[person.recordStatus].label }}</UiBadge>
                  </div>
                </td>
                <td v-if="personType === 'lecturer'" class="px-4 py-4"><UiBadge :tone="accountStatusMeta[person.accountStatus].tone">{{ accountStatusMeta[person.accountStatus].label }}</UiBadge></td>
                <td v-if="personType === 'lecturer'" class="px-4 py-4">
                  <UiBadge :tone="getPermissions(person.id).placements ? 'success' : 'neutral'">{{ getPermissions(person.id).placements ? 'อนุญาต' : 'ไม่อนุญาต' }}</UiBadge>
                </td>
                <td class="px-4 py-4"><div class="flex flex-wrap gap-2"><UiButton v-if="personType === 'lecturer'" size="sm" variant="secondary" :aria-label="`กำหนดสิทธิ์ของ ${getPersonFullName(person)}`" @click="openPermissions(person)">กำหนดสิทธิ์</UiButton><NuxtLink :to="`/staff/${route.params.type}/${person.id}`" class="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-control border border-divider bg-canvas px-3 text-sm font-semibold text-ink hover:bg-surface" :aria-label="`ดูข้อมูล ${getPersonFullName(person)}`">ดูข้อมูล</NuxtLink></div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="divide-y divide-divider md:hidden">
          <article v-for="person in paginatedPeople" :key="person.id" class="p-5">
            <div class="flex items-start justify-between gap-3"><div><h3 class="font-semibold text-ink">{{ getPersonFullName(person) }}</h3><p class="mt-1 text-xs text-muted">{{ person.id }}<template v-if="personType === 'student'"> · {{ person.section || 'ยังไม่กำหนดหมู่' }}</template></p></div><div v-if="personType === 'lecturer'" class="shrink-0 text-right"><p class="text-xs text-muted">สถานะข้อมูล</p><UiBadge class="mt-1" :tone="recordStatusMeta[person.recordStatus].tone">{{ recordStatusMeta[person.recordStatus].label }}</UiBadge></div></div>
            <dl v-if="personType === 'student'" class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-divider pt-3">
              <div class="min-w-0"><dt class="text-xs text-muted">รอบสหกิจ</dt><dd class="mt-1 break-words text-sm text-ink">{{ person.cycle || 'ยังไม่กำหนด' }}</dd></div>
              <div class="min-w-0"><dt class="text-xs text-muted">สถานประกอบการ</dt><dd class="mt-1 [overflow-wrap:anywhere] text-sm" :class="person.company ? 'text-ink' : 'text-muted'">{{ person.company || 'ยังไม่มีสถานประกอบการ' }}</dd></div>
            </dl>
            <div v-if="personType === 'lecturer'" class="mt-4 space-y-3 border-t border-divider pt-3">
              <div><p class="text-xs text-muted">สถานะบัญชี</p><UiBadge class="mt-1" :tone="accountStatusMeta[person.accountStatus].tone">{{ accountStatusMeta[person.accountStatus].label }}</UiBadge></div>
              <div class="border-t border-divider pt-3">
                <div><p class="text-xs text-muted">สิทธิ์ตรวจคำร้อง</p><UiBadge class="mt-1" :tone="getPermissions(person.id).placements ? 'success' : 'neutral'">{{ getPermissions(person.id).placements ? 'อนุญาต' : 'ไม่อนุญาต' }}</UiBadge></div>
              </div>
            </div>
            <div class="mt-4 flex items-end justify-between gap-3 border-t border-divider pt-3">
              <div v-if="personType === 'student'"><p class="text-xs text-muted">สถานะข้อมูล</p><UiBadge class="mt-1" :tone="recordStatusMeta[person.recordStatus].tone">{{ recordStatusMeta[person.recordStatus].label }}</UiBadge></div>
              <div class="ml-auto flex flex-wrap justify-end gap-2"><UiButton v-if="personType === 'lecturer'" size="sm" variant="secondary" :aria-label="`กำหนดสิทธิ์ของ ${getPersonFullName(person)}`" @click="openPermissions(person)">กำหนดสิทธิ์</UiButton><NuxtLink :to="`/staff/${route.params.type}/${person.id}`" class="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-control border border-divider bg-canvas px-3 text-sm font-semibold text-ink hover:bg-surface" :aria-label="`ดูข้อมูล ${getPersonFullName(person)}`">ดูข้อมูล</NuxtLink></div>
            </div>
          </article>
        </div>

        <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div class="flex items-center gap-3"><p class="whitespace-nowrap text-muted">แสดง {{ resultStart }}–{{ resultEnd }} จาก {{ filteredPeople.length }} รายการ</p><div class="w-20 shrink-0"><UiSelect :key="`page-size-${personType}`" v-model="pageSize" :options="pageSizeOptions" :placeholder="pageSize" label="จำนวนรายการต่อหน้า" :label-visible="false" /></div></div>
          <nav class="flex items-center gap-2" aria-label="การแบ่งหน้าตาราง"><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === 1" aria-label="หน้าก่อนหน้า" @click="currentPage--"><ChevronLeft :size="18" aria-hidden="true" /></button><span class="min-w-20 text-center font-semibold text-ink">หน้า {{ currentPage }} / {{ pageCount }}</span><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === pageCount" aria-label="หน้าถัดไป" @click="currentPage++"><ChevronRight :size="18" aria-hidden="true" /></button></nav>
        </div>
      </template>
    </UiCard>
    <UiDialog v-model:open="permissionsDialogOpen" :title="`กำหนดสิทธิ์การใช้งาน · ${editingLecturer ? getPersonFullName(editingLecturer) : ''}`" description="เลือกว่าบัญชีนี้สามารถเห็นและใช้งานฟีเจอร์ตรวจคำร้องและหนังสือขออนุญาตได้หรือไม่">
      <label class="flex cursor-pointer items-start gap-3 rounded-control border border-divider bg-surface/35 p-4 hover:bg-surface"><UiCheckbox v-model="permissionDraft" label="สิทธิ์การตรวจคำร้องและหนังสือขออนุญาต" /><span><span class="block font-medium text-ink">ตรวจคำร้องและหนังสือขออนุญาต</span><span class="mt-1 block text-xs text-muted">เข้าถึงเมนูและใช้งานฟีเจอร์ที่เกี่ยวข้อง</span></span></label>
      <template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template>
      <template #confirm><UiButton @click="savePermissions">บันทึกสิทธิ์</UiButton></template>
    </UiDialog>
  </div>
</template>
