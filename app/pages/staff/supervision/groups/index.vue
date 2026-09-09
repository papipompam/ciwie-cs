<script setup lang="ts">
import { Building2, ChevronLeft, ChevronRight, RotateCcw, Search, UsersRound, X } from '@lucide/vue'
import type { SupervisionCompany, SupervisionGroup } from '~/composables/useSupervisionGroups'
import { getPageCount, paginateItems } from '~/utils/table'

definePageMeta({ title: 'จัดกลุ่มอาจารย์นิเทศ', middleware: 'staff-prototype' })
useHead({ title: 'จัดกลุ่มอาจารย์นิเทศ' })

const { scenario } = useScenario()
const { placements, groups, supervisionLecturers, getCompanies, getGroupCompanies, getUnassignedCompanies, loadPersistedGroups } = useSupervisionGroups()
const { cycleId, round, selectedCycleLabel } = useSupervisionContext()
const search = ref('')
const province = ref('all')
const pageSize = ref('10')
const currentPage = ref(1)
const groupDialogOpen = ref(false)
const selectedGroup = ref<SupervisionGroup | null>(null)
const companyDialogOpen = ref(false)
const selectedCompany = ref<SupervisionCompany | null>(null)
const backendViewState = ref<'loading' | 'error' | 'data'>('loading')
const effectiveViewState = computed(() => scenario.value.forceError || backendViewState.value === 'error'
  ? 'error'
  : scenario.value.viewState === 'empty'
    ? 'empty'
    : backendViewState.value)

const load = async () => {
  backendViewState.value = 'loading'
  try {
    await loadPersistedGroups(cycleId.value, round.value)
    backendViewState.value = 'data'
  }
  catch {
    backendViewState.value = 'error'
  }
}

watch([cycleId, round], () => { if (import.meta.client) void load() })
onMounted(load)

const currentGroups = computed(() => groups.value.filter(group => group.cycleId === cycleId.value && group.round === round.value))
const unassignedCompanies = computed(() => getUnassignedCompanies(cycleId.value, round.value))
const provinceOptions = computed(() => [{ value: 'all', label: 'ทุกจังหวัด' }, ...[...new Set(unassignedCompanies.value.map(item => item.province))].sort((a, b) => a.localeCompare(b, 'th')).map(value => ({ value, label: value }))])
const filteredCompanies = computed(() => {
  if (scenario.value.viewState === 'empty') return []
  const keyword = search.value.trim().toLocaleLowerCase('th')
  return unassignedCompanies.value
    .filter(item => !keyword || [item.name, item.branch, item.province, item.region].some(value => value.toLocaleLowerCase('th').includes(keyword)))
    .filter(item => province.value === 'all' || item.province === province.value)
    .sort((a, b) => a.name.localeCompare(b.name, 'th'))
})
const pageSizeNumber = computed(() => Number(pageSize.value))
const pageCount = computed(() => getPageCount(filteredCompanies.value.length, pageSizeNumber.value))
const paginatedCompanies = computed(() => paginateItems(filteredCompanies.value, currentPage.value, pageSizeNumber.value))
const resultStart = computed(() => filteredCompanies.value.length ? (currentPage.value - 1) * pageSizeNumber.value + 1 : 0)
const resultEnd = computed(() => Math.min(currentPage.value * pageSizeNumber.value, filteredCompanies.value.length))
const pageSizeOptions = ['10', '20', '50'].map(value => ({ value, label: value }))
const hasFilters = computed(() => Boolean(search.value) || province.value !== 'all')
const cycleGroups = computed(() => groups.value.filter(group => group.cycleId === cycleId.value))
const cycleLecturerCount = computed(() => new Set(cycleGroups.value.flatMap(group => group.lecturerIds)).size)
const cycleCompanyCount = computed(() => getCompanies(cycleId.value).length)
const cycleStudentCount = computed(() => new Set(placements.value.filter(placement => placement.cycleId === cycleId.value).map(placement => placement.studentId)).size)
const supervisionTabs = computed(() => [
  { value: 'groups', label: 'กลุ่มอาจารย์' },
  { value: 'companies', label: 'สถานประกอบการที่ยังไม่มอบหมาย', count: unassignedCompanies.value.length },
])

watch([cycleId, round], () => resetTable())
watch([search, province, pageSize], () => { currentPage.value = 1 })
watch(pageCount, count => { if (currentPage.value > count) currentPage.value = count })

