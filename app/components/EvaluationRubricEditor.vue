<script setup lang="ts">
interface RubricItem { id: string, label: string, description?: string, answerType?: 'SCORE' | 'TEXT' | 'BOOLEAN', maxScore?: number, required?: boolean, answer?: { score?: number, text?: string, booleanValue?: boolean } }
interface ApiAnswer { itemId: string, scoreValue?: number | string | null, textValue?: string | null, booleanValue?: boolean | null }
const props = defineProps<{ record: Record<string, unknown> }>()
const emit = defineEmits<{ reload: [] }>()
const { request } = useApiClient()
const toast = useToast()
const { run } = useUiAction()
const answers = reactive<Record<string, { score?: number, text?: string, booleanValue?: boolean }>>({})
const busy = ref(false)
const confirmVisible = ref(false)
const correctionReason = ref('')
const items = computed<RubricItem[]>(() => {
  const direct = Array.isArray(props.record.items) ? props.record.items as RubricItem[] : []
  const version = props.record.templateVersion as { items?: Array<Record<string, unknown>> } | undefined
  const source = direct.length ? direct : version?.items || []
  const apiAnswers = Array.isArray(props.record.answers) ? props.record.answers as ApiAnswer[] : []
  return source.map(item => {
    const raw = item as unknown as Record<string, unknown>
    const answer = apiAnswers.find(value => value.itemId === String(raw.id))
    return {
      id: String(raw.id), label: String(raw.label || raw.code || ''), answerType: raw.answerType as RubricItem['answerType'],
      maxScore: raw.maxScore == null ? undefined : Number(raw.maxScore), required: Boolean(raw.required),
      answer: answer ? { score: answer.scoreValue == null ? undefined : Number(answer.scoreValue), text: answer.textValue || undefined, booleanValue: answer.booleanValue ?? undefined } : undefined
    }
  })
})
const version = computed(() => Number(props.record.version ?? props.record.lockVersion ?? 0))
const capabilities = computed(() => props.record.capabilities && typeof props.record.capabilities === 'object' ? props.record.capabilities as Record<string, boolean> : null)
function can(action: 'edit' | 'submit' | 'correct') {
  if (capabilities.value) return Boolean(capabilities.value[action])
  return action === 'correct' ? String(props.record.status) === 'SUBMITTED' : String(props.record.status || 'DRAFT') === 'DRAFT'
}
const editable = computed(() => String(props.record.status || 'DRAFT') === 'DRAFT' && can('edit'))

watch(items, (value) => { for (const item of value) answers[item.id] = { score: item.answer?.score, text: item.answer?.text || '', booleanValue: item.answer?.booleanValue } }, { immediate: true })

function answerPayload() {
  return items.value.flatMap((item) => {
    const answer = answers[item.id]
    if (answer?.score === undefined && !answer?.text?.trim() && answer?.booleanValue === undefined) return []
    return [{ itemId: item.id, ...(answer.score !== undefined ? { score: Number(answer.score) } : {}), ...(answer.text?.trim() ? { text: answer.text.trim() } : {}), ...(answer.booleanValue !== undefined ? { booleanValue: answer.booleanValue } : {}) }]
  })
}

async function saveDraft() {
  if (!editable.value) { toast.add({ title: 'แก้ไขไม่ได้', description: 'ผลที่ส่งแล้วต้องใช้ Correction พร้อมเหตุผล', color: 'warning' }); return }
  if (String(props.record.subjectType) === 'ORGANIZATION') {
    busy.value = true
    try {
      await request('/api/organization-evaluations', { method: 'POST', body: { visitId: props.record.visitId, templateVersionId: props.record.templateVersionId, answers: answerPayload(), expectedVersion: version.value } })
      toast.add({ title: 'บันทึกร่างในระบบแล้ว', color: 'primary' }); emit('reload')
    } finally { busy.value = false }
    return
  }
  busy.value = true
  try {
    await request('/api/evaluations', { method: 'POST', body: { visitStudentId: props.record.visitStudentId, templateVersionId: props.record.templateVersionId, answers: answerPayload(), expectedVersion: version.value } })
    toast.add({ title: 'บันทึกร่างในระบบแล้ว', color: 'primary' }); emit('reload')
  } finally { busy.value = false }
}

