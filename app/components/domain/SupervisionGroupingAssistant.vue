<script setup lang="ts">
import { Sparkles, UserPlus } from '@lucide/vue'
import { clusterCompanies, clusteringOptionsSchema } from '~/utils/supervisionClustering'
import type { SupervisionRound } from '~/composables/useSupervisionGroups'

const props = defineProps<{ cycleId: string, round: SupervisionRound, disabled?: boolean }>()
const { groups, getUnassignedCompanies, createSuggestedGroups } = useSupervisionGroups()
const { people } = usePeopleDirectory()
const { showToast } = useToast()
const companies = computed(() => getUnassignedCompanies(props.cycleId, props.round))
const distance = ref('100')
const capacity = ref('5')
const preview = ref<ReturnType<typeof clusterCompanies> | null>(null)
const selectedLecturerIds = ref<string[][]>([])
const lecturerDialogOpen = ref(false)
const activeGroupIndex = ref<number | null>(null)
const stagedLecturerIds = ref<string[]>([])
const error = ref('')
const fieldErrors = ref<Record<string, string>>({})
const busy = ref(false)
const signature = computed(() => JSON.stringify([props.cycleId, props.round, companies.value.map(company => [company.id, company.latitude, company.longitude]), distance.value, capacity.value]))
watch(signature, () => {
  preview.value = null
  selectedLecturerIds.value = []
  lecturerDialogOpen.value = false
  activeGroupIndex.value = null
  error.value = ''
  fieldErrors.value = {}
})
const companyName = (id: string) => companies.value.find(company => company.id === id)?.name ?? id
const lecturerName = (id: string) => {
  const lecturer = people.value.find(person => person.type === 'lecturer' && person.id === id)
  return lecturer ? getPersonFullName(lecturer) : id
}
const assignedLecturerIds = computed(() => new Set(groups.value
  .filter(group => group.cycleId === props.cycleId && group.round === props.round)
  .flatMap(group => group.lecturerIds)))
