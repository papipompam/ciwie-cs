<script setup lang="ts">
import { requestStatusMeta, returnReasonSchema } from '#shared/placement-requests'
import type { PlacementRequestPreview } from '#shared/placement-requests'

const props = defineProps<{ request: PlacementRequestPreview, staff?: boolean }>()
const { attach, review } = usePlacementRequestPreview()
const { showToast } = useToast()
const file = ref<File | null>(null)
const error = ref('')
const busy = ref(false)
const reason = ref('')
const inputKey = ref(0)
watch(() => [props.request.id, props.request.status], () => { file.value = null; error.value = ''; reason.value = ''; inputKey.value++ })
const canAttach = computed(() => props.staff ? props.request.status === 'submitted' : ['letter-issued', 'returned'].includes(props.request.status))
const pickFile = (event: Event) => { file.value = (event.target as HTMLInputElement).files?.[0] ?? null; error.value = '' }
const save = async () => {
  if (busy.value) return
  if (!file.value) { error.value = 'กรุณาเลือกไฟล์ PDF'; return }
  busy.value = true
  try {
    await attach(props.request.id, file.value, props.staff ? 'letter' : 'signedDocument')
    showToast({ title: 'บันทึกไฟล์ในต้นแบบแล้ว' })
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ' }
  finally { busy.value = false }
}
const finishReview = (outcome: 'return' | 'confirm') => {
  if (busy.value) return
  if (outcome === 'return') {
    const result = returnReasonSchema.safeParse(reason.value)
    if (!result.success) { error.value = result.error.issues[0]?.message ?? ''; return }
  }
  busy.value = true
  try { review(props.request.id, outcome, reason.value); showToast({ title: 'บันทึกผลตรวจในต้นแบบแล้ว' }) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ' }
  finally { busy.value = false }
}
</script>

<template>
  <section class="space-y-4" aria-label="คำร้องและเอกสาร">
    <UiBadge :tone="requestStatusMeta[request.status].tone">{{ requestStatusMeta[request.status].label }}</UiBadge>
    <p v-if="request.returnReason" class="rounded-control bg-danger-soft p-3 text-sm text-danger">จุดที่ต้องแก้ไข: {{ request.returnReason }}</p>
    <div class="flex flex-wrap gap-3">
      <a v-if="request.letter" :href="request.letter.dataUrl" :download="request.letter.name" class="inline-flex min-h-11 items-center rounded-control border border-divider px-4 text-sm font-semibold text-ink hover:bg-surface">ดาวน์โหลดหนังสือขอความอนุเคราะห์</a>
      <a v-if="request.signedDocument" :href="request.signedDocument.dataUrl" :download="request.signedDocument.name" class="inline-flex min-h-11 items-center rounded-control border border-divider px-4 text-sm font-semibold text-ink hover:bg-surface">ดาวน์โหลดหนังสือตอบรับ</a>
    </div>
    <form v-if="canAttach" class="space-y-3" @submit.prevent="save">
      <label class="block text-sm font-semibold text-ink">
        {{ staff ? 'แนบหนังสือขอความอนุเคราะห์' : 'อัปโหลดหนังสือตอบรับจากสถานประกอบการ' }}
        <input :key="inputKey" type="file" accept="application/pdf,.pdf" class="mt-2 block w-full min-w-0 rounded-control border border-divider p-3 text-sm" :disabled="busy" :aria-invalid="!!error" :aria-describedby="`pdf-help-${request.id}${error ? ` pdf-error-${request.id}` : ''}`" @change="pickFile">
      </label>
      <p :id="`pdf-help-${request.id}`" class="text-xs text-muted">PDF ไม่เกิน 5 MB · เก็บชั่วคราวในต้นแบบ ไม่ใช่การส่งเอกสารจริง</p>
      <UiButton type="submit" :loading="busy">{{ staff ? 'ส่งหนังสือให้นักศึกษา (ทดลอง)' : 'ส่งหนังสือตอบรับให้เจ้าหน้าที่ (ทดลอง)' }}</UiButton>
    </form>
    <div v-if="staff && request.status === 'signed-uploaded'" class="space-y-3">
      <UiTextarea v-model="reason" label="จุดที่ต้องแก้ไข (กรณีส่งกลับ)" :error="error" />
      <p class="text-xs text-muted">ตรวจหนังสือตอบรับก่อนยืนยัน ผลตรวจนี้จะยืนยันสถานที่ฝึกงานโดยไม่เปิดให้เพิ่มบริษัทใหม่</p>
      <div class="flex flex-wrap gap-2">
        <UiButton :loading="busy" @click="finishReview('confirm')">ยืนยันเอกสารถูกต้อง</UiButton>
        <UiButton variant="secondary" :loading="busy" @click="finishReview('return')">ส่งกลับให้แก้ไข</UiButton>
      </div>
    </div>
    <p v-if="error" :id="`pdf-error-${request.id}`" role="alert" class="text-sm text-danger">{{ error }}</p>
  </section>
</template>
