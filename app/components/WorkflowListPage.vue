<script setup lang="ts">
import type { ApiEnvelope, ListPageDefinition, ListQuery, PageResult, TableAction } from '~/types/ui'

const props = defineProps<{ definition: ListPageDefinition }>()
const route = useRoute()
const router = useRouter()
const { request } = useApiClient()
const { run } = useUiAction()
const { user } = useSession()
const toast = useToast()

const query = ref<ListQuery>({
  search: typeof route.query.search === 'string' ? route.query.search : undefined,
  page: Math.max(1, Number(route.query.page) || 1),
  pageSize: [10, 20, 50, 100].includes(Number(route.query.pageSize)) ? Number(route.query.pageSize) : 20,
  sort: typeof route.query.sort === 'string' ? route.query.sort : undefined,
  order: route.query.order === 'asc' || route.query.order === 'desc' ? route.query.order : undefined
})
const rows = ref<Array<Record<string, unknown>>>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')
const exportVisible = ref(false)
const exportForm = reactive({ coopTermId: '', organizationId: '', province: '', region: '', status: '', format: 'XLSX' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await request<ApiEnvelope<Array<Record<string, unknown>>> | PageResult<Record<string, unknown>>>(props.definition.endpoint, { query: query.value })
    rows.value = 'items' in response ? response.items : response.data
    total.value = 'items' in response ? response.total : response.meta?.total ?? response.data.length
  } catch (cause) {
    rows.value = []
    total.value = 0
    error.value = cause instanceof Error ? cause.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
  } finally {
    loading.value = false
  }
}

async function updateQuery(value: ListQuery) {
  query.value = value
  const clean = Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ''))
  await router.replace({ query: clean })
  await load()
}

function handleAction(action: TableAction, row: Record<string, unknown>) {
  const allowed = action.capability ? Boolean(row.capabilities && typeof row.capabilities === 'object' && (row.capabilities as Record<string, boolean>)[action.capability]) : true
  void run({ allowed, reason: String(row.actionReason || 'สถานะรายการนี้ยังไม่อนุญาตให้ดำเนินการ') }, async () => {
    await navigateTo(`${route.path}/${String(row.id)}`)
  })
}

function exportData() {
  const allowedRole = Boolean(user.value && (!props.definition.exportRoles || props.definition.exportRoles.includes(user.value.role)))
  void run({ allowed: Boolean(props.definition.exportable && props.definition.exportKind && allowedRole), reason: 'คุณไม่มีสิทธิ์ส่งออกชุดข้อมูลนี้' }, async () => {
    exportVisible.value = true
  })
}

async function submitExport() {
  if (!exportForm.coopTermId) return
  await request('/api/exports', { method: 'POST', body: { kind: props.definition.exportKind, format: exportForm.format, coopTermId: exportForm.coopTermId, filters: { ...query.value, ...(exportForm.organizationId ? { organizationId: exportForm.organizationId } : {}), ...(exportForm.province.trim() ? { province: exportForm.province.trim() } : {}), ...(exportForm.region.trim() ? { region: exportForm.region.trim() } : {}), ...(exportForm.status ? { status: exportForm.status } : {}) } } })
  exportVisible.value = false
  toast.add({ title: 'กำลังจัดเตรียมไฟล์', description: 'ระบบจะแจ้งเตือนเมื่อไฟล์พร้อมดาวน์โหลด', color: 'primary' })
}

onMounted(load)
</script>

<template>
  <div>
    <PageHeader :title="definition.title" :description="definition.description" :icon="definition.icon">
      <UButton v-if="definition.exportable && user && (!definition.exportRoles || definition.exportRoles.includes(user.role))" color="neutral" variant="outline" icon="i-lucide-download" label="ส่งออก Excel" aria-label="Export" @click="exportData" />
      <UButton v-if="definition.primaryAction && (!definition.primaryAction.roles || (user && definition.primaryAction.roles.includes(user.role)))" :icon="definition.primaryAction.icon" :label="definition.primaryAction.label" @click="navigateTo(`${$route.path}/new`)" />
    </PageHeader>
    <slot name="summary" />
    <ServerDataTable :columns="definition.columns" :rows="rows" :loading="loading" :error="error" :total="total" :query="query" :actions="definition.actions" @update:query="updateQuery" @refresh="load" @action="handleAction">
      <template v-if="definition.filters?.length" #filters>
        <template v-if="definition.endpoint === '/api/visits'"><label><span class="sr-only">ภูมิภาค</span><input class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 text-sm dark:border-slate-700" placeholder="ภูมิภาค" :value="query.region || ''" @change="updateQuery({ ...query, region: ($event.target as HTMLInputElement).value || undefined, page: 1 })"></label><label><span class="sr-only">จังหวัด</span><input class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 text-sm dark:border-slate-700" placeholder="จังหวัด" :value="query.province || ''" @change="updateQuery({ ...query, province: ($event.target as HTMLInputElement).value || undefined, page: 1 })"></label></template>
        <label v-for="filter in definition.filters" :key="filter.key" class="min-w-44">
          <span class="sr-only">{{ filter.label }}</span>
          <select class="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950" :value="query[filter.key] || ''" @change="updateQuery({ ...query, [filter.key]: ($event.target as HTMLSelectElement).value || undefined, page: 1 })">
            <option value="">{{ filter.label }}ทั้งหมด</option>
            <option v-for="option in filter.options" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
      </template>
    </ServerDataTable>
    <section v-if="exportVisible" class="mt-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 class="font-semibold">ตัวกรองการส่งออก</h2><form class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" @submit.prevent="submitExport"><LookupSelect v-model="exportForm.coopTermId" resource="COOP_TERMS" label="ปีการศึกษา / ภาคเรียน / รอบสหกิจ" required /><LookupSelect v-model="exportForm.organizationId" resource="ORGANIZATIONS" label="สถานประกอบการ" /><label><span class="mb-1 block text-sm">จังหวัด</span><input v-model="exportForm.province" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"></label><label><span class="mb-1 block text-sm">ภูมิภาค</span><input v-model="exportForm.region" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"></label><label><span class="mb-1 block text-sm">สถานะ</span><input v-model="exportForm.status" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"></label><label><span class="mb-1 block text-sm">รูปแบบ</span><select v-model="exportForm.format" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><option>XLSX</option><option>CSV</option></select></label><div class="flex gap-2 sm:col-span-2 lg:col-span-3"><UButton type="submit" label="สร้างไฟล์" /><UButton type="button" color="neutral" variant="outline" label="ยกเลิก" @click="exportVisible = false" /></div></form></section>
  </div>
</template>
