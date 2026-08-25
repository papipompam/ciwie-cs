<script setup lang="ts">
import type { ApiEnvelope } from '~/types/ui'
const route = useRoute()
const { request } = useApiClient()
const { run } = useUiAction()
const { user } = useSession()
const toast = useToast()
const loading = ref(true)
const error = ref('')
const item = ref<Record<string, unknown>>({})
const reason = ref('')
const targetStatus = ref('')
const occurredAt = ref('')
const transitionNote = ref('')
const transitionEvidence = ref<File[]>([])
const workSiteId = ref('')
const expense = reactive({ visitId: '', round: 1, travelDays: 1, travelAmount: 0, lodgingAmount: 0, mealAmount: 0, note: '' })

const resource = computed(() => String(route.params.resource))
const id = computed(() => String(route.params.id))
const endpointResource = computed(() => ({ documents: 'document-requests' }[resource.value] || resource.value))
const title = computed(() => ({ applications: 'รายละเอียดใบสมัคร', documents: 'รายละเอียดคำขอเอกสาร', responses: 'รายละเอียดแบบตอบรับ', placements: 'รายละเอียดสถานที่ฝึกงาน', visits: 'รายละเอียดการนิเทศ', evaluations: 'รายละเอียดการประเมิน', expenses: 'รายละเอียดค่าใช้จ่าย', students: 'ข้อมูลนักศึกษา', audit: 'รายละเอียดประวัติระบบ' }[resource.value] || 'รายละเอียด'))
const capabilities = computed(() => item.value.capabilities && typeof item.value.capabilities === 'object' ? item.value.capabilities as Record<string, boolean> : {})

async function load() {
  loading.value = true; error.value = ''
  try {
    const response = await request<ApiEnvelope<Record<string, unknown>> | Record<string, unknown>>(`/api/${endpointResource.value}/${id.value}`)
    item.value = 'data' in response ? response.data as Record<string, unknown> : response
    workSiteId.value = String(item.value.currentWorkSiteId || item.value.workSiteId || '')
    expense.visitId = String(item.value.visitId || '')
    expense.round = Number(item.value.round || 1)
    expense.travelDays = Number(item.value.travelDays || 1)
    expense.travelAmount = Number(item.value.travelAmount || 0)
    expense.lodgingAmount = Number(item.value.lodgingAmount || 0)
    expense.mealAmount = Number(item.value.mealAmount || 0)
    expense.note = String(item.value.note || '')
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'โหลดข้อมูลไม่สำเร็จ' } finally { loading.value = false }
}

async function command(name: string, needsReason = false) {
  await run({ allowed: capabilities.value[name] !== false, reason: String(item.value.actionReason || 'สถานะปัจจุบันไม่อนุญาตคำสั่งนี้') }, async () => {
    if (needsReason && !reason.value.trim()) {
      toast.add({ title: 'กรุณาระบุเหตุผล', description: 'รายการสำคัญต้องมีเหตุผลเพื่อเก็บในประวัติ', color: 'warning' })
      return
    }
    const expectedVersion = Number(item.value.version ?? 0)
    if (resource.value === 'applications' && name === 'transition' && !targetStatus.value) {
      toast.add({ title: 'กรุณาเลือกสถานะปลายทาง', color: 'warning' })
      return
    }
    if (resource.value === 'placements' && name === 'correct' && !workSiteId.value.trim()) {
      toast.add({ title: 'กรุณาระบุ Work Site ID', color: 'warning' })
      return
    }
    if (resource.value === 'expenses') {
      await request(`/api/expenses/${id.value}/correct`, { method: 'POST', body: { expectedVersion, reason: reason.value.trim(), travelDays: expense.travelDays, travelAmount: expense.travelAmount, lodgingAmount: expense.lodgingAmount, mealAmount: expense.mealAmount, ...(expense.note.trim() ? { note: expense.note.trim() } : {}) } })
    } else {
      const evidenceFileVersionIds: string[] = []
      if (resource.value === 'applications') {
        for (const file of transitionEvidence.value) {
          const formData = new FormData(); formData.append('file', file)
          const stored = await request<{ fileVersionId: string }>('/api/files', { method: 'POST', body: formData })
          evidenceFileVersionIds.push(stored.fileVersionId)
        }
      }
      const body = resource.value === 'applications'
        ? { to: targetStatus.value, reason: reason.value.trim() || undefined, occurredAt: occurredAt.value || undefined, note: transitionNote.value.trim() || undefined, ...(evidenceFileVersionIds.length ? { evidenceFileVersionIds } : {}), expectedVersion }
        : { expectedVersion, ...(name === 'correct' && resource.value === 'placements' ? { workSiteId: workSiteId.value.trim() } : {}), ...(needsReason ? { reason: reason.value.trim() } : {}) }
      await request(`/api/${endpointResource.value}/${id.value}/${name}`, { method: 'POST', body })
    }
    toast.add({ title: 'ดำเนินการสำเร็จ', color: 'primary' })
    reason.value = ''; targetStatus.value = ''; occurredAt.value = ''; transitionNote.value = ''; transitionEvidence.value = []; await load()
  })
}

