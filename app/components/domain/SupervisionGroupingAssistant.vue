<script setup lang="ts">
import { clusteringOptionsSchema } from '#shared/supervision-clustering'
import type { SupervisionRound } from '~/composables/useSupervisionGroups'

const props = defineProps<{ cycleId: string, round: SupervisionRound, disabled?: boolean }>()
interface GroupingSuggestion { groups: Array<{ name: string, companyIds: string[] }>, missingCompanyIds: string[] }
const { getUnassignedCompanies, persistSuggestedGroups } = useSupervisionGroups()
const { showToast } = useToast()
const companies = computed(() => getUnassignedCompanies(props.cycleId, props.round))
const capacity = ref('5')
const preview = ref<GroupingSuggestion | null>(null)
const error = ref('')
const busy = ref(false)
const signature = computed(() => JSON.stringify([props.cycleId, props.round, companies.value.map(company => [company.id, company.latitude, company.longitude]), capacity.value]))
watch(signature, () => {
  preview.value = null
  error.value = ''
})
const companyName = (id: string) => companies.value.find(company => company.id === id)?.name ?? id
const suggest = async () => {
  if (busy.value || props.disabled) return
  preview.value = null
  error.value = ''
  const parsed = clusteringOptionsSchema.safeParse({ maxDistanceKm: 100, maxCompanies: capacity.value })
  if (!parsed.success) { showToast({ title: 'ข้อมูลการจัดกลุ่มไม่ถูกต้อง', description: parsed.error.issues[0]?.message ?? 'กรุณาตรวจสอบจำนวนสถานประกอบการต่อกลุ่ม' }); return }
  busy.value = true
  try {
    const result = await $fetch<GroupingSuggestion>('/api/staff/supervision/groups/suggest', {
      method: 'POST',
      body: { cycleId: props.cycleId, round: props.round, ...parsed.data },
    })
    preview.value = result
  }
  catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'จัดกลุ่มไม่สำเร็จ กรุณาลองใหม่'
  }
  finally { busy.value = false }
}
const save = async () => {
  if (busy.value || props.disabled || !preview.value?.groups.length) return
  busy.value = true
  try {
    const saved = await persistSuggestedGroups(props.cycleId, props.round, preview.value.groups)
    preview.value = null
    showToast({ title: `บันทึก ${saved.length} กลุ่มแล้ว`, description: 'เพิ่มอาจารย์ผู้รับผิดชอบจากการ์ดของแต่ละกลุ่มได้เลย' })
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }
  finally { busy.value = false }
}
</script>

<template>
  <UiCard class="mb-6">
    <form novalidate class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="suggest">
      <div class="min-w-0 flex-1"><UiInput v-model="capacity" type="number" label="จำนวนสถานประกอบการสูงสุดต่อกลุ่ม" /></div>
      <UiButton type="submit" :loading="busy" :disabled="disabled || !companies.length">การจัดกลุ่ม</UiButton>
    </form>
    <p v-if="error" role="alert" class="mt-3 text-sm text-danger">{{ error }}</p>
    <div v-if="preview" class="mt-5 space-y-4" aria-live="polite">
      <UiAlert v-if="preview.missingCompanyIds.length" tone="warning" title="ยังจัดกลุ่มไม่ได้เนื่องจากไม่มีข้อมูลพื้นที่เพียงพอ">{{ preview.missingCompanyIds.map(companyName).join(' · ') }} — ระบุอย่างน้อยจังหวัด หรือจัดกลุ่มด้วยตนเอง</UiAlert>
      <UiAlert v-else-if="companies.some(company => company.latitude == null || company.longitude == null)" tone="info" title="บางกลุ่มจัดจากพื้นที่">บริษัทที่ไม่มีพิกัดถูกจัดตามภาค จังหวัด และอำเภอหรือเขตจากที่อยู่ ระยะทางและค่าเดินทางยังต้องตรวจสอบภายหลัง</UiAlert>
      <div class="grid gap-3 md:grid-cols-2">
        <section v-for="(group, index) in preview.groups" :key="index" class="rounded-control border border-divider p-4">
          <h4 class="font-semibold text-ink">{{ group.name }} · {{ group.companyIds.length }} แห่ง</h4>
          <ul class="mt-2 space-y-1 text-sm text-muted"><li v-for="id in group.companyIds" :key="id">{{ companyName(id) }}</li></ul>
          <p class="mt-4 border-t border-divider pt-3 text-xs text-muted">ระบบเสนอเฉพาะกลุ่มสถานประกอบการ เจ้าหน้าที่จะเพิ่มอาจารย์หลังบันทึกกลุ่ม</p>
        </section>
      </div>
      <UiButton v-if="preview.groups.length" :loading="busy" :disabled="disabled" @click="save">ยืนยันบันทึก {{ preview.groups.length }} กลุ่ม</UiButton>
    </div>
  </UiCard>
</template>
