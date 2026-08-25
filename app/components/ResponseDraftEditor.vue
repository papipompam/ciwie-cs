<script setup lang="ts">
type ResultValue = 'ACCEPTED' | 'DECLINED' | ''
interface Member { batchMemberId: string, studentName?: string, studentCode?: string, result?: ResultValue }

const props = defineProps<{ record: Record<string, unknown> }>()
const emit = defineEmits<{ reload: [] }>()
const { request } = useApiClient()
const { run } = useUiAction()
const { user } = useSession()
const toast = useToast()
const results = reactive<Record<string, ResultValue>>({})
const reason = ref('')
const busy = ref(false)
const confirmVisible = ref(false)

const members = computed(() => Array.isArray(props.record.members) ? props.record.members as Member[] : [])
const version = computed(() => Number(props.record.version ?? props.record.lockVersion ?? 0))
const status = computed(() => String(props.record.status || 'DRAFT'))
const canEdit = computed(() => status.value === 'DRAFT')
const reviewer = computed(() => user.value?.role === 'LECTURER' || user.value?.role === 'ADMIN')

watch(members, (value) => {
  for (const member of value) results[member.batchMemberId] = member.result || ''
}, { immediate: true })

function payloadResults() {
  return members.value.map(member => ({ batchMemberId: member.batchMemberId, result: results[member.batchMemberId] }))
}

async function saveDraft() {
  await run({ allowed: canEdit.value && !busy.value, reason: status.value !== 'DRAFT' ? 'แก้ไขได้เฉพาะสถานะร่าง' : 'กำลังบันทึกข้อมูล' }, async () => {
    if (!members.value.length || payloadResults().some(item => !item.result)) {
      toast.add({ title: 'ข้อมูลยังไม่ครบ', description: 'กรุณาเลือก ACCEPTED หรือ DECLINED ให้สมาชิกทุกคน', color: 'warning' }); return
    }
    busy.value = true
    try {
      await request(`/api/responses/${props.record.id}/draft-results`, { method: 'PUT', body: { expectedVersion: version.value, results: payloadResults() } })
      toast.add({ title: 'บันทึกร่างแล้ว', color: 'primary' }); emit('reload')
    } finally { busy.value = false }
  })
}

async function submitReview() {
  await run({ allowed: canEdit.value && !busy.value, reason: 'ส่งตรวจได้เฉพาะแบบตอบรับสถานะร่าง' }, async () => {
    if (payloadResults().some(item => !item.result)) { toast.add({ title: 'ข้อมูลยังไม่ครบ', description: 'ต้องมีผลของสมาชิกทุกคนก่อนส่งตรวจ', color: 'warning' }); return }
    busy.value = true
    try { await request(`/api/responses/${props.record.id}/submit-review`, { method: 'POST', body: { expectedVersion: version.value } }); toast.add({ title: 'ส่งให้อาจารย์หรือเจ้าหน้าที่ตรวจแล้ว', color: 'primary' }); emit('reload') } finally { busy.value = false }
  })
}

async function returnDraft() {
  await run({ allowed: reviewer.value && status.value === 'PENDING_REVIEW' && !busy.value, reason: 'ส่งกลับได้เฉพาะผู้ตรวจและสถานะรอตรวจ' }, async () => {
    if (reason.value.trim().length < 3) { toast.add({ title: 'กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร', color: 'warning' }); return }
    busy.value = true
    try { await request(`/api/responses/${props.record.id}/return`, { method: 'POST', body: { expectedVersion: version.value, reason: reason.value.trim() } }); toast.add({ title: 'ส่งกลับแก้ไขแล้ว', color: 'primary' }); emit('reload') } finally { busy.value = false }
  })
}

async function confirmAll() {
  await run({ allowed: reviewer.value && status.value === 'PENDING_REVIEW' && !busy.value, reason: 'ยืนยันได้เฉพาะผู้ตรวจและสถานะรอตรวจ' }, async () => {
    busy.value = true
    try { await request(`/api/responses/${props.record.id}/confirm`, { method: 'POST', body: { expectedVersion: version.value } }); toast.add({ title: 'ยืนยันผลทั้งชุดสำเร็จ', description: 'Placement ถูกสร้างแบบ atomic สำหรับผู้ที่ได้รับการตอบรับ', color: 'primary' }); confirmVisible.value = false; emit('reload') } finally { busy.value = false }
  })
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
    <div class="border-b border-slate-200 p-5 dark:border-slate-800"><h2 class="font-semibold">ผลตอบรับรายคน</h2><p class="mt-1 text-sm text-slate-500">ไฟล์อยู่ระดับชุดเอกสาร แต่ผลและผู้ยืนยันถูกเก็บแยกรายคน</p></div>
    <div class="overflow-x-auto"><table class="min-w-full text-sm"><thead class="bg-slate-50 dark:bg-slate-950"><tr><th class="px-4 py-3 text-left">นักศึกษา</th><th class="px-4 py-3 text-left">ผลตอบรับ</th></tr></thead><tbody class="divide-y divide-slate-200 dark:divide-slate-800"><tr v-for="member in members" :key="member.batchMemberId"><td class="px-4 py-3"><p class="font-medium">{{ member.studentName || member.batchMemberId }}</p><p class="text-xs text-slate-500">{{ member.studentCode }}</p></td><td class="px-4 py-3"><select v-model="results[member.batchMemberId]" class="min-h-11 min-w-44 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700" :aria-label="`ผลตอบรับของ ${member.studentName || member.batchMemberId}`"><option value="">เลือกผล</option><option value="ACCEPTED">ACCEPTED — รับเข้าฝึกงาน</option><option value="DECLINED">DECLINED — ปฏิเสธ</option></select></td></tr></tbody></table></div>
    <div class="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
      <label v-if="reviewer && status === 'PENDING_REVIEW'" class="block"><span class="mb-1 block text-sm text-slate-500">เหตุผลเมื่อส่งกลับแก้ไข</span><textarea v-model="reason" rows="3" class="w-full rounded-lg border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label>
      <div class="flex flex-wrap justify-end gap-2"><UButton color="neutral" variant="outline" icon="i-lucide-save" label="บันทึกร่าง" @click="saveDraft" /><UButton v-if="canEdit" icon="i-lucide-send" label="ส่งตรวจ" @click="submitReview" /><UButton v-if="reviewer && status === 'PENDING_REVIEW'" color="warning" variant="outline" icon="i-lucide-undo-2" label="ส่งกลับแก้ไข" @click="returnDraft" /><UButton v-if="reviewer && status === 'PENDING_REVIEW'" icon="i-lucide-badge-check" label="ยืนยันทั้งชุด" @click="confirmVisible = true" /></div>
    </div>
    <div v-if="confirmVisible" class="border-t border-teal-200 bg-teal-50 p-5 dark:border-teal-900 dark:bg-teal-950"><p class="font-semibold">ยืนยันผลทั้งชุดหรือไม่?</p><p class="mt-1 text-sm text-slate-600 dark:text-slate-300">หากสมาชิกคนใด conflict ระบบจะ rollback ทั้งชุดและไม่สร้าง Placement บางส่วน</p><div class="mt-4 flex gap-2"><UButton color="neutral" variant="outline" label="กลับไปตรวจ" @click="confirmVisible = false" /><UButton label="ยืนยันผลทั้งหมด" @click="confirmAll" /></div></div>
  </section>
</template>

