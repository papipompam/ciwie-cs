<script setup lang="ts">
definePageMeta({ roles: ['STUDENT'] })
const { request } = useApiClient()
const toast = useToast()
const busy = ref(false)
const file = ref<File | null>(null)
const batchId = ref('')
const resultsText = ref('')

function parseResults() {
  return resultsText.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line) => {
    const [batchMemberId, result] = line.split(/[=,\s]+/)
    if (!batchMemberId || (result !== 'ACCEPTED' && result !== 'DECLINED')) throw new Error(`รูปแบบผลไม่ถูกต้อง: ${line}`)
    return { batchMemberId, result }
  })
}

async function submit() {
  if (!file.value) { toast.add({ title: 'กรุณาเลือกไฟล์แบบตอบรับ', color: 'warning' }); return }
  busy.value = true
  try {
    const upload = new FormData(); upload.append('file', file.value)
    const stored = await request<{ fileVersionId: string }>('/api/files', { method: 'POST', body: upload })
    const response = await request<{ id: string }>('/api/responses', { method: 'POST', body: { batchId: batchId.value.trim(), fileVersionId: stored.fileVersionId, results: parseResults() } })
    toast.add({ title: 'อัปโหลดแบบตอบรับแล้ว', color: 'primary' }); await navigateTo(`/responses/${response.id}`)
  } catch (cause) { toast.add({ title: 'อัปโหลดไม่สำเร็จ', description: cause instanceof Error ? cause.message : 'โปรดลองใหม่', color: 'error' }) } finally { busy.value = false }
}
</script>

<template>
  <div class="max-w-3xl"><PageHeader title="อัปโหลดแบบตอบรับร่วม" description="ผู้อัปโหลดต้องกรอกผลครบทุกคนในชุด" icon="i-lucide-file-up" />
    <form class="space-y-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" @submit.prevent="submit">
      <label class="block"><span class="mb-1 block text-sm font-medium">รหัสชุดเอกสาร *</span><input v-model="batchId" required class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"></label>
      <label class="block"><span class="mb-1 block text-sm font-medium">ไฟล์แบบตอบรับ *</span><input required type="file" accept=".pdf" class="block min-h-11 w-full" @change="file = ($event.target as HTMLInputElement).files?.[0] || null"></label>
      <label class="block"><span class="mb-1 block text-sm font-medium">ผลรายสมาชิก *</span><textarea v-model="resultsText" required rows="7" class="w-full rounded-lg border border-slate-300 bg-transparent p-3 font-mono text-sm dark:border-slate-700" placeholder="batch-member-id ACCEPTED&#10;batch-member-id-2 DECLINED" /><span class="mt-1 block text-xs text-slate-500">หนึ่งบรรทัดต่อหนึ่งคน</span></label>
      <div class="flex justify-end gap-2"><UButton color="neutral" variant="outline" to="/responses" label="ยกเลิก" /><UButton type="submit" :loading="busy" label="อัปโหลดและสร้างร่าง" /></div>
    </form>
  </div>
</template>
