<script setup lang="ts">
import { Download, FileText, Mail } from '@lucide/vue'
import { requestStatusMeta, returnReasonSchema, studentRequestStatusMeta } from '#shared/placement-requests'
import type { PlacementRequestPreview } from '#shared/placement-requests'

const props = defineProps<{ request: PlacementRequestPreview, staff?: boolean }>()
const emit = defineEmits<{ refresh: [] }>()
const { attach, review } = usePlacementRequestPreview()
const { showToast } = useToast()
const file = ref<File | null>(null)
const error = ref('')
const busy = ref(false)
const reason = ref('')
const inputKey = ref(0)
watch(() => [props.request.id, props.request.status], () => { file.value = null; error.value = ''; reason.value = ''; inputKey.value++ })
const canAttach = computed(() => props.staff ? props.request.status === 'submitted' : ['letter-issued', 'returned'].includes(props.request.status))
const visibleStatus = computed(() => props.staff ? requestStatusMeta[props.request.status] : studentRequestStatusMeta[props.request.status])
const outgoingDocumentState = computed(() => props.request.letter
  ? { label: 'จัดทำเรียบร้อยแล้ว', description: 'เอกสารพร้อมสำหรับดาวน์โหลด', tone: 'success' as const }
  : { label: 'รอรับเอกสาร', description: 'เจ้าหน้าที่กำลังจัดทำหนังสือขอความอนุเคราะห์', tone: 'warning' as const })
