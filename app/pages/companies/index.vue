<script setup lang="ts">
import { ChevronLeft, ChevronRight, Plus, RotateCcw, Search } from '@lucide/vue'
import { getPageCount, paginateItems } from '~/utils/table'

definePageMeta({ title: 'ข้อมูลสถานประกอบการ', middleware: 'company-prototype', alias: ['/staff/companies', '/lecturer/companies'] })
useHead({ title: 'ข้อมูลสถานประกอบการ' })

const { scenario } = useScenario()
const { companyRecords, getCompanyPlacements } = useSupervisionGroups()
const search = ref('')
const status = ref('all')
const province = ref('all')
const pageSize = ref('10')
const currentPage = ref(1)
const effectiveViewState = computed(() => scenario.value.forceError ? 'error' : scenario.value.viewState)
const companyBasePath = computed(() => scenario.value.role === 'lecturer' ? '/lecturer/companies' : '/staff/companies')
const statusOptions = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'active', label: 'ใช้งาน' },
  { value: 'inactive', label: 'ยุติการใช้งาน' },
]
const pageSizeOptions = ['10', '20', '50'].map(value => ({ value, label: value }))
const provinceOptions = computed(() => [
  { value: 'all', label: 'ทุกจังหวัด' },
  ...[...new Set(companyRecords.value.map(company => company.province))].toSorted().map(value => ({ value, label: value })),
])
const filteredCompanies = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('th')
  return companyRecords.value
    .filter(company => !keyword || [company.id, company.name, company.branch, company.province, company.contactName].some(value => value.toLocaleLowerCase('th').includes(keyword)))
    .filter(company => status.value === 'all' || company.status === status.value)
    .filter(company => province.value === 'all' || company.province === province.value)
    .toSorted((a, b) => a.name.localeCompare(b.name, 'th'))
})
const totalPages = computed(() => getPageCount(filteredCompanies.value.length, Number(pageSize.value)))
const visibleCompanies = computed(() => paginateItems(filteredCompanies.value, currentPage.value, Number(pageSize.value)))
const rangeStart = computed(() => filteredCompanies.value.length ? (currentPage.value - 1) * Number(pageSize.value) + 1 : 0)
const rangeEnd = computed(() => Math.min(currentPage.value * Number(pageSize.value), filteredCompanies.value.length))
const hasFilters = computed(() => Boolean(search.value.trim()) || status.value !== 'all' || province.value !== 'all')

watch([search, status, province, pageSize], () => { currentPage.value = 1 })
watch(totalPages, value => { if (currentPage.value > value) currentPage.value = Math.max(1, value) })
const resetFilters = () => {
  search.value = ''
  status.value = 'all'
  province.value = 'all'
}
const retry = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
}
</script>