async function submit() {
  await run({ allowed: can('submit') && !busy.value, reason: 'คุณไม่มีสิทธิ์ส่งผลนี้ หรือผลไม่ได้อยู่ในสถานะร่าง' }, async () => {
    const invalid = items.value.some(item => item.required && answers[item.id]?.score === undefined && !answers[item.id]?.text?.trim() && answers[item.id]?.booleanValue === undefined)
    if (invalid) { toast.add({ title: 'ตอบแบบประเมินยังไม่ครบ', description: 'กรุณาตอบหัวข้อที่จำเป็นทั้งหมด', color: 'warning' }); return }
    const payload = answerPayload()
    busy.value = true
    try {
      if (String(props.record.subjectType) === 'ORGANIZATION') {
        const saved = await request<{ id: string, version: number }>('/api/organization-evaluations', { method: 'POST', body: { visitId: props.record.visitId, templateVersionId: props.record.templateVersionId, answers: payload, expectedVersion: version.value } })
        await request(`/api/organization-evaluations/${saved.id}/submit`, { method: 'POST', body: { expectedVersion: saved.version } })
      } else await request(`/api/evaluations/${props.record.id}/submit`, { method: 'POST', body: { expectedVersion: version.value, answers: payload } })
      toast.add({ title: 'ส่งผลประเมินแล้ว', color: 'primary' }); confirmVisible.value = false; emit('reload')
    } finally { busy.value = false }
  })
}

async function correct() {
  await run({ allowed: can('correct') && !busy.value, reason: 'คุณไม่มีสิทธิ์ทำ Correction หรือผลยังไม่ได้ส่ง' }, async () => {
    if (correctionReason.value.trim().length < 3) {
      toast.add({ title: 'กรุณาระบุเหตุผล Correction', description: 'ระบุอย่างน้อย 3 ตัวอักษร', color: 'warning' })
      return
    }
    busy.value = true
    try {
      const base = String(props.record.subjectType) === 'ORGANIZATION' ? '/api/organization-evaluations' : '/api/evaluations'
      await request(`${base}/${String(props.record.id)}/correct`, { method: 'POST', body: { expectedVersion: version.value, reason: correctionReason.value.trim(), answers: answerPayload() } })
      toast.add({ title: 'บันทึก Correction แล้ว', color: 'primary' })
      correctionReason.value = ''
      emit('reload')
    } finally { busy.value = false }
  })
}

</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <div class="mb-5"><h2 class="font-semibold">แบบประเมิน {{ record.subjectType }}</h2><p class="mt-1 text-sm text-slate-500">Template version {{ record.templateVersion || record.templateVersionId || '—' }} · รอบ {{ record.round || '—' }}</p></div>
    <div v-if="!items.length" class="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">ไม่พบ rubric item ในข้อมูลที่ API ส่งกลับ</div>
    <div class="space-y-5"><fieldset v-for="(item, index) in items" :key="item.id" class="rounded-lg border border-slate-200 p-4 dark:border-slate-800"><legend class="px-1 font-medium">{{ index + 1 }}. {{ item.label }} <span v-if="item.required" class="text-rose-600">*</span></legend><p v-if="item.description" class="mb-3 text-sm text-slate-500">{{ item.description }}</p><label v-if="item.answerType === 'BOOLEAN'" class="flex min-h-11 items-center gap-3"><input v-model="answers[item.id]!.booleanValue" type="checkbox" class="size-5 accent-teal-600"><span>ใช่ / ผ่านเกณฑ์</span></label><label v-else-if="item.maxScore" class="block"><span class="mb-1 block text-sm">คะแนน (0–{{ item.maxScore }})</span><input v-model.number="answers[item.id]!.score" type="number" min="0" :max="item.maxScore" step="0.01" class="min-h-11 w-full max-w-48 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"></label><label v-if="item.answerType !== 'BOOLEAN'" class="mt-3 block"><span class="mb-1 block text-sm">ความคิดเห็น</span><textarea v-model="answers[item.id]!.text" rows="3" class="w-full rounded-lg border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label></fieldset></div>
    <div v-if="String(record.status || 'DRAFT') === 'DRAFT'" class="mt-6 flex flex-wrap justify-end gap-2"><UButton color="neutral" variant="outline" icon="i-lucide-save" label="บันทึกร่าง" @click="saveDraft" /><UButton icon="i-lucide-send" label="ตรวจสอบและส่ง" @click="confirmVisible = true" /></div>
    <div v-else class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950"><label class="block"><span class="mb-1 block text-sm font-medium">เหตุผล Correction</span><textarea v-model="correctionReason" rows="3" class="w-full rounded-lg border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" /></label><div class="mt-3 flex justify-end"><UButton icon="i-lucide-history" label="บันทึก Correction" @click="correct" /></div></div>
    <div v-if="confirmVisible" class="mt-4 rounded-lg bg-teal-50 p-4 dark:bg-teal-950"><p class="font-semibold">ยืนยันส่งผลประเมิน?</p><p class="mt-1 text-sm">หลังส่งแล้ว การแก้ไขต้องสร้าง Correction พร้อมเหตุผล</p><div class="mt-3 flex gap-2"><UButton color="neutral" variant="outline" label="กลับไปตรวจ" @click="confirmVisible = false" /><UButton label="ยืนยันส่งผล" @click="submit" /></div></div>
  </section>
</template>
