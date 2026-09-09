<script setup lang="ts">
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Eye, RotateCcw, Search, X } from '@lucide/vue'
import { requestStatusMeta } from '#shared/placement-requests'
import type { PlacementRequestPreview } from '#shared/placement-requests'
import { getPageCount, paginateItems } from '~/utils/table'

definePageMeta({ title: 'คำร้องและหนังสือ', middleware: 'staff-prototype' })
useHead({ title: 'คำร้องและหนังสือ' })
const { requests } = usePlacementRequestPreview()
const { data: persistedRequests, status: requestFetchStatus, error: requestFetchError, refresh: refreshRequests } = await useFetch<PlacementRequestPreview[]>('/api/staff/placement-requests')
watch(persistedRequests, (items) => { if (items) requests.value = items }, { immediate: true })
const { scenario } = useScenario()
const search = ref('')
const statusFilter = ref('all')
const ascending = ref(false)
const page = ref(1)
const pageSize = ref('10')
const selectedId = ref<string | null>(null)
const detailOpen = ref(false)
const selected = computed(() => requests.value.find(item => item.id === selectedId.value))
const state = computed(() => {
  if (scenario.value.forceError || requestFetchError.value) return 'error'
  if (scenario.value.viewState === 'loading' || requestFetchStatus.value === 'pending') return 'loading'
  if (scenario.value.viewState === 'empty') return 'empty'
  return 'data'
})
const options = [{ value: 'all', label: 'ทุกสถานะ' }, ...Object.entries(requestStatusMeta).map(([value, meta]) => ({ value, label: meta.label }))]
const filtered = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('th')
  return (state.value === 'empty' ? [] : requests.value)
    .filter(item => statusFilter.value === 'all' || item.status === statusFilter.value)
    .filter(item => [item.studentName, item.application.studentId, item.application.companyName, item.application.recipientName ?? ''].some(value => value.toLocaleLowerCase('th').includes(keyword)))
    .toSorted((a, b) => (ascending.value ? 1 : -1) * a.submittedAt.localeCompare(b.submittedAt))
})
const pageCount = computed(() => getPageCount(filtered.value.length, Number(pageSize.value)))
const rows = computed(() => paginateItems(filtered.value, page.value, Number(pageSize.value)))
watch([search, statusFilter, pageSize, ascending], () => { page.value = 1 })
watch(pageCount, count => { page.value = Math.min(page.value, count) })
const reset = () => { search.value = ''; statusFilter.value = 'all'; ascending.value = false; page.value = 1 }
const retry = async () => { scenario.value.forceError = false; scenario.value.viewState = 'data'; await refreshRequests() }
const open = (id: string) => { selectedId.value = id; detailOpen.value = true }
const openRequestedRecord = () => {
  const id = typeof route.query.request === 'string' ? route.query.request : null
  if (id && requests.value.some(item => item.id === id)) open(id)
}
const date = (value: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value))
const mapLink = computed(() => {
  const item = selected.value?.application
  return item?.latitude != null && item.longitude != null ? `https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=17/${item.latitude}/${item.longitude}` : null
})
const route = useRoute()
watch([persistedRequests, () => route.query.request], openRequestedRecord, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <header><h2 class="text-2xl font-bold text-ink sm:text-3xl">คำร้องและหนังสือ</h2><p class="mt-2 text-sm text-muted">ออกหนังสือขอความอนุเคราะห์ และตรวจเอกสารที่สถานประกอบการลงนาม</p></header>
    <p class="rounded-control border border-divider bg-canvas p-4 text-sm leading-6 text-muted">คำร้องจะแสดงทันทีเมื่อนักศึกษายืนยันสถานประกอบการ เจ้าหน้าที่สามารถแนบหนังสือขอความอนุเคราะห์และตรวจหนังสือตอบรับได้จากรายการนี้</p>
    <UiCard :padded="false">
      <div class="space-y-4 border-b border-divider p-5 sm:p-6">
        <h3 class="text-lg font-bold text-ink">คำร้องจากนักศึกษา</h3>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label class="relative block sm:w-96"><span class="sr-only">ค้นหานักศึกษา บริษัท หรือผู้รับหนังสือ</span><Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" /><input v-model="search" type="search" placeholder="ค้นหานักศึกษา บริษัท หรือผู้รับหนังสือ" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 text-sm"></label>
          <div class="flex items-center justify-end gap-2"><div class="min-w-0 flex-1 sm:w-64"><UiSelect v-model="statusFilter" :options="options" label="กรองสถานะคำร้อง" :label-visible="false" /></div><UiButton variant="secondary" :icon="RotateCcw" aria-label="รีเซ็ตตาราง" title="รีเซ็ตตาราง" @click="reset" /></div>
        </div>
        <div v-if="search || statusFilter !== 'all'" class="flex flex-wrap items-center gap-2 text-sm"><span v-if="search" class="rounded-full bg-surface px-3 py-1">คำค้น “{{ search }}”</span><span v-if="statusFilter !== 'all'" class="rounded-full bg-surface px-3 py-1">{{ options.find(option => option.value === statusFilter)?.label }}</span><UiButton variant="ghost" size="sm" :icon="X" @click="reset">ล้างตัวกรอง</UiButton></div>
      </div>
      <div v-if="state === 'loading'" class="space-y-4 p-6" aria-label="กำลังโหลดคำร้อง"><UiSkeleton v-for="n in 4" :key="n" class="h-16 w-full" /></div>
      <div v-else-if="state === 'error'" class="p-6"><AppErrorState title="โหลดคำร้องไม่สำเร็จ" description="ลองโหลดข้อมูลอีกครั้ง" @retry="retry" /></div>
      <div v-else-if="!rows.length" class="p-6"><AppEmptyState :title="search || statusFilter !== 'all' ? 'ไม่พบคำร้องที่ตรงกัน' : 'ยังไม่มีคำร้องขอหนังสือ'" :description="search || statusFilter !== 'all' ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรอง' : 'คำร้องจะแสดงเมื่อนักศึกษายืนยันเลือกบริษัทและส่งคำร้องในต้นแบบ' "><UiButton v-if="search || statusFilter !== 'all'" variant="secondary" @click="reset">ล้างตัวกรอง</UiButton><NuxtLink v-else to="/staff/applications" class="inline-flex min-h-11 items-center rounded-control border border-divider px-4 font-semibold text-ink">ดูประวัติการสมัคร</NuxtLink></AppEmptyState></div>
      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[1050px] text-left text-sm">
            <caption class="sr-only">คำร้องขอหนังสือและการตรวจเอกสารลงนาม</caption>
            <thead class="bg-surface text-xs text-muted"><tr><th scope="col" class="px-6 py-3">นักศึกษา</th><th scope="col" class="px-4 py-3">บริษัท / ตำแหน่ง</th><th scope="col" class="px-4 py-3">เรียน (ผู้รับหนังสือ)</th><th scope="col" class="px-4 py-3" :aria-sort="ascending ? 'ascending' : 'descending'"><button class="inline-flex min-h-9 items-center gap-1" type="button" @click="ascending = !ascending">วันที่ส่งคำร้อง<ArrowUp v-if="ascending" :size="15" /><ArrowDown v-else :size="15" /></button></th><th scope="col" class="px-4 py-3">ขั้นตอนปัจจุบัน</th><th scope="col" class="px-4 py-3">จัดการ</th></tr></thead>
            <tbody class="divide-y divide-divider"><tr v-for="item in rows" :key="item.id" class="hover:bg-surface/70"><td class="px-6 py-4"><p class="font-semibold text-ink">{{ item.studentName }}</p><p class="mt-1 text-xs text-muted">{{ item.application.studentId }}</p></td><td class="max-w-xs break-words px-4 py-4"><p class="font-semibold text-ink">{{ item.application.companyName }}</p><p class="mt-1 text-xs text-muted">{{ item.application.position }}</p></td><td class="max-w-xs break-words px-4 py-4">{{ item.application.recipientName || 'ยังไม่ระบุ' }}</td><td class="px-4 py-4 text-muted">{{ date(item.submittedAt) }}</td><td class="px-4 py-4"><UiBadge :tone="requestStatusMeta[item.status].tone">{{ requestStatusMeta[item.status].label }}</UiBadge></td><td class="px-4 py-4"><UiButton variant="ghost" :icon="Eye" :aria-label="`เปิดคำร้อง ${item.studentName}`" title="เปิดคำร้อง" @click="open(item.id)" /></td></tr></tbody>
          </table>
        </div>
        <div class="divide-y divide-divider md:hidden"><article v-for="item in rows" :key="item.id" class="space-y-3 p-5"><div class="flex items-start justify-between gap-3"><div class="min-w-0 break-words"><h4 class="font-semibold text-ink">{{ item.studentName }}</h4><p class="text-xs text-muted">{{ item.application.studentId }}</p></div><UiButton variant="ghost" :icon="Eye" :aria-label="`เปิดคำร้อง ${item.studentName}`" title="เปิดคำร้อง" @click="open(item.id)" /></div><p class="break-words text-sm">{{ item.application.companyName }} · {{ item.application.position }}</p><p class="break-words text-sm text-muted">เรียน: {{ item.application.recipientName }}</p><p class="text-xs text-muted">ส่งคำร้อง {{ date(item.submittedAt) }}</p><UiBadge :tone="requestStatusMeta[item.status].tone">{{ requestStatusMeta[item.status].label }}</UiBadge></article></div>
        <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-divider p-5 text-sm"><div class="flex items-center gap-3"><p class="text-muted">ทั้งหมด {{ filtered.length }} รายการ</p><div class="w-20"><UiSelect v-model="pageSize" :options="['10', '20', '50'].map(value => ({ value, label: value }))" label="จำนวนรายการต่อหน้า" :label-visible="false" /></div></div><nav class="flex items-center gap-2" aria-label="แบ่งหน้าคำร้อง"><UiButton variant="ghost" :icon="ChevronLeft" :disabled="page === 1" aria-label="หน้าก่อนหน้า" @click="page--" /><span>หน้า {{ page }} / {{ pageCount }}</span><UiButton variant="ghost" :icon="ChevronRight" :disabled="page === pageCount" aria-label="หน้าถัดไป" @click="page++" /></nav></footer>
      </template>
    </UiCard>
    <UiDialog v-model:open="detailOpen" size="lg" title="ดำเนินการคำร้อง" :description="selected ? `${selected.studentName} · ${selected.application.studentId}` : undefined">
      <div v-if="selected" class="space-y-5">
        <dl class="grid gap-4 text-sm sm:grid-cols-2">
          <div class="min-w-0"><dt class="text-xs text-muted">บริษัท / ตำแหน่ง</dt><dd class="mt-1 break-words font-semibold">{{ selected.application.companyName }}<p class="mt-1 font-normal">{{ selected.application.position }}</p></dd></div>
          <div class="min-w-0"><dt class="text-xs text-muted">เรียน (ผู้รับหนังสือ)</dt><dd class="mt-1 break-words">{{ selected.application.recipientName || 'ยังไม่ระบุ' }}</dd></div>
          <div class="min-w-0"><dt class="text-xs text-muted">ที่อยู่บริษัท</dt><dd class="mt-1 whitespace-pre-line break-words leading-6">{{ selected.application.companyLocation }}</dd></div>
          <div class="min-w-0"><dt class="text-xs text-muted">ที่อยู่สำหรับออกหนังสือ</dt><dd class="mt-1 whitespace-pre-line break-words leading-6">{{ selected.application.letterAddress || 'ยังไม่ระบุ' }}</dd></div>
          <div><dt class="text-xs text-muted">ส่งคำร้อง</dt><dd class="mt-1">{{ date(selected.submittedAt) }}</dd></div><div><dt class="text-xs text-muted">อัปเดตล่าสุด</dt><dd class="mt-1">{{ date(selected.updatedAt) }}</dd></div>
        </dl>
        <a v-if="mapLink" :href="mapLink" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center text-sm font-semibold underline">แสดงแผนที่บริษัท<span class="sr-only"> (เปิดแท็บใหม่)</span></a>
        <div class="border-t border-divider pt-5"><AppRequestDocuments :key="selected.id" :request="selected" staff /></div>
      </div>
    </UiDialog>
  </div>
</template>
