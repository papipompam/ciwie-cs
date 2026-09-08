<script setup lang="ts">
import type { SupervisionGroup } from '~/composables/useSupervisionGroups'

const props = defineProps<{ group: SupervisionGroup }>()
const { groups, assignLecturers } = useSupervisionGroups()
const { people } = usePeopleDirectory()
const { showToast } = useToast()
const selected = ref([...props.group.lecturerIds])
const error = ref('')
const busy = ref(false)
watch(() => [props.group.id, ...props.group.lecturerIds], () => { selected.value = [...props.group.lecturerIds]; error.value = '' })
const candidates = computed(() => {
  const assigned = new Set(groups.value.filter(group => group.id !== props.group.id && group.cycleId === props.group.cycleId && group.round === props.group.round).flatMap(group => group.lecturerIds))
  return people.value.filter(person => person.type === 'lecturer' && person.recordStatus === 'active' && !['suspended', 'terminated'].includes(person.accountStatus) && !assigned.has(person.id))
})
const toggle = (id: string, checked: boolean | 'indeterminate') => {
  selected.value = checked === true ? [...new Set([...selected.value, id])] : selected.value.filter(item => item !== id)
  error.value = ''
}
const save = () => {
  if (busy.value) return
  busy.value = true
  try { assignLecturers(props.group.id, selected.value); showToast({ title: 'บันทึกอาจารย์ในกลุ่มแล้ว' }); error.value = '' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ' }
  finally { busy.value = false }
}
</script>

<template>
  <form class="mt-5 space-y-3 rounded-control border border-divider p-4" @submit.prevent="save">
    <h3 class="text-sm font-bold text-ink">เพิ่ม / แก้ไขอาจารย์ผู้รับผิดชอบ</h3>
    <p class="text-xs text-muted">อาจารย์อยู่ได้หนึ่งกลุ่มต่อรอบและครั้งที่นิเทศ</p>
    <div v-for="person in candidates" :key="person.id" class="flex items-center gap-3"><UiCheckbox :model-value="selected.includes(person.id)" :label="getPersonFullName(person)" @update:model-value="toggle(person.id, $event)" /><span class="text-sm text-ink">{{ getPersonFullName(person) }}</span></div>
    <p v-if="!candidates.length" class="text-sm text-muted">ไม่มีอาจารย์ที่พร้อมมอบหมาย กรุณาเพิ่มหรือเปิดใช้งานข้อมูลอาจารย์ก่อน</p>
    <p v-if="error" role="alert" class="text-sm text-danger">{{ error }}</p>
    <UiButton type="submit" :loading="busy">บันทึกอาจารย์</UiButton>
  </form>
</template>