const resetTable = () => {
  search.value = ''
  province.value = 'all'
  pageSize.value = '10'
  currentPage.value = 1
}
const retry = async () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
  await load()
}
const lecturerName = (id: string) => {
  return supervisionLecturers.value.find(person => person.id === id)?.name ?? id
}
const selectedGroupCompanies = computed(() => selectedGroup.value ? getGroupCompanies(selectedGroup.value) : [])
const selectedGroupStudentCount = computed(() => selectedGroupCompanies.value.reduce((total, company) => total + company.studentCount, 0))
const openGroupDialog = (group: SupervisionGroup) => {
  selectedGroup.value = group
  groupDialogOpen.value = true
}
const openCompanyDialog = (company: SupervisionCompany) => {
  selectedCompany.value = company
  companyDialogOpen.value = true
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">จัดกลุ่มนิเทศ</h2><p class="mt-1 text-sm leading-6 text-muted">จัดกลุ่มสถานประกอบการตามพิกัด และกำหนดอาจารย์ผู้รับผิดชอบให้แต่ละกลุ่ม</p></div>
    </div>

    <div class="mb-3 flex items-center justify-between gap-3">
      <div><h3 class="text-base font-bold text-ink">ภาพรวมรอบสหกิจศึกษา</h3><p class="mt-0.5 text-sm text-muted">{{ selectedCycleLabel }} · รวมทุกครั้งที่นิเทศ</p></div>
    </div>
    <div class="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <UiCard><p class="text-sm text-muted">อาจารย์ที่จัดกลุ่มแล้ว</p><p class="mt-2 text-3xl font-bold text-ink">{{ cycleLecturerCount }}</p><p class="mt-1 text-xs text-muted">คน</p></UiCard>
      <UiCard><p class="text-sm text-muted">กลุ่มอาจารย์ทั้งหมด</p><p class="mt-2 text-3xl font-bold text-ink">{{ cycleGroups.length }}</p><p class="mt-1 text-xs text-muted">กลุ่ม</p></UiCard>
      <UiCard><p class="text-sm text-muted">สถานประกอบการ</p><p class="mt-2 text-3xl font-bold text-ink">{{ cycleCompanyCount }}</p><p class="mt-1 text-xs text-muted">แห่ง</p></UiCard>
      <UiCard><p class="text-sm text-muted">นักศึกษา</p><p class="mt-2 text-3xl font-bold text-ink">{{ cycleStudentCount }}</p><p class="mt-1 text-xs text-muted">คน</p></UiCard>
    </div>

    <SupervisionGroupingAssistant :cycle-id="cycleId" :round="round" :disabled="effectiveViewState !== 'data'" />
    <UiTabs :tabs="supervisionTabs" default-value="groups" label="ข้อมูลการจัดกลุ่มนิเทศ" variant="plain">
      <template #groups>
        <UiCard :padded="false">
          <div class="border-b border-divider p-5 sm:p-6"><div class="flex items-start gap-3"><span class="grid size-10 shrink-0 place-items-center rounded-control bg-warning-soft text-warning"><UsersRound :size="20" aria-hidden="true" /></span><div><h3 class="text-lg font-bold text-ink">กลุ่มอาจารย์ที่จัดแล้ว</h3><p class="mt-1 text-sm text-muted">{{ selectedCycleLabel }} · นิเทศครั้งที่ {{ round }}</p></div></div></div>
          <div v-if="effectiveViewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดกลุ่มอาจารย์"><UiSkeleton v-for="row in 3" :key="row" class="h-14" /></div>
          <div v-else-if="effectiveViewState === 'error'" class="p-5 sm:p-6"><AppErrorState title="โหลดกลุ่มอาจารย์ไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง" @retry="retry" /></div>
          <div v-else-if="!currentGroups.length" class="p-5 sm:p-6"><AppEmptyState title="ยังไม่มีกลุ่มอาจารย์สำหรับการนิเทศครั้งนี้" description="สร้างกลุ่ม เลือกอาจารย์ และมอบหมายสถานประกอบการก่อนเริ่มวางตาราง" /></div>
          <template v-else>
            <div class="hidden overflow-x-auto md:block">
              <table class="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
                <caption class="sr-only">กลุ่มอาจารย์และสถานประกอบการที่รับผิดชอบ</caption>
                <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th scope="col" class="w-44 px-5 py-3">กลุ่มอาจารย์</th><th scope="col" class="w-52 px-4 py-3">อาจารย์ในกลุ่ม</th><th scope="col" class="px-4 py-3">สถานประกอบการที่รับผิดชอบ</th><th scope="col" class="w-40 px-4 py-3"><span class="sr-only">จัดการอาจารย์</span></th></tr></thead>
                <tbody class="divide-y divide-divider">
                  <tr v-for="group in currentGroups" :key="group.id" class="hover:bg-surface/70">
                    <td class="px-5 py-4 align-top"><p class="font-semibold text-ink">{{ group.name }}</p><p class="mt-0.5 text-xs text-muted">{{ group.id }}</p></td>
                    <td class="px-4 py-4 align-top"><p v-if="!group.lecturerIds.length" class="text-sm text-muted">รอเพิ่มอาจารย์</p><div class="space-y-1.5"><p v-for="id in group.lecturerIds" :key="id" class="text-sm text-ink">{{ lecturerName(id) }}</p></div></td>
                    <td class="px-4 py-4 align-top">
                      <ul class="space-y-1.5">
                        <li v-for="company in getGroupCompanies(group)" :key="company.id" class="flex min-w-0 items-start gap-2">
                          <p class="min-w-0 flex-1 text-sm leading-5 text-ink">{{ company.name }} <span class="whitespace-nowrap text-muted">· {{ company.province }}</span></p>
                          <UiBadge tone="info" class="shrink-0">{{ company.studentCount }} คน</UiBadge>
                        </li>
                      </ul>
                    </td>
                    <td class="px-4 py-4 align-top"><button type="button" class="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-control border border-divider bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface" :aria-label="`${group.lecturerIds.length ? 'แก้ไข' : 'เพิ่ม'}อาจารย์ ${group.name}`" @click="openGroupDialog(group)">{{ group.lecturerIds.length ? 'แก้ไขอาจารย์' : 'เพิ่มอาจารย์' }}</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="divide-y divide-divider md:hidden">
              <article v-for="group in currentGroups" :key="group.id" class="p-5">
                <div class="flex items-start justify-between gap-3"><div><h4 class="font-semibold text-ink">{{ group.name }}</h4><p class="mt-1 text-xs text-muted">{{ group.id }}</p></div><UiButton class="shrink-0" size="sm" variant="secondary" @click="openGroupDialog(group)">{{ group.lecturerIds.length ? 'แก้ไขอาจารย์' : 'เพิ่มอาจารย์' }}</UiButton></div>
                <div class="mt-3 space-y-1.5"><p v-if="!group.lecturerIds.length" class="text-sm text-muted">รอเพิ่มอาจารย์</p><p v-for="id in group.lecturerIds" :key="id" class="text-sm text-ink">{{ lecturerName(id) }}</p></div>
                <div class="mt-3 border-t border-divider pt-3"><p class="text-xs font-semibold text-muted">สถานประกอบการที่รับผิดชอบ</p><ul class="mt-2 space-y-2"><li v-for="company in getGroupCompanies(group)" :key="company.id" class="flex min-w-0 items-start gap-2"><p class="min-w-0 flex-1 text-sm leading-5 text-ink">{{ company.name }} <span class="whitespace-nowrap text-muted">· {{ company.province }}</span></p><UiBadge tone="info" class="shrink-0">{{ company.studentCount }} คน</UiBadge></li></ul></div>
              </article>
            </div>
          </template>
        </UiCard>
      </template>

      <template #companies>
        <UiCard :padded="false">
          <div class="border-b border-divider p-5 sm:p-6">
            <div class="flex items-start gap-3"><span class="grid size-10 shrink-0 place-items-center rounded-control bg-info-soft text-info"><Building2 :size="20" aria-hidden="true" /></span><div><h3 class="text-lg font-bold text-ink">สถานประกอบการที่ยังไม่มอบหมาย</h3><p class="mt-1 text-sm leading-6 text-muted">แสดงเป็นรายสถานประกอบการ พร้อมจำนวนนักศึกษาที่ยืนยันสถานที่ฝึกงานแล้ว</p></div></div>
            <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"><label class="block w-full text-sm font-semibold text-ink sm:max-w-md lg:w-96 lg:flex-none"><span class="sr-only">ค้นหาสถานประกอบการ</span><span class="relative block"><Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" /><input v-model="search" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" placeholder="ค้นหาชื่อ สาขา จังหวัด หรือภูมิภาค"></span></label><div class="flex gap-2"><div class="w-full sm:w-52"><UiSelect v-model="province" :options="provinceOptions" :placeholder="provinceOptions.find(item => item.value === province)?.label" label="กรองจังหวัด" :label-visible="false" /></div><button type="button" class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink hover:bg-surface" aria-label="รีเซ็ตตาราง" title="รีเซ็ตตาราง" @click="resetTable"><RotateCcw :size="18" aria-hidden="true" /></button></div></div>
            <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm"><span class="text-muted">ตัวกรองที่ใช้:</span><span v-if="search" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">คำค้น “{{ search }}”</span><span v-if="province !== 'all'" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">{{ province }}</span><button type="button" class="inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-semibold text-warning hover:bg-warning-soft" @click="resetTable"><X :size="15" aria-hidden="true" />ล้างทั้งหมด</button></div>
          </div>
          <div v-if="effectiveViewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดสถานประกอบการ"><UiSkeleton v-for="row in 5" :key="row" class="h-14" /></div>
          <div v-else-if="effectiveViewState === 'error'" class="p-5 sm:p-6"><AppErrorState title="โหลดสถานประกอบการไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง" @retry="retry" /></div>
          <div v-else-if="!paginatedCompanies.length" class="p-5 sm:p-6"><AppEmptyState :title="hasFilters ? 'ไม่พบสถานประกอบการที่ตรงกับตัวกรอง' : 'มอบหมายสถานประกอบการครบแล้ว'" :description="hasFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : `ไม่มีสถานประกอบการค้างอยู่ในการนิเทศครั้งที่ ${round}`"><UiButton v-if="hasFilters" variant="secondary" @click="resetTable">ล้างตัวกรอง</UiButton></AppEmptyState></div>
          <template v-else>
            <div class="hidden overflow-x-auto md:block">
              <table class="w-full min-w-[760px] border-collapse text-left text-sm">
                <caption class="sr-only">สถานประกอบการที่ยังไม่มอบหมายให้กลุ่มอาจารย์</caption>
                <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
                  <tr><th scope="col" class="px-6 py-3">สถานประกอบการ</th><th scope="col" class="w-64 px-4 py-3">พื้นที่</th><th scope="col" class="w-32 px-4 py-3 text-right">นักศึกษา</th><th scope="col" class="w-28 px-6 py-3 text-right"><span class="sr-only">ดูข้อมูล</span></th></tr>
                </thead>
                <tbody class="divide-y divide-divider">
                  <tr v-for="company in paginatedCompanies" :key="company.id" class="hover:bg-surface/70">
                    <td class="px-6 py-4"><p class="font-semibold text-ink">{{ company.name }}</p><p class="mt-1 text-xs text-muted">{{ company.branch }} · {{ company.id }}</p></td>
                    <td class="px-4 py-4"><p class="text-ink">{{ company.province }}</p><p class="mt-1 text-xs text-muted">{{ company.region }}</p></td>
                    <td class="px-4 py-4 text-right font-semibold text-ink">{{ company.studentCount }} คน</td>
                    <td class="px-6 py-4 text-right"><button type="button" class="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-control border border-divider bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface" :aria-label="`ดูข้อมูล ${company.name} และรายชื่อนักศึกษา`" @click="openCompanyDialog(company)">ดูข้อมูล</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="divide-y divide-divider md:hidden">
              <article v-for="company in paginatedCompanies" :key="company.id" class="p-5">
                <div class="flex items-start gap-3"><div class="min-w-0 flex-1"><h4 class="font-semibold text-ink">{{ company.name }}</h4><p class="mt-1 text-xs text-muted">{{ company.branch }} · {{ company.province }}</p></div><UiBadge tone="info" class="shrink-0">{{ company.studentCount }} คน</UiBadge></div>
                <div class="mt-4 flex justify-end border-t border-divider pt-3"><UiButton size="sm" variant="secondary" @click="openCompanyDialog(company)">ดูข้อมูล</UiButton></div>
              </article>
            </div>
            <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div class="flex items-center gap-3"><p class="whitespace-nowrap text-muted">แสดง {{ resultStart }}–{{ resultEnd }} จาก {{ filteredCompanies.length }} รายการ</p><div class="w-20 shrink-0"><UiSelect v-model="pageSize" :options="pageSizeOptions" :placeholder="pageSize" label="จำนวนรายการต่อหน้า" :label-visible="false" /></div></div>
              <nav class="flex items-center gap-2" aria-label="การแบ่งหน้าสถานประกอบการ"><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === 1" aria-label="หน้าก่อนหน้า" @click="currentPage--"><ChevronLeft :size="18" aria-hidden="true" /></button><span class="min-w-20 text-center font-semibold text-ink">หน้า {{ currentPage }} / {{ pageCount }}</span><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === pageCount" aria-label="หน้าถัดไป" @click="currentPage++"><ChevronRight :size="18" aria-hidden="true" /></button></nav>
            </div>
          </template>
        </UiCard>
      </template>
    </UiTabs>

    <UiDialog
      v-model:open="groupDialogOpen"
      size="xl"
      :title="selectedGroup ? `ภาพรวม ${selectedGroup.name}` : 'ภาพรวมกลุ่มอาจารย์'"
      :description="selectedGroup ? `${selectedCycleLabel} · นิเทศครั้งที่ ${selectedGroup.round} · ${selectedGroup.id}` : undefined"
    >
      <template v-if="selectedGroup">
        <GroupLecturerEditor :key="selectedGroup.id" :group="selectedGroup" />
        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-control border border-divider bg-surface p-4"><p class="text-xs font-medium text-muted">อาจารย์ในกลุ่ม</p><p class="mt-1 text-xl font-bold text-ink">{{ selectedGroup.lecturerIds.length }} คน</p></div>
          <div class="rounded-control border border-divider bg-surface p-4"><p class="text-xs font-medium text-muted">สถานประกอบการ</p><p class="mt-1 text-xl font-bold text-ink">{{ selectedGroupCompanies.length }} แห่ง</p></div>
          <div class="rounded-control border border-divider bg-surface p-4"><p class="text-xs font-medium text-muted">นักศึกษา</p><p class="mt-1 text-xl font-bold text-ink">{{ selectedGroupStudentCount }} คน</p></div>
        </div>

        <section class="mt-5" aria-labelledby="group-lecturers-heading">
          <h3 id="group-lecturers-heading" class="text-sm font-bold text-ink">อาจารย์ในกลุ่ม</h3>
          <div class="mt-3 divide-y divide-divider overflow-hidden rounded-control border border-divider">
            <p v-for="id in selectedGroup.lecturerIds" :key="id" class="px-4 py-3 text-sm text-ink"><span class="font-semibold">{{ id }}</span><span class="text-muted"> · </span>{{ lecturerName(id) }}</p>
          </div>
        </section>

        <section class="mt-5" aria-labelledby="group-companies-heading">
          <div class="flex items-center justify-between gap-3"><h3 id="group-companies-heading" class="text-sm font-bold text-ink">สถานประกอบการและนักศึกษา</h3><UiBadge tone="info">{{ selectedGroupCompanies.length }} แห่ง</UiBadge></div>
          <div class="mt-3 overflow-hidden rounded-control border border-divider">
            <table class="hidden w-full table-fixed border-collapse text-left text-sm md:table">
              <caption class="sr-only">สถานประกอบการและนักศึกษาทั้งหมดใน {{ selectedGroup.name }}</caption>
              <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th scope="col" class="w-[38%] px-4 py-3">สถานประกอบการ</th><th scope="col" class="w-[24%] px-4 py-3">ผู้ประสานงาน</th><th scope="col" class="px-4 py-3">นักศึกษา</th></tr></thead>
              <tbody class="divide-y divide-divider">
                <tr v-for="company in selectedGroupCompanies" :key="company.id">
                  <td class="px-4 py-3 align-top"><p class="font-semibold text-ink">{{ company.name }}</p><p class="mt-1 text-xs leading-5 text-muted">{{ company.branch }} · {{ company.province }}</p></td>
                  <td class="px-4 py-3 align-top"><p class="text-ink">{{ company.contactName }}</p><p class="mt-1 text-xs text-muted">{{ company.contactPhone }}</p></td>
                  <td class="px-4 py-3 align-top"><div class="space-y-1"><p v-for="student in company.students" :key="student.id" class="text-sm text-ink">{{ student.studentName }} <span class="text-xs text-muted">· {{ student.studentId }}</span></p></div></td>
                </tr>
              </tbody>
            </table>
            <div class="divide-y divide-divider md:hidden">
              <article v-for="company in selectedGroupCompanies" :key="company.id" class="p-4"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><h4 class="font-semibold text-ink">{{ company.name }}</h4><p class="mt-1 text-xs text-muted">{{ company.branch }} · {{ company.province }}</p></div><UiBadge tone="info" class="shrink-0">{{ company.studentCount }} คน</UiBadge></div><div class="mt-3 space-y-1"><p v-for="student in company.students" :key="student.id" class="text-sm text-ink">{{ student.studentName }} <span class="text-xs text-muted">· {{ student.studentId }}</span></p></div></article>
            </div>
          </div>
        </section>
      </template>
      <template #cancel><UiButton variant="ghost">ปิด</UiButton></template>
    </UiDialog>

    <UiDialog
      v-model:open="companyDialogOpen"
      size="xl"
      :title="selectedCompany?.name ?? 'ข้อมูลสถานประกอบการ'"
      :description="selectedCompany ? `${selectedCompany.branch} · ${selectedCompany.province} · นักศึกษา ${selectedCompany.studentCount} คน` : undefined"
    >
      <template v-if="selectedCompany">
        <section aria-labelledby="company-information-heading">
          <h3 id="company-information-heading" class="text-sm font-bold text-ink">ข้อมูลสถานประกอบการ</h3>
          <dl class="mt-3 grid gap-4 rounded-control border border-divider bg-surface p-4 sm:grid-cols-2">
            <div><dt class="text-xs font-medium text-muted">รหัสสถานประกอบการ</dt><dd class="mt-1 text-sm font-semibold text-ink">{{ selectedCompany.id }}</dd></div>
            <div><dt class="text-xs font-medium text-muted">สาขา</dt><dd class="mt-1 text-sm text-ink">{{ selectedCompany.branch }}</dd></div>
            <div><dt class="text-xs font-medium text-muted">จังหวัด / ภูมิภาค</dt><dd class="mt-1 text-sm text-ink">{{ selectedCompany.province }} · {{ selectedCompany.region }}</dd></div>
            <div><dt class="text-xs font-medium text-muted">ผู้ประสานงาน</dt><dd class="mt-1 text-sm text-ink">{{ selectedCompany.contactName }} · {{ selectedCompany.contactPhone }}</dd></div>
            <div class="sm:col-span-2"><dt class="text-xs font-medium text-muted">ที่อยู่</dt><dd class="mt-1 text-sm leading-6 text-ink">{{ selectedCompany.address }}</dd></div>
          </dl>
        </section>

        <section class="mt-5" aria-labelledby="company-students-heading">
          <div class="flex items-center justify-between gap-3"><h3 id="company-students-heading" class="text-sm font-bold text-ink">รายชื่อนักศึกษา</h3><UiBadge tone="info">{{ selectedCompany.studentCount }} คน</UiBadge></div>
          <div class="mt-3 overflow-hidden rounded-control border border-divider">
            <table class="hidden w-full table-fixed border-collapse text-left text-sm md:table">
              <caption class="sr-only">รายชื่อนักศึกษาที่ฝึกงาน ณ {{ selectedCompany.name }}</caption>
              <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th scope="col" class="w-48 px-4 py-3">รหัสนักศึกษา</th><th scope="col" class="w-64 px-4 py-3">ชื่อ–นามสกุล</th><th scope="col" class="px-4 py-3">ตำแหน่งฝึกงาน</th></tr></thead>
              <tbody class="divide-y divide-divider"><tr v-for="student in selectedCompany.students" :key="student.id"><td class="whitespace-nowrap px-4 py-4 text-muted">{{ student.studentId }}</td><td class="px-4 py-4 font-semibold text-ink">{{ student.studentName }}</td><td class="px-4 py-4 text-muted">{{ student.position }}</td></tr></tbody>
            </table>
            <div class="divide-y divide-divider md:hidden"><article v-for="student in selectedCompany.students" :key="student.id" class="p-4"><p class="font-semibold text-ink">{{ student.studentName }}</p><p class="mt-1 text-xs text-muted">{{ student.studentId }}</p><p class="mt-3 text-sm text-muted">ตำแหน่ง: {{ student.position }}</p></article></div>
          </div>
        </section>
      </template>
      <template #cancel><UiButton variant="ghost">ปิด</UiButton></template>
    </UiDialog>
  </div>
</template>