<template>
  <div>
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p class="text-sm font-semibold text-primary">ข้อมูลกลาง</p><h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">ข้อมูลสถานประกอบการ</h2><p class="mt-1 text-sm leading-6 text-muted">จัดการข้อมูลติดต่อและเปิดดูประวัตินักศึกษาฝึกงานในแต่ละแห่ง</p></div>
      <UiButton class="shrink-0" :icon="Plus" @click="navigateTo(`${companyBasePath}/new`)">เพิ่มสถานประกอบการ</UiButton>
    </header>

    <UiCard :padded="false">
      <div class="p-5 sm:p-6">
        <div class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <label class="block w-full text-sm font-semibold text-ink sm:max-w-md xl:w-96 xl:flex-none">
            <span class="sr-only">ค้นหาสถานประกอบการ</span>
            <span class="relative block"><Search class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" :size="18" aria-hidden="true" /><input id="company-search" v-model="search" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" placeholder="ค้นหาชื่อ สาขา จังหวัด หรือผู้ประสานงาน"></span>
          </label>
          <div class="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:ml-auto">
            <UiSelect v-model="status" class="w-full sm:w-48" :options="statusOptions" label="กรองสถานะ" :label-visible="false" />
            <UiSelect v-model="province" class="w-full sm:w-52" :options="provinceOptions" label="กรองจังหวัด" :label-visible="false" />
            <button type="button" class="inline-grid size-11 shrink-0 place-self-start place-items-center rounded-control border border-divider text-muted hover:bg-surface hover:text-ink sm:place-self-auto" aria-label="รีเซ็ตตาราง" title="รีเซ็ตตาราง" @click="resetFilters"><RotateCcw :size="17" aria-hidden="true" /></button>
          </div>
        </div>
        <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-xs"><span class="font-semibold text-muted">ตัวกรองที่ใช้:</span><span v-if="search" class="rounded-full bg-surface px-3 py-1.5 text-ink">ค้นหา “{{ search }}”</span><span v-if="status !== 'all'" class="rounded-full bg-surface px-3 py-1.5 text-ink">{{ statusOptions.find(item => item.value === status)?.label }}</span><span v-if="province !== 'all'" class="rounded-full bg-surface px-3 py-1.5 text-ink">จังหวัด{{ province }}</span></div>
      </div>

      <div v-if="effectiveViewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดข้อมูลสถานประกอบการ"><UiSkeleton v-for="index in 6" :key="index" class="h-16" /></div>
      <div v-else-if="effectiveViewState === 'error'" class="p-5 sm:p-6"><AppErrorState title="โหลดข้อมูลสถานประกอบการไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง" @retry="retry" /></div>
      <div v-else-if="effectiveViewState === 'empty' || !visibleCompanies.length" class="p-5 sm:p-6"><AppEmptyState :title="hasFilters ? 'ไม่พบสถานประกอบการที่ตรงกับตัวกรอง' : 'ยังไม่มีข้อมูลสถานประกอบการ'" :description="hasFilters ? 'ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองในตาราง' : 'เพิ่มสถานประกอบการเพื่อใช้กับคำร้องและการจัดกลุ่มนิเทศ'"><UiButton v-if="hasFilters" variant="secondary" @click="resetFilters">ล้างตัวกรอง</UiButton><UiButton v-else :icon="Plus" @click="navigateTo(`${companyBasePath}/new`)">เพิ่มสถานประกอบการ</UiButton></AppEmptyState></div>
      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[1040px] border-collapse text-left text-sm"><caption class="sr-only">รายการสถานประกอบการ</caption><thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th scope="col" class="px-6 py-3">สถานประกอบการ</th><th scope="col" class="px-4 py-3">พื้นที่</th><th scope="col" class="px-4 py-3">ผู้ประสานงาน</th><th scope="col" class="px-4 py-3 text-center">นักศึกษาฝึกงาน</th><th scope="col" class="px-4 py-3">สถานะข้อมูล</th><th scope="col" class="w-28 px-4 py-3 text-right"><span class="sr-only">ดำเนินการ</span></th></tr></thead><tbody class="divide-y divide-divider"><tr v-for="company in visibleCompanies" :key="company.id" class="transition-colors hover:bg-surface/70"><td class="px-6 py-4"><p class="font-semibold text-ink">{{ company.name }}</p><p class="mt-1 text-xs text-muted">{{ company.id }} · {{ company.branch }}</p></td><td class="px-4 py-4"><p class="text-ink">{{ company.province }}</p><p class="mt-1 text-xs text-muted">{{ company.region }}</p></td><td class="px-4 py-4"><p class="text-ink">{{ company.contactName }}</p><p class="mt-1 text-xs text-muted">{{ company.contactPhone }}</p></td><td class="px-4 py-4 text-center font-semibold text-ink">{{ getCompanyPlacements(company.id).length }} คน</td><td class="px-4 py-4"><UiBadge :tone="company.status === 'active' ? 'success' : 'neutral'">{{ company.status === 'active' ? 'ใช้งาน' : 'ยุติการใช้งาน' }}</UiBadge></td><td class="px-4 py-4 text-right"><NuxtLink :to="`${companyBasePath}/${company.id}`" class="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-control border border-divider bg-canvas px-3 text-sm font-semibold text-ink hover:bg-surface" :aria-label="`ดูข้อมูล ${company.name}`">ดูข้อมูล</NuxtLink></td></tr></tbody></table>
        </div>
        <div class="divide-y divide-divider md:hidden"><article v-for="company in visibleCompanies" :key="company.id" class="p-5"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="font-semibold text-ink">{{ company.name }}</h3><p class="mt-1 text-xs text-muted">{{ company.id }} · {{ company.branch }} · {{ company.province }}</p></div><div class="shrink-0 text-right"><p class="text-xs text-muted">สถานะข้อมูล</p><UiBadge class="mt-1" :tone="company.status === 'active' ? 'success' : 'neutral'">{{ company.status === 'active' ? 'ใช้งาน' : 'ยุติการใช้งาน' }}</UiBadge></div></div><dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-divider pt-3 text-sm"><div class="min-w-0"><dt class="text-xs text-muted">ผู้ประสานงาน</dt><dd class="mt-1 text-ink">{{ company.contactName }}</dd><dd class="mt-1 text-xs text-muted">{{ company.contactPhone }}</dd></div><div class="min-w-0"><dt class="text-xs text-muted">นักศึกษาฝึกงาน</dt><dd class="mt-1 font-semibold text-ink">{{ getCompanyPlacements(company.id).length }} คน</dd></div></dl><div class="mt-4 flex justify-end border-t border-divider pt-3"><NuxtLink :to="`${companyBasePath}/${company.id}`" class="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-control border border-divider bg-canvas px-3 text-sm font-semibold text-ink hover:bg-surface" :aria-label="`ดูข้อมูล ${company.name}`">ดูข้อมูล</NuxtLink></div></article></div>
        <footer class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"><div class="flex items-center gap-3"><span class="text-muted">แสดง {{ rangeStart }}–{{ rangeEnd }} จาก {{ filteredCompanies.length }} รายการ</span><div class="w-20"><UiSelect v-model="pageSize" :options="pageSizeOptions" label="จำนวนข้อมูลต่อหน้า" :label-visible="false" /></div></div><div class="flex items-center justify-between gap-3 sm:justify-end"><span class="text-muted">หน้า {{ currentPage }} จาก {{ totalPages }}</span><div class="flex gap-1"><button type="button" class="grid size-9 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-40" :disabled="currentPage <= 1" aria-label="หน้าก่อนหน้า" @click="currentPage--"><ChevronLeft :size="17" aria-hidden="true" /></button><button type="button" class="grid size-9 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-40" :disabled="currentPage >= totalPages" aria-label="หน้าถัดไป" @click="currentPage++"><ChevronRight :size="17" aria-hidden="true" /></button></div></div></footer>
      </template>
    </UiCard>
  </div>
</template>
