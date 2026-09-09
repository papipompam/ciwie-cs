<script setup lang="ts">
import { Sparkles } from '@lucide/vue'
import { clusteringOptionsSchema } from '#shared/supervision-clustering'
import type { SupervisionRound } from '~/composables/useSupervisionGroups'

const props = defineProps<{ cycleId: string, round: SupervisionRound, disabled?: boolean }>()
interface GroupingSuggestion { groups: Array<{ name: string, companyIds: string[] }>, missingCompanyIds: string[] }
const { getUnassignedCompanies, persistSuggestedGroups } = useSupervisionGroups()
const { showToast } = useToast()
const companies = computed(() => getUnassignedCompanies(props.cycleId, props.round))
const distance = ref('100')
const capacity = ref('5')
const preview = ref<GroupingSuggestion | null>(null)
const error = ref('')
const fieldErrors = ref<Record<string, string>>({})
const busy = ref(false)
const signature = computed(() => JSON.stringify([props.cycleId, props.round, companies.value.map(company => [company.id, company.latitude, company.longitude]), distance.value, capacity.value]))
watch(signature, () => {
  preview.value = null
  error.value = ''
  fieldErrors.value = {}
})
const companyName = (id: string) => companies.value.find(company => company.id === id)?.name ?? id
const suggest = async () => {
  if (busy.value || props.disabled) return
  preview.value = null
  error.value = ''
  const parsed = clusteringOptionsSchema.safeParse({ maxDistanceKm: distance.value, maxCompanies: capacity.value })
  if (!parsed.success) { fieldErrors.value = Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])); return }
  busy.value = true
  try {
    preview.value = await $fetch<GroupingSuggestion>('/api/staff/supervision/groups/suggest', {
      method: 'POST',
      body: { cycleId: props.cycleId, round: props.round, ...parsed.data },
    })
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'จัดกลุ่มไม่สำเร็จ กรุณาลองใหม่' }
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
      <div class="min-w-0 flex-1"><UiInput v-model="distance" type="number" label="ระยะสูงสุดระหว่างสถานประกอบการ (กม.)" :error="fieldErrors.maxDistanceKm" /></div>
      <div class="min-w-0 flex-1"><UiInput v-model="capacity" type="number" label="จำนวนสถานประกอบการสูงสุดต่อกลุ่ม" :error="fieldErrors.maxCompanies" /></div>
      <UiButton type="submit" :icon="Sparkles" :loading="busy" :disabled="disabled || !companies.length">เสนอการจัดกลุ่ม</UiButton>
    </form>
    <p v-if="error" role="alert" class="mt-3 text-sm text-danger">{{ error }}</p>
    <div v-if="preview" class="mt-5 space-y-4" aria-live="polite">
      <UiAlert v-if="preview.missingCompanyIds.length" tone="warning" title="ยังจัดกลุ่มไม่ได้เนื่องจากไม่มีพิกัดที่ถูกต้อง">{{ preview.missingCompanyIds.map(companyName).join(' · ') }} — แก้ไขพิกัดในหน้าสถานประกอบการ หรือจัดกลุ่มด้วยตนเอง</UiAlert>
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