const commands = computed(() => {
  if (resource.value === 'applications') return [{ key: 'transition', label: 'ยืนยันเปลี่ยนสถานะ', icon: 'i-lucide-git-branch', reason: user.value?.role !== 'STUDENT' }]
  if (resource.value === 'placements') return [{ key: 'correct', label: 'แก้ไขข้อมูล', icon: 'i-lucide-file-pen-line', reason: true }, { key: 'reverse', label: 'ย้อนรายการ', icon: 'i-lucide-undo-2', reason: true }]
  if (resource.value === 'expenses') return [{ key: 'correct', label: 'บันทึก Correction', icon: 'i-lucide-file-pen-line', reason: true }]
  return []
})
const allowedTransitions = computed(() => Array.isArray(item.value.allowedTransitions) ? item.value.allowedTransitions.map(String) : [])
const evidenceFiles = computed(() => Array.isArray(item.value.evidenceFiles) ? item.value.evidenceFiles as Array<{ fileVersionId: string, filename?: string, sizeBytes?: string }> : [])

async function downloadEvidence(fileVersionId: string) {
  const result = await request<{ url: string }>(`/api/files/${fileVersionId}/download`)
  window.open(result.url, '_blank', 'noopener,noreferrer')
}
onMounted(load)
</script>

<template>
  <div>
    <PageHeader :title="title" :description="`รหัสอ้างอิง ${id}`" icon="i-lucide-file-search"><UButton color="neutral" variant="outline" icon="i-lucide-arrow-left" label="กลับ" :to="`/${resource}`" /></PageHeader>
    <div v-if="loading" class="h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    <div v-else-if="error" class="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"><p>{{ error }}</p><UButton class="mt-4" icon="i-lucide-refresh-cw" label="ลองอีกครั้ง" @click="load" /></div>
    <section v-else class="space-y-5">
      <dl class="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="(value, key) in item" v-show="!['capabilities', 'members', 'items', 'evidenceFiles'].includes(String(key))" :key="key" class="min-h-24 bg-white p-4 dark:bg-slate-900"><dt class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ key }}</dt><dd class="mt-2 break-words text-sm">{{ typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—') }}</dd></div>
      </dl>
      <section v-if="evidenceFiles.length" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 class="font-semibold">หลักฐานแนบ</h2><ul class="mt-3 divide-y divide-slate-200 dark:divide-slate-800"><li v-for="evidence in evidenceFiles" :key="evidence.fileVersionId" class="flex flex-wrap items-center justify-between gap-3 py-3"><span><span class="block text-sm font-medium">{{ evidence.filename || evidence.fileVersionId }}</span><span class="text-xs text-slate-500">{{ evidence.sizeBytes || '—' }} bytes</span></span><UButton color="neutral" variant="outline" icon="i-lucide-download" label="ดาวน์โหลด" @click="downloadEvidence(evidence.fileVersionId)" /></li></ul></section>
      <section v-if="resource === 'documents' && user?.role !== 'STUDENT'" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 class="font-semibold">ดำเนินการเอกสาร</h2><p class="mt-1 text-sm text-slate-500">ระบบจะนำรหัสคำขอนี้ไปกรอกให้โดยอัตโนมัติ</p><UButton class="mt-3" icon="i-lucide-folder-cog" label="เปิดหน้าจัดการชุดเอกสาร" :to="`/documents/manage?mode=member&requestId=${encodeURIComponent(id)}`" /></section>
      <ResponseDraftEditor v-if="resource === 'responses'" :record="item" @reload="load" />
      <EvaluationRubricEditor v-else-if="resource === 'evaluations'" :record="item" @reload="load" />
      <VisitWorkflowEditor v-else-if="resource === 'visits'" :record="item" @reload="load" />
      <SupervisionResultEditor v-if="resource === 'visits'" :record="item" @reload="load" />
      <EvaluationCreatePanel v-if="resource === 'visits'" :record="item" />
      <div v-if="commands.length" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 class="font-semibold">ดำเนินการ</h2>
        <label v-if="resource === 'applications'" class="mt-4 block"><span class="mb-1.5 block text-sm text-slate-500">สถานะปลายทาง</span><select v-model="targetStatus" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><option value="">เลือกสถานะ</option><option v-for="status in allowedTransitions" :key="status" :value="status">{{ status }}</option></select></label>
        <div v-if="resource === 'applications'" class="mt-4 grid gap-4 sm:grid-cols-2"><label><span class="mb-1 block text-sm">วันที่ได้รับผล</span><input v-model="occurredAt" type="date" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"></label><label><span class="mb-1 block text-sm">หลักฐาน PDF</span><input type="file" multiple accept=".pdf,application/pdf" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" @change="transitionEvidence = Array.from(($event.target as HTMLInputElement).files || [])"></label><label class="sm:col-span-2"><span class="mb-1 block text-sm">หมายเหตุผลการสมัคร</span><textarea v-model="transitionNote" rows="2" class="w-full rounded-lg border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label></div>
        <label v-if="resource === 'placements'" class="mt-4 block"><span class="mb-1.5 block text-sm text-slate-500">Work Site ID ใหม่</span><input v-model="workSiteId" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"></label>
        <div v-if="resource === 'expenses'" class="mt-4 grid gap-4 sm:grid-cols-2"><label><span class="mb-1 block text-sm">Visit ID (แก้ไขไม่ได้)</span><input v-model="expense.visitId" readonly class="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 dark:border-slate-700 dark:bg-slate-800"></label><label><span class="mb-1 block text-sm">รอบ (แก้ไขไม่ได้)</span><input v-model.number="expense.round" readonly type="number" class="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-100 px-3 dark:border-slate-700 dark:bg-slate-800"></label><label><span class="mb-1 block text-sm">จำนวนวันเดินทาง</span><input v-model.number="expense.travelDays" type="number" min="1" max="366" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"></label><label v-for="field in ['travelAmount', 'lodgingAmount', 'mealAmount']" :key="field"><span class="mb-1 block text-sm">{{ field }}</span><input v-model.number="expense[field as keyof typeof expense]" type="number" min="0" step="0.01" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"></label><label class="sm:col-span-2"><span class="mb-1 block text-sm">หมายเหตุ</span><textarea v-model="expense.note" rows="2" class="w-full rounded-lg border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label></div>
        <label class="mt-4 block"><span class="mb-1.5 block text-sm text-slate-500">เหตุผล (จำเป็นสำหรับการยกเลิก ส่งกลับ หรือแก้ไข)</span><textarea v-model="reason" rows="3" class="w-full rounded-lg border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label>
        <div class="mt-4 flex flex-wrap gap-2"><UButton v-for="action in commands" :key="action.key" :color="action.key === 'cancel' || action.key === 'reverse' ? 'error' : 'primary'" :variant="action.key === 'confirm' || action.key === 'submit' || action.key === 'complete' ? 'solid' : 'outline'" :icon="action.icon" :label="action.label" @click="command(action.key, action.reason)" /></div>
      </div>
    </section>
  </div>
</template>