const responseDocumentState = computed(() => {
  if (props.request.signedDocument) {
    return props.request.status === 'confirmed'
      ? { label: 'ตรวจสอบเรียบร้อยแล้ว', description: 'เจ้าหน้าที่ตรวจสอบเอกสารและยืนยันสถานที่ฝึกงานแล้ว', tone: 'success' as const }
      : { label: 'ส่งหนังสือตอบรับแล้ว', description: 'รอเจ้าหน้าที่ตรวจสอบเอกสาร', tone: 'info' as const }
  }
  if (props.request.status === 'returned') return { label: 'กรุณาแก้ไขหนังสือตอบรับ', description: 'แก้ไขไฟล์ตามเหตุผลจากเจ้าหน้าที่แล้วส่งใหม่', tone: 'danger' as const }
  return { label: 'รอส่งหนังสือตอบรับ', description: 'ดาวน์โหลดหนังสือ นำส่งสถานประกอบการ แล้วแนบไฟล์ตอบรับกลับเข้าระบบ', tone: 'neutral' as const }
})
const pickFile = (event: Event) => { file.value = (event.target as HTMLInputElement).files?.[0] ?? null; error.value = '' }
const save = async () => {
  if (busy.value) return
  if (!file.value) { error.value = 'กรุณาเลือกไฟล์ PDF'; return }
  busy.value = true
  try {
    await attach(props.request.id, file.value, props.staff ? 'letter' : 'signedDocument')
    showToast({ title: props.staff ? 'ส่งหนังสือให้นักศึกษาแล้ว' : 'ส่งหนังสือตอบรับให้เจ้าหน้าที่แล้ว' })
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ' }
  finally { busy.value = false }
}
const finishReview = async (outcome: 'return' | 'confirm') => {
  if (busy.value) return
  if (outcome === 'return') {
    const result = returnReasonSchema.safeParse(reason.value)
    if (!result.success) { error.value = result.error.issues[0]?.message ?? ''; return }
  }
  busy.value = true
  try { await review(props.request.id, outcome, reason.value); showToast({ title: 'บันทึกผลตรวจแล้ว' }) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ' }
  finally { busy.value = false }
}
</script>

<template>
  <section class="space-y-4" aria-label="คำร้องและเอกสาร">
    <template v-if="!staff">
      <p v-if="request.returnReason" class="rounded-control bg-danger-soft p-3 text-sm text-danger">จุดที่ต้องแก้ไข: {{ request.returnReason }}</p>
      <UiAlert v-if="request.status === 'submitted'" tone="warning" title="รอรับเอกสาร">
        เจ้าหน้าที่กำลังจัดทำหนังสือขอความอนุเคราะห์ ปุ่มดาวน์โหลดและช่องส่งหนังสือตอบรับจะแสดงหลังเจ้าหน้าที่อัปโหลดไฟล์แล้ว
      </UiAlert>
      <UiButton v-if="request.status === 'submitted'" variant="secondary" @click="emit('refresh')">ตรวจสอบเอกสารอีกครั้ง</UiButton>
      <div class="grid gap-4 md:grid-cols-2">
        <article class="flex min-h-40 flex-col rounded-panel border border-divider bg-canvas p-5 pb-3">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-control bg-info-soft text-info"><FileText :size="20" aria-hidden="true" /></span>
              <div class="min-w-0">
                <h4 class="font-semibold text-ink">หนังสือขอความอนุเคราะห์</h4>
                <div class="mt-3"><UiBadge :tone="outgoingDocumentState.tone">{{ outgoingDocumentState.label }}</UiBadge></div>
              </div>
            </div>
            <div v-if="request.letter" class="flex shrink-0 flex-col items-end gap-1">
              <a :href="request.letter.dataUrl" :download="request.letter.name" class="inline-flex min-h-10 items-center gap-2 rounded-control border border-divider px-3 text-sm font-semibold text-ink hover:bg-surface"><Download :size="17" aria-hidden="true" />ดาวน์โหลดหนังสือ</a>
              <span class="text-right text-xs text-muted">รองรับไฟล์ PDF ขนาดไม่เกิน 5 MB</span>
            </div>
          </div>
          <p class="mt-4 flex-1 text-sm leading-6 text-muted">{{ outgoingDocumentState.description }}</p>
        </article>

        <article class="flex min-h-40 flex-col rounded-panel border border-divider bg-canvas p-5 pb-3">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-control bg-warning-soft text-warning"><Mail :size="20" aria-hidden="true" /></span>
              <div class="min-w-0">
                <h4 class="font-semibold text-ink">หนังสือตอบรับ</h4>
                <div class="mt-3"><UiBadge :tone="responseDocumentState.tone">{{ responseDocumentState.label }}</UiBadge></div>
              </div>
            </div>
            <div v-if="request.signedDocument" class="flex shrink-0 flex-col items-end gap-1">
              <a :href="request.signedDocument.dataUrl" :download="request.signedDocument.name" class="inline-flex min-h-10 items-center gap-2 rounded-control border border-divider px-3 text-sm font-semibold text-ink hover:bg-surface"><Download :size="17" aria-hidden="true" />ดาวน์โหลดหนังสือ</a>
              <span class="text-right text-xs text-muted">รองรับไฟล์ PDF ขนาดไม่เกิน 5 MB</span>
            </div>
          </div>
          <p class="mt-4 flex-1 text-sm leading-6 text-muted">{{ responseDocumentState.description }}</p>
          <form v-if="canAttach" class="mt-4 space-y-3" @submit.prevent="save">
            <label class="block text-sm font-semibold text-ink">
              แนบหนังสือตอบรับที่ได้รับจากสถานประกอบการ
              <input :key="inputKey" type="file" accept="application/pdf,.pdf" class="mt-2 block w-full min-w-0 rounded-control border border-divider p-3 text-sm" :disabled="busy" :aria-invalid="!!error" :aria-describedby="`pdf-help-${request.id}${error ? ` pdf-error-${request.id}` : ''}`" @change="pickFile">
            </label>
            <p :id="`pdf-help-${request.id}`" class="text-xs text-muted">รองรับไฟล์ PDF ขนาดไม่เกิน 5 MB · ช่องแนบตัวอย่างยังไม่ส่งไฟล์จริง</p>
            <UiButton type="submit" :loading="busy" :disabled="!file">ส่งหนังสือตอบรับให้เจ้าหน้าที่</UiButton>
          </form>
        </article>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-wrap items-center gap-3"><UiBadge :tone="visibleStatus.tone">{{ visibleStatus.label }}</UiBadge></div>
      <div class="flex flex-wrap gap-3">
        <a v-if="request.letter" :href="request.letter.dataUrl" :download="request.letter.name" class="inline-flex min-h-11 items-center rounded-control border border-divider px-4 text-sm font-semibold text-ink hover:bg-surface">ดาวน์โหลดหนังสือขอความอนุเคราะห์</a>
        <a v-if="request.signedDocument" :href="request.signedDocument.dataUrl" :download="request.signedDocument.name" class="inline-flex min-h-11 items-center rounded-control border border-divider px-4 text-sm font-semibold text-ink hover:bg-surface">ดาวน์โหลดหนังสือตอบรับ</a>
      </div>
      <form v-if="canAttach" class="space-y-3" @submit.prevent="save">
        <label class="block text-sm font-semibold text-ink">
          แนบหนังสือขอความอนุเคราะห์
          <input :key="inputKey" type="file" accept="application/pdf,.pdf" class="mt-2 block w-full min-w-0 rounded-control border border-divider p-3 text-sm" :disabled="busy" :aria-invalid="!!error" :aria-describedby="`pdf-help-${request.id}${error ? ` pdf-error-${request.id}` : ''}`" @change="pickFile">
        </label>
        <p :id="`pdf-help-${request.id}`" class="text-xs text-muted">PDF ไม่เกิน 5 MB · ระบบตรวจชนิดไฟล์และเก็บประวัติเวอร์ชัน</p>
        <UiButton type="submit" :loading="busy" :disabled="!file">ส่งหนังสือให้นักศึกษา</UiButton>
      </form>
      <div v-if="request.status === 'signed-uploaded'" class="space-y-3">
        <UiTextarea v-model="reason" label="จุดที่ต้องแก้ไข (กรณีส่งกลับ)" :error="error" />
        <p class="text-xs text-muted">ตรวจหนังสือตอบรับก่อนยืนยัน ผลตรวจนี้จะยืนยันสถานที่ฝึกงานโดยไม่เปิดให้เพิ่มบริษัทใหม่</p>
        <div class="flex flex-wrap gap-2"><UiButton :loading="busy" @click="finishReview('confirm')">ยืนยันเอกสารถูกต้อง</UiButton><UiButton variant="secondary" :loading="busy" @click="finishReview('return')">ส่งกลับให้แก้ไข</UiButton></div>
      </div>
    </template>
    <p v-if="error" :id="`pdf-error-${request.id}`" role="alert" class="text-sm text-danger">{{ error }}</p>
  </section>
</template>
