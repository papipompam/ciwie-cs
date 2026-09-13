<script setup lang="ts">
import { CalendarDays, Clock3 } from '@lucide/vue'
import type { SupervisionCompany, SupervisionGroup } from '~/composables/useSupervisionGroups'
import { reloadBrowser, requestAwareFetch } from '~/utils/requestAwareFetch'

interface ScheduleRow {
  id: string
  groupId: string
  groupName: string
  companyId: string
  companyName: string
  region: string
  province: string
  date: string
  period: 'เช้า' | 'บ่าย'
}

const props = defineProps<{
  groups: SupervisionGroup[]
  getGroupCompanies: (group: SupervisionGroup) => SupervisionCompany[]
  lecturers: Array<{ id: string, name: string }>
}>()
const { showToast } = useToast()
const confirmed = ref(false)
const scheduleRows = ref<ScheduleRow[]>([])
const expenseDrafts = reactive<Record<string, { distance: string }>>({})
const lecturerByGroup = reactive<Record<string, string>>({})
const editGroupId = ref<string | null>(null)
const savingEdit = ref(false)
const editError = ref('')
const editDialogOpen = computed({ get: () => editGroupId.value !== null, set: value => { if (!value) editGroupId.value = null } })
const editGroup = computed(() => props.groups.find(group => group.id === editGroupId.value) ?? null)
const lecturerOptions = computed(() => props.lecturers.map(item => ({ value: item.id, label: item.name })))
const periodOptions = [{ value: 'เช้า', label: 'ช่วงเช้า' }, { value: 'บ่าย', label: 'ช่วงบ่าย' }]
const dateOptions = ['2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18']
const dateLabel = (value: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
const rebuildRows = () => {
  const rows: ScheduleRow[] = []
  props.groups.forEach((group) => {
    props.getGroupCompanies(group).forEach((company, index) => rows.push({
      id: `${group.id}-${company.id}`,
      groupId: group.id,
      groupName: group.name,
      companyId: company.id,
      companyName: company.name,
      region: company.region,
      province: company.province,
      date: dateOptions[index % dateOptions.length]!,
      period: index % 2 ? 'บ่าย' : 'เช้า',
    }))
    expenseDrafts[group.id] ??= { distance: String(Math.max(20, props.getGroupCompanies(group).length * 45)) }
    lecturerByGroup[group.id] ??= group.lecturerIds[0] ?? ''
  })
  scheduleRows.value = rows
}
watch(() => props.groups.map(group => `${group.id}:${group.companyIds.join(',')}`).join('|'), rebuildRows, { immediate: true })
const updateRow = (row: ScheduleRow, field: 'date' | 'period', value: string) => { row[field] = value as never }
const rowsForGroup = (groupId: string) => scheduleRows.value.filter(row => row.groupId === groupId)
const groupDate = (groupId: string) => rowsForGroup(groupId)[0]?.date ?? dateOptions[0]
const openEdit = (groupId: string) => { editError.value = ''; editGroupId.value = groupId }
const saveEdit = async () => {
  if (!editGroup.value || savingEdit.value) return
  const rows = rowsForGroup(editGroup.value.id)
  if (rows.some(row => !row.date)) { editError.value = 'กรุณากำหนดวันที่ให้ครบทุกสถานประกอบการ'; return }
  if (!lecturerByGroup[editGroup.value.id]) { editError.value = 'กรุณาเลือกอาจารย์นิเทศประจำกลุ่มก่อนบันทึก'; return }
  savingEdit.value = true
  editError.value = ''
  try {
    const companies = props.getGroupCompanies(editGroup.value)
    for (const row of rows) {
      const company = companies.find(item => item.id === row.companyId)
      if (!company) continue
      await requestAwareFetch('/api/staff/supervision/appointments', {
        method: 'POST',
        body: { cycleId: editGroup.value.cycleId, round: editGroup.value.round, groupId: editGroup.value.id, companyId: company.id, studentIds: company.students.map(student => student.studentId), lecturerIds: lecturerByGroup[editGroup.value.id] ? [lecturerByGroup[editGroup.value.id]] : [], date: row.date, period: row.period === 'เช้า' ? 'morning' : 'afternoon', publish: true },
        reload: false,
      })
    }
    showToast({ title: 'บันทึกและเผยแพร่ตารางแล้ว', description: 'แจ้งเตือนอาจารย์และนักศึกษาที่เกี่ยวข้องแล้ว' })
    editGroupId.value = null
    reloadBrowser()
  }
  catch (cause) { editError.value = cause instanceof Error ? cause.message : 'บันทึกตารางไม่สำเร็จ' }
  finally { savingEdit.value = false }
}
const setGroupDate = (groupId: string, value: string) => { rowsForGroup(groupId).forEach(row => row.date = value) }
const totalCompanies = computed(() => props.groups.reduce((total, group) => total + props.getGroupCompanies(group).length, 0))
const totalStudents = computed(() => props.groups.reduce((total, group) => total + props.getGroupCompanies(group).reduce((count, company) => count + company.studentCount, 0), 0))
</script>

<template>
  <section v-if="groups.length" class="mt-6 space-y-4" aria-labelledby="schedule-planner-heading">
    <UiCard :padded="false">
      <div class="flex items-start gap-3 border-b border-divider p-5 sm:p-6"><span class="grid size-10 shrink-0 place-items-center rounded-control bg-warning-soft text-warning"><CalendarDays :size="20" aria-hidden="true" /></span><div><h3 id="schedule-planner-heading" class="text-lg font-bold text-ink">จัดตารางนิเทศ</h3><p class="mt-1 text-sm text-muted">{{ groups.length }} กลุ่ม · {{ totalCompanies }} สถานประกอบการ · {{ totalStudents }} นักศึกษา</p></div></div>
      <div class="hidden overflow-x-auto md:block"><table class="w-full min-w-[980px] border-collapse text-left text-sm"><caption class="sr-only">ตารางนิเทศแยกตามกลุ่ม</caption><thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th scope="col" class="w-44 px-5 py-3">กลุ่มนิเทศ</th><th scope="col" class="w-44 px-4 py-3">วันที่นิเทศ</th><th scope="col" class="px-4 py-3">กำหนดการนิเทศ</th><th scope="col" class="w-56 px-4 py-3">อาจารย์นิเทศ</th><th scope="col" class="w-32 px-5 py-3 text-right"><span class="sr-only">จัดการ</span></th></tr></thead><tbody class="divide-y divide-divider"><tr v-for="group in groups" :key="group.id" class="align-top hover:bg-surface/70"><td class="px-5 py-4"><p class="font-semibold text-ink">{{ group.name }}</p><p class="mt-1 text-xs text-muted">{{ group.id }}</p></td><td class="px-4 py-4"><label class="sr-only" :for="`${group.id}-date`">วันที่นิเทศ</label><input :id="`${group.id}-date`" :value="groupDate(group.id)" type="date" class="min-h-11 w-full rounded-control border border-divider bg-canvas px-3 text-sm text-ink" @input="setGroupDate(group.id, ($event.target as HTMLInputElement).value)"></td><td class="px-4 py-4"><p class="text-sm text-ink">เช้า 10:00–12:00 · {{ rowsForGroup(group.id).filter(row => row.period === 'เช้า').map(row => row.companyName).join(', ') || 'ยังไม่ได้กำหนด' }}</p><p class="mt-1.5 text-sm text-ink">บ่าย 13:00–15:00 · {{ rowsForGroup(group.id).filter(row => row.period === 'บ่าย').map(row => row.companyName).join(', ') || 'ยังไม่ได้กำหนด' }}</p></td><td class="px-4 py-4"><UiSelect :model-value="lecturerByGroup[group.id] ?? ''" :options="lecturerOptions" label="อาจารย์นิเทศ" :label-visible="false" @update:model-value="lecturerByGroup[group.id] = $event; confirmed = false" /></td><td class="px-5 py-4 text-right"><UiButton size="sm" variant="secondary" @click="openEdit(group.id)">แก้ไข</UiButton></td></tr></tbody></table></div>
      <div class="divide-y divide-divider md:hidden"><article v-for="group in groups" :key="group.id" class="p-5"><div class="flex items-start justify-between gap-3"><div><h5 class="font-semibold text-ink">{{ group.name }}</h5><p class="mt-1 text-xs text-muted">{{ group.id }}</p></div><UiButton size="sm" variant="secondary" @click="openEdit(group.id)">แก้ไข</UiButton></div><label class="mt-4 block text-sm font-semibold text-ink">วันที่นิเทศ<input :value="groupDate(group.id)" type="date" class="mt-1.5 min-h-11 w-full rounded-control border border-divider bg-canvas px-3 text-sm font-normal text-ink" @input="setGroupDate(group.id, ($event.target as HTMLInputElement).value)"></label><p class="mt-4 text-sm text-ink">เช้า 10:00–12:00 · {{ rowsForGroup(group.id).filter(row => row.period === 'เช้า').map(row => row.companyName).join(', ') || 'ยังไม่ได้กำหนด' }}</p><p class="mt-2 text-sm text-ink">บ่าย 13:00–15:00 · {{ rowsForGroup(group.id).filter(row => row.period === 'บ่าย').map(row => row.companyName).join(', ') || 'ยังไม่ได้กำหนด' }}</p><div class="mt-4"><UiSelect :model-value="lecturerByGroup[group.id] ?? ''" :options="lecturerOptions" label="อาจารย์นิเทศ" @update:model-value="lecturerByGroup[group.id] = $event; confirmed = false" /></div></article></div>
      <div class="hidden">
        <article v-for="group in groups" :key="group.id" class="rounded-panel border border-divider p-4 sm:p-5">
          <div class="flex flex-wrap items-start justify-between gap-3"><div><h5 class="font-bold text-ink">{{ group.name }}</h5><p class="mt-1 text-sm text-muted">จังหวัด: {{ [...new Set(props.getGroupCompanies(group).map(company => company.province))].join(', ') || 'ยังไม่ระบุ' }}</p></div><UiButton size="sm" variant="secondary" @click="showToast({ title: `แก้ไข${group.name} (เดโม่)`, description: 'แก้ไขลำดับบริษัทได้จากตัวเลือกช่วงเวลา' })">แก้ไขกลุ่ม</UiButton></div>
          <div class="mt-4 grid gap-4 sm:grid-cols-2"><div><p class="text-sm font-semibold text-ink">ช่วงเช้า</p><p class="mt-1 text-xs text-muted">10:00–12:00</p><ul class="mt-2 space-y-1.5 text-sm"><li v-for="row in rowsForGroup(group.id).filter(item => item.period === 'เช้า')" :key="row.id" class="rounded-control bg-surface px-3 py-2 text-ink">{{ row.companyName }} <span class="text-xs text-muted">· นักศึกษา {{ props.getGroupCompanies(group).find(company => company.name === row.companyName)?.studentCount ?? 0 }} คน</span></li><li v-if="!rowsForGroup(group.id).some(item => item.period === 'เช้า')" class="text-sm text-muted">ยังไม่ได้กำหนด</li></ul></div><div><p class="text-sm font-semibold text-ink">ช่วงบ่าย</p><p class="mt-1 text-xs text-muted">13:00–15:00</p><ul class="mt-2 space-y-1.5 text-sm"><li v-for="row in rowsForGroup(group.id).filter(item => item.period === 'บ่าย')" :key="row.id" class="rounded-control bg-surface px-3 py-2 text-ink">{{ row.companyName }} <span class="text-xs text-muted">· นักศึกษา {{ props.getGroupCompanies(group).find(company => company.name === row.companyName)?.studentCount ?? 0 }} คน</span></li><li v-if="!rowsForGroup(group.id).some(item => item.period === 'บ่าย')" class="text-sm text-muted">ยังไม่ได้กำหนด</li></ul></div></div>
          <p class="mt-4 border-t border-divider pt-3 text-sm text-muted">ระยะทางโดยประมาณ: <strong class="text-ink">{{ expenseDrafts[group.id]?.distance ?? 0 }} กม.</strong></p>
          <div class="mt-4 grid gap-4 border-t border-divider pt-4 sm:grid-cols-2"><div><UiSelect :model-value="lecturerByGroup[group.id] ?? ''" :options="lecturerOptions" label="อาจารย์นิเทศ" @update:model-value="lecturerByGroup[group.id] = $event; confirmed = false" /></div><label class="block text-sm font-semibold text-ink">วันที่นิเทศ<input :value="groupDate(group.id)" type="date" class="mt-1.5 min-h-11 w-full rounded-control border border-divider bg-canvas px-3 text-sm font-normal text-ink" @input="setGroupDate(group.id, ($event.target as HTMLInputElement).value)"></label></div>
        </article>
      </div>
    </UiCard>
    <UiCard :padded="false" class="hidden">
      <div class="border-b border-divider p-5 sm:p-6"><h4 class="font-bold text-ink">ตารางนิเทศรายวัน</h4><p class="mt-1 text-sm text-muted">แก้ไขอาจารย์ วัน และช่วงเวลาได้จากตารางนี้</p></div>
      <div class="hidden overflow-x-auto md:block"><table class="w-full min-w-[980px] border-collapse text-left text-sm"><caption class="sr-only">ตารางนิเทศแยกตามวันและช่วงเวลา</caption><thead class="bg-surface text-xs font-semibold text-muted"><tr><th class="px-5 py-3">วัน</th><th class="px-4 py-3">ช่วงเวลา</th><th class="px-4 py-3">สถานประกอบการ</th><th class="px-4 py-3">พื้นที่</th><th class="px-4 py-3">กลุ่ม</th><th class="w-56 px-4 py-3">อาจารย์นิเทศ</th></tr></thead><tbody class="divide-y divide-divider"><tr v-for="row in scheduleRows" :key="row.id"><td class="px-5 py-3"><select :value="row.date" class="min-h-9 rounded-control border border-divider bg-canvas px-2 text-sm" @change="updateRow(row, 'date', ($event.target as HTMLSelectElement).value)"><option v-for="date in dateOptions" :key="date" :value="date">{{ dateLabel(date) }}</option></select></td><td class="px-4 py-3"><select :value="row.period" class="min-h-9 rounded-control border border-divider bg-canvas px-2 text-sm" @change="updateRow(row, 'period', ($event.target as HTMLSelectElement).value)"><option v-for="option in periodOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></td><td class="px-4 py-3 font-semibold text-ink">{{ row.companyName }}</td><td class="px-4 py-3"><p class="text-ink">{{ row.province }}</p><p class="mt-0.5 text-xs text-muted">{{ row.region }}</p></td><td class="px-4 py-3 text-muted">{{ row.groupName }}</td><td class="px-4 py-3"><UiSelect :model-value="lecturerByGroup[row.groupId] ?? ''" :options="lecturerOptions" label="อาจารย์นิเทศ" :label-visible="false" @update:model-value="lecturerByGroup[row.groupId] = $event" /></td></tr></tbody></table></div>
      <div class="divide-y divide-divider md:hidden"><article v-for="row in scheduleRows" :key="row.id" class="space-y-3 p-5"><div class="flex items-start justify-between gap-3"><div><h5 class="font-semibold text-ink">{{ row.companyName }}</h5><p class="mt-1 text-xs text-muted">{{ row.region }} · {{ row.province }} · {{ row.groupName }}</p></div><UiBadge tone="info"><Clock3 :size="14" class="mr-1 inline" />{{ row.period }}</UiBadge></div><div class="grid grid-cols-2 gap-3"><label class="text-xs font-medium text-muted">วัน<select :value="row.date" class="mt-1 min-h-9 w-full rounded-control border border-divider bg-canvas px-2 text-sm text-ink" @change="updateRow(row, 'date', ($event.target as HTMLSelectElement).value)"><option v-for="date in dateOptions" :key="date" :value="date">{{ dateLabel(date) }}</option></select></label><label class="text-xs font-medium text-muted">ช่วงเวลา<select :value="row.period" class="mt-1 min-h-9 w-full rounded-control border border-divider bg-canvas px-2 text-sm text-ink" @change="updateRow(row, 'period', ($event.target as HTMLSelectElement).value)"><option v-for="option in periodOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label></div></article></div>
    </UiCard>
    <UiDialog v-model:open="editDialogOpen" size="lg" :title="editGroup ? `แก้ไข ${editGroup.name}` : 'แก้ไขตารางนิเทศ'" description="กำหนดวัน เวลา และอาจารย์นิเทศของกลุ่ม">
      <div v-if="editGroup" class="space-y-4">
        <div class="rounded-control bg-surface p-3 text-sm text-muted">{{ editGroup.id }} · {{ props.getGroupCompanies(editGroup).length }} สถานประกอบการ</div>
        <div v-for="row in rowsForGroup(editGroup.id)" :key="row.id" class="rounded-control border border-divider p-3">
          <p class="text-sm font-semibold text-ink">{{ row.companyName }}</p>
          <div class="mt-3 grid grid-cols-2 gap-3"><label class="block text-sm font-semibold text-ink">วันที่<input :value="row.date" type="date" class="mt-1.5 min-h-11 w-full rounded-control border border-divider bg-canvas px-3 text-sm font-normal text-ink" @input="updateRow(row, 'date', ($event.target as HTMLInputElement).value)"></label><UiSelect :model-value="row.period" :options="periodOptions" label="ช่วงเวลา" @update:model-value="updateRow(row, 'period', $event)" /></div>
        </div>
        <p v-if="editError" role="alert" class="text-sm font-medium text-danger">{{ editError }}</p>
      </div>
      <template #cancel><UiButton variant="ghost">ปิด</UiButton></template>
      <template #confirm><UiButton :loading="savingEdit" :disabled="!editGroup" @click="saveEdit">บันทึกและเผยแพร่ตาราง</UiButton></template>
    </UiDialog>
  </section>
</template>