const lecturerCandidates = computed(() => {
  const selectedInOtherGroups = new Set(selectedLecturerIds.value.flatMap((ids, index) => index === activeGroupIndex.value ? [] : ids))
  return people.value.filter(person => person.type === 'lecturer'
    && person.recordStatus === 'active'
    && !['suspended', 'terminated'].includes(person.accountStatus)
    && !assignedLecturerIds.value.has(person.id)
    && !selectedInOtherGroups.has(person.id))
})
const openLecturerDialog = (index: number) => {
  activeGroupIndex.value = index
  stagedLecturerIds.value = [...(selectedLecturerIds.value[index] ?? [])]
  lecturerDialogOpen.value = true
}
const toggleLecturer = (id: string, checked: boolean | 'indeterminate') => {
  stagedLecturerIds.value = checked === true
    ? [...new Set([...stagedLecturerIds.value, id])]
    : stagedLecturerIds.value.filter(item => item !== id)
}
const confirmLecturers = () => {
  if (activeGroupIndex.value === null) return
  selectedLecturerIds.value[activeGroupIndex.value] = [...stagedLecturerIds.value]
  lecturerDialogOpen.value = false
}
const suggest = () => {
  if (busy.value || props.disabled) return
  preview.value = null
  error.value = ''
  const parsed = clusteringOptionsSchema.safeParse({ maxDistanceKm: distance.value, maxCompanies: capacity.value })
  if (!parsed.success) { fieldErrors.value = Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message])); return }
  busy.value = true
  try {
    preview.value = clusterCompanies(companies.value, parsed.data)
    selectedLecturerIds.value = preview.value.groups.map(() => [])
  }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'จัดกลุ่มไม่สำเร็จ กรุณาลองใหม่' }
  finally { busy.value = false }
}
const save = () => {
  if (busy.value || props.disabled || !preview.value?.groups.length) return
  busy.value = true
  try {
    const saved = createSuggestedGroups(props.cycleId, props.round, preview.value.groups, selectedLecturerIds.value)
    preview.value = null
    showToast({ title: `บันทึก ${saved.length} กลุ่มแล้ว`, description: 'บันทึกกลุ่มสถานประกอบการและอาจารย์ผู้รับผิดชอบเรียบร้อยแล้ว' })
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
      <UiAlert v-if="preview.missingIds.length" tone="warning" title="ยังจัดกลุ่มไม่ได้เนื่องจากไม่มีพิกัดที่ถูกต้อง">{{ preview.missingIds.map(companyName).join(' · ') }} — แก้ไขพิกัดในหน้าสถานประกอบการ หรือจัดกลุ่มด้วยตนเอง</UiAlert>
      <div class="grid gap-3 md:grid-cols-2">
        <section v-for="(ids, index) in preview.groups" :key="index" class="rounded-control border border-divider p-4">
          <h4 class="font-semibold text-ink">กลุ่มเสนอ {{ index + 1 }} · {{ ids.length }} แห่ง</h4>
          <ul class="mt-2 space-y-1 text-sm text-muted"><li v-for="id in ids" :key="id">{{ companyName(id) }}</li></ul>
          <div class="mt-4 border-t border-divider pt-3">
            <p class="text-xs font-semibold text-muted">อาจารย์ผู้รับผิดชอบ</p>
            <ul v-if="selectedLecturerIds[index]?.length" class="mt-2 space-y-1 text-sm text-ink">
              <li v-for="id in selectedLecturerIds[index]" :key="id">{{ lecturerName(id) }}</li>
            </ul>
            <p v-else class="mt-2 text-xs text-muted">ยังไม่กำหนดอาจารย์</p>
            <UiButton class="mt-3" size="sm" variant="secondary" :icon="UserPlus" :disabled="disabled" @click="openLecturerDialog(index)">
              {{ selectedLecturerIds[index]?.length ? 'แก้ไขอาจารย์' : 'เพิ่มอาจารย์' }}
            </UiButton>
          </div>
        </section>
      </div>
      <UiButton v-if="preview.groups.length" :loading="busy" :disabled="disabled" @click="save">ยืนยันบันทึก {{ preview.groups.length }} กลุ่ม</UiButton>
    </div>

    <UiDialog
      v-model:open="lecturerDialogOpen"
      size="lg"
      :title="activeGroupIndex === null ? 'เพิ่มอาจารย์' : `เพิ่มอาจารย์ · กลุ่มเสนอ ${activeGroupIndex + 1}`"
      description="อาจารย์หนึ่งคนอยู่ได้เพียงหนึ่งกลุ่มต่อรอบและครั้งที่นิเทศ"
    >
      <fieldset>
        <legend class="text-sm font-semibold text-ink">เลือกอาจารย์ผู้รับผิดชอบ</legend>
        <div v-if="lecturerCandidates.length" class="mt-3 divide-y divide-divider overflow-hidden rounded-control border border-divider">
          <div v-for="lecturer in lecturerCandidates" :key="lecturer.id" class="flex min-h-14 items-center gap-3 p-4 hover:bg-surface">
            <UiCheckbox :model-value="stagedLecturerIds.includes(lecturer.id)" :label="`เลือก ${getPersonFullName(lecturer)}`" @update:model-value="toggleLecturer(lecturer.id, $event)" />
            <span class="min-w-0 flex-1 text-sm font-semibold text-ink">{{ getPersonFullName(lecturer) }}</span>
            <span class="shrink-0 text-xs text-muted">{{ lecturer.id }}</span>
          </div>
        </div>
        <p v-else class="mt-3 rounded-control bg-surface p-4 text-sm text-muted">ไม่มีอาจารย์ที่พร้อมมอบหมายในรอบและครั้งนี้</p>
      </fieldset>
      <template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template>
      <template #confirm><UiButton @click="confirmLecturers">บันทึกการเลือก</UiButton></template>
    </UiDialog>
  </UiCard>
</template>
