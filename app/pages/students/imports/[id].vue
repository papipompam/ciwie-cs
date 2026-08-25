<script setup lang="ts">
import type { ApiEnvelope, ListQuery, PageResult } from '~/types/ui'
definePageMeta({ roles: ['LECTURER', 'ADMIN'] })
const route = useRoute()
const { request } = useApiClient()
const toast = useToast()
const rows = ref<Array<Record<string, unknown>>>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')
const confirming = ref(false)
const previewHash = ref('')
const selectedRows = ref<number[]>([])
const query = ref<ListQuery>({ page: 1, pageSize: 20 })
const coopTermId = computed(() => typeof route.query.coopTermId === 'string' ? route.query.coopTermId : '')
const routePreviewHash = computed(() => typeof route.query.previewHash === 'string' ? route.query.previewHash : '')
const columns = [
  { key: 'select', label: 'เลือก' }, { key: 'rowNumber', label: 'แถว', sortable: true }, { key: 'studentCode', label: 'รหัสนักศึกษา', sortable: true },
  { key: 'displayName', label: 'ชื่อ–นามสกุล' }, { key: 'classification', label: 'ผลตรวจ', sortable: true }, { key: 'message', label: 'รายละเอียด' }
]
const summary = computed(() => rows.value.reduce<Record<string, number>>((result, row) => { const key = String(row.classification || 'UNKNOWN'); result[key] = (result[key] || 0) + 1; return result }, {}))
const canConfirm = computed(() => !loading.value && !error.value && selectedRows.value.length > 0 && /^[a-f0-9]{64}$/i.test(previewHash.value))

function toggleRow(rowNumber: number) {
  selectedRows.value = selectedRows.value.includes(rowNumber) ? selectedRows.value.filter(value => value !== rowNumber) : [...selectedRows.value, rowNumber]
}

async function load() {
  loading.value = true; error.value = ''
  try {
    const response = await request<((ApiEnvelope<Array<Record<string, unknown>>> | PageResult<Record<string, unknown>>) & { previewHash?: string }) | { rows: Array<{ rowNo: number, status: string, normalizedData: Record<string, unknown>, errors?: unknown }>, totalRows: number }>(`/api/imports/${route.params.id}/preview`, { query: query.value })
    if ('rows' in response) {
      rows.value = response.rows.map(row => ({ rowNumber: row.rowNo, studentCode: row.normalizedData.studentCode, displayName: `${row.normalizedData.firstNameTh || ''} ${row.normalizedData.lastNameTh || ''}`.trim(), classification: row.status, message: row.errors ? JSON.stringify(row.errors) : '' }))
      total.value = response.totalRows
    } else {
      rows.value = 'items' in response ? response.items : response.data
      total.value = 'items' in response ? response.total : response.meta?.total ?? response.data.length
      previewHash.value = response.previewHash || previewHash.value
    }
    previewHash.value ||= routePreviewHash.value
    const selectable = rows.value.filter(row => row.classification === 'NEW').map(row => Number(row.rowNumber)).filter(Number.isInteger)
    selectedRows.value = [...new Set([...selectedRows.value, ...selectable])]
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'โหลด preview ไม่สำเร็จ' } finally { loading.value = false }
}
async function updateQuery(value: ListQuery) { query.value = value; await load() }
async function confirmImport() {
  if (!canConfirm.value || !coopTermId.value) { toast.add({ title: 'ยังยืนยันไม่ได้', description: 'กรุณาเลือกแถว NEW อย่างน้อยหนึ่งแถว และตรวจสอบภาคสหกิจ/preview', color: 'warning' }); return }
  confirming.value = true
  try { await request(`/api/imports/${route.params.id}/confirm`, { method: 'POST', body: { previewHash: previewHash.value, acceptedRowNumbers: [...selectedRows.value].sort((a, b) => a - b), coopTermId: coopTermId.value } }); toast.add({ title: 'นำเข้ารายชื่อสำเร็จ', color: 'primary' }); await navigateTo('/students') } catch (cause) { toast.add({ title: 'ยืนยันไม่สำเร็จ', description: cause instanceof Error ? cause.message : 'โปรดลองอีกครั้ง', color: 'error' }) } finally { confirming.value = false }
}
onMounted(load)
</script>

<template>
  <div><PageHeader title="ตรวจสอบข้อมูลก่อนนำเข้า" description="Preview ยังไม่เขียนฐานข้อมูล แถวที่ขัดแย้งจะไม่ถูกเขียนทับอัตโนมัติ" icon="i-lucide-list-checks"><UButton color="neutral" variant="outline" label="ยกเลิก" to="/students" /><UButton :loading="confirming" icon="i-lucide-database-zap" label="ยืนยันการนำเข้า" @click="confirmImport" /></PageHeader>
    <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div v-for="key in ['NEW','UNCHANGED','CONFLICT','INVALID']" :key="key" class="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"><p class="text-xs text-slate-500">{{ key }}</p><p class="mt-1 text-xl font-semibold">{{ summary[key] || 0 }}</p></div></div>
    <p class="mb-3 text-sm text-slate-500">เลือกนำเข้า {{ selectedRows.length }} แถว · แถว CONFLICT และ INVALID ไม่สามารถเลือกได้</p>
    <ServerDataTable :columns="columns" :rows="rows" :loading="loading" :error="error" :total="total" :query="query" empty-text="ไม่พบแถวข้อมูล" @update:query="updateQuery" @refresh="load">
      <template #cell-select="{ row }"><input v-if="row.classification === 'NEW'" type="checkbox" class="size-5 accent-teal-600" :checked="selectedRows.includes(Number(row.rowNumber))" :aria-label="`เลือกแถว ${row.rowNumber}`" @change="toggleRow(Number(row.rowNumber))"><span v-else aria-hidden="true">—</span></template>
    </ServerDataTable>
  </div>
</template>
