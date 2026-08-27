<script setup lang="ts">
import type { ListQuery, SortDirection, TableAction, TableColumn } from '~/types/ui'

const props = withDefaults(defineProps<{
  columns: TableColumn[]
  rows: Array<Record<string, unknown>>
  loading?: boolean
  error?: string
  total?: number
  query: ListQuery
  actions?: TableAction[]
  emptyText?: string
}>(), { error: '', total: 0, actions: () => [], emptyText: 'ยังไม่มีข้อมูล' })

const emit = defineEmits<{
  'update:query': [query: ListQuery]
  refresh: []
  action: [action: TableAction, row: Record<string, unknown>]
}>()

const searchInput = ref(props.query.search || '')
let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => update({ search: value || undefined, page: 1 }), 350)
})

watch(() => props.query.search, value => { searchInput.value = value || '' })

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.query.pageSize)))
const startRow = computed(() => props.total === 0 ? 0 : ((props.query.page - 1) * props.query.pageSize) + 1)
const endRow = computed(() => Math.min(props.total, props.query.page * props.query.pageSize))
const visiblePages = computed<Array<number | 'ellipsis'>>(() => {
  if (pageCount.value <= 7) return Array.from({ length: pageCount.value }, (_, index) => index + 1)
  const current = props.query.page
  if (current <= 4) return [1, 2, 3, 4, 5, 'ellipsis', pageCount.value]
  if (current >= pageCount.value - 3) return [1, 'ellipsis', pageCount.value - 4, pageCount.value - 3, pageCount.value - 2, pageCount.value - 1, pageCount.value]
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', pageCount.value]
})

function update(patch: Partial<ListQuery>) {
  emit('update:query', { ...props.query, ...patch })
}

function toggleSort(column: TableColumn) {
  if (!column.sortable) return
  let direction: SortDirection
  if (props.query.sort !== column.key) direction = 'asc'
  else if (props.query.order === 'asc') direction = 'desc'
  else direction = undefined

  update({ sort: direction ? column.key : undefined, order: direction, page: 1 })
}

function sortIcon(column: TableColumn) {
  if (props.query.sort !== column.key || !props.query.order) return 'i-lucide-arrow-up-down'
  return props.query.order === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
}

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'ใช่' : 'ไม่ใช่'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'ใช้งานอยู่',
  SUSPENDED: 'ระงับบัญชี',
  SUBMITTED: 'ยื่นแล้ว',
  WAITING_RESPONSE: 'รอการตอบกลับ',
  INTERVIEW_PENDING: 'รอสัมภาษณ์',
  PRELIMINARY_ACCEPTED: 'ตอบรับเบื้องต้น',
  REJECTED: 'ไม่ผ่าน',
  CANCELLED: 'ยกเลิก',
  REQUESTED: 'ส่งคำขอแล้ว',
  IN_PROGRESS: 'กำลังดำเนินการ',
  READY_TO_SEND: 'พร้อมนำส่ง',
  DRAFT: 'ฉบับร่าง',
  PENDING_REVIEW: 'รอตรวจสอบ',
  CONFIRMED: 'ยืนยันแล้ว',
  SCHEDULED: 'จัดตารางแล้ว',
  COMPLETED: 'ดำเนินการแล้ว',
  POSTPONED: 'เลื่อน',
  SUBMITTED_EVALUATION: 'ส่งผลแล้ว'
}

function statusClass(value: unknown) {
  const status = String(value || '')
  if (['ACTIVE', 'CONFIRMED', 'COMPLETED', 'READY_TO_SEND', 'SUBMITTED_EVALUATION'].includes(status)) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  if (['WAITING_RESPONSE', 'INTERVIEW_PENDING', 'IN_PROGRESS', 'PENDING_REVIEW', 'SCHEDULED'].includes(status)) return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  if (['REJECTED', 'CANCELLED', 'SUSPENDED'].includes(status)) return 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
  if (['DRAFT', 'POSTPONED', 'PRELIMINARY_ACCEPTED'].includes(status)) return 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300'
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}
</script>

<template>
  <section class="overflow-hidden rounded-[14px] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.055)] dark:bg-slate-900 dark:shadow-none" aria-label="ตารางข้อมูล">
    <div class="space-y-3 border-b border-slate-200/80 p-4 dark:border-slate-800 sm:p-5">
      <div class="flex flex-col gap-2 lg:flex-row lg:items-center">
        <label class="relative block w-full max-w-md">
          <span class="sr-only">ค้นหา</span>
          <UIcon name="i-lucide-search" class="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
          <input v-model="searchInput" type="search" class="min-h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="ค้นหารหัส ชื่อ หรือข้อมูลในรายการ..." >
        </label>
        <div v-if="$slots.filters" class="flex flex-1 flex-wrap gap-2"><slot name="filters" /></div>
        <button type="button" class="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="รีเฟรชข้อมูล" @click="emit('refresh')">
          <UIcon name="i-lucide-refresh-cw" class="size-4" :class="loading && 'animate-spin'" /> รีเฟรช
        </button>
      </div>
    </div>

    <div v-if="error" class="grid min-h-64 place-items-center p-8 text-center">
      <div>
        <UIcon name="i-lucide-circle-alert" class="mx-auto size-10 text-rose-500" />
        <p class="mt-3 font-medium">โหลดข้อมูลไม่สำเร็จ</p>
        <p class="mt-1 text-sm text-slate-500">{{ error }}</p>
        <UButton class="mt-4" icon="i-lucide-refresh-cw" label="ลองอีกครั้ง" @click="emit('refresh')" />
      </div>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="bg-slate-50/90 text-xs font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-300">
          <tr>
            <th v-for="column in columns" :key="column.key" scope="col" class="whitespace-nowrap px-4 py-3.5" :class="column.class">
              <button v-if="column.sortable" type="button" class="flex min-h-11 items-center gap-2" @click="toggleSort(column)">
                {{ column.label }} <UIcon :name="sortIcon(column)" class="size-4" />
              </button>
              <span v-else>{{ column.label }}</span>
            </th>
            <th v-if="actions.length" scope="col" class="w-1 whitespace-nowrap px-4 py-3 text-right">จัดการ</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
          <template v-if="loading">
            <tr v-for="index in 5" :key="`loading-${index}`">
              <td v-for="column in columns" :key="column.key" class="px-4 py-4"><div class="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /></td>
              <td v-if="actions.length" class="px-4 py-4"><div class="h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /></td>
            </tr>
          </template>
          <tr v-else-if="!rows.length">
            <td :colspan="columns.length + (actions.length ? 1 : 0)" class="h-64 text-center text-slate-500">
              <UIcon name="i-lucide-inbox" class="mx-auto mb-3 size-10" />{{ emptyText }}
            </td>
          </tr>
          <tr v-for="(row, index) in loading ? [] : rows" :key="String(row.id || index)" class="transition-colors hover:bg-indigo-50/35 dark:hover:bg-slate-800/50">
            <td v-for="column in columns" :key="column.key" class="max-w-xs px-4 py-3" :class="column.class">
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">
                <span v-if="column.key === 'status'" class="inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold" :class="statusClass(row[column.key])">{{ statusLabels[String(row[column.key])] || display(row[column.key]) }}</span>
                <span v-else>{{ display(row[column.key]) }}</span>
              </slot>
            </td>
            <td v-if="actions.length" class="px-4 py-3">
              <div class="flex max-w-52 flex-wrap justify-end gap-1">
                <UTooltip v-for="action in actions" :key="action.key" :text="action.label">
                  <button type="button" class="flex size-8 items-center justify-center rounded-md border border-slate-200 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-300 dark:hover:bg-indigo-950" :aria-label="action.label" @click="emit('action', action, row)">
                    <UIcon :name="action.icon" class="size-4" />
                  </button>
                </UTooltip>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3.5 text-sm dark:border-slate-800">
      <div class="flex items-center gap-2 text-slate-500">
        <span>แสดง {{ startRow }} ถึง {{ endRow }} จาก {{ total }} รายการ</span>
        <select :value="query.pageSize" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-2 dark:border-slate-700" aria-label="จำนวนรายการต่อหน้า" @change="update({ pageSize: Number(($event.target as HTMLSelectElement).value), page: 1 })">
          <option v-for="size in [10, 20, 50, 100]" :key="size" :value="size">{{ size }} รายการ</option>
        </select>
      </div>
      <div class="flex items-center gap-1">
        <button type="button" class="flex size-10 items-center justify-center rounded-lg border border-slate-300 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="หน้าก่อนหน้า" :disabled="query.page <= 1" @click="update({ page: query.page - 1 })">
          <UIcon name="i-lucide-chevron-left" class="size-4" />
        </button>
        <span class="min-w-24 px-2 text-center text-slate-500 sm:hidden">หน้า {{ query.page }} จาก {{ pageCount }}</span>
        <div class="hidden items-center gap-1 sm:flex">
          <template v-for="(page, index) in visiblePages" :key="`${page}-${index}`">
            <span v-if="page === 'ellipsis'" class="flex size-10 items-center justify-center text-slate-400">…</span>
            <button v-else type="button" class="flex size-10 items-center justify-center rounded-lg font-medium transition" :class="page === query.page ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'" :aria-current="page === query.page ? 'page' : undefined" :aria-label="`หน้า ${page}`" @click="update({ page })">{{ page }}</button>
          </template>
        </div>
        <button type="button" class="flex size-10 items-center justify-center rounded-lg border border-slate-300 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" aria-label="หน้าถัดไป" :disabled="query.page >= pageCount" @click="update({ page: query.page + 1 })">
          <UIcon name="i-lucide-chevron-right" class="size-4" />
        </button>
      </div>
    </footer>
  </section>
</template>
