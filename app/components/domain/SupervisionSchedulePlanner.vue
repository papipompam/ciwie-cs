<script setup lang="ts">
import { Bell, CalendarDays, CheckCircle2, Clock3, Fuel, Save, Sparkles } from '@lucide/vue'
import type { SupervisionCompany, SupervisionGroup } from '~/composables/useSupervisionGroups'

interface ScheduleRow {
  id: string
  groupId: string
  groupName: string
  companyName: string
  region: string
  province: string
  date: string
  period: 'เช้า' | 'บ่าย'
}

interface ExpenseDraft { distance: string, lecturers: string, rooms: string, nights: string }

const props = defineProps<{
  groups: SupervisionGroup[]
  getGroupCompanies: (group: SupervisionGroup) => SupervisionCompany[]
  lecturers: Array<{ id: string, name: string }>
}>()
const { showToast } = useToast()
const confirmed = ref(false)
const scheduleRows = ref<ScheduleRow[]>([])
const expenseDrafts = reactive<Record<string, ExpenseDraft>>({})
const lecturerByGroup = reactive<Record<string, string>>({})
const lecturerOptions = computed(() => [{ value: '', label: 'ยังไม่กำหนดอาจารย์' }, ...props.lecturers.map(item => ({ value: item.id, label: item.name }))])
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
      companyName: company.name,
      region: company.region,
      province: company.province,
      date: dateOptions[index % dateOptions.length]!,
      period: index % 2 ? 'บ่าย' : 'เช้า',
    }))
    expenseDrafts[group.id] ??= { distance: String(Math.max(20, props.getGroupCompanies(group).length * 45)), lecturers: String(group.lecturerIds.length), rooms: '0', nights: '0' }
    lecturerByGroup[group.id] ??= group.lecturerIds[0] ?? ''
  })
  scheduleRows.value = rows
}
watch(() => props.groups.map(group => `${group.id}:${group.companyIds.join(',')}`).join('|'), rebuildRows, { immediate: true })
const updateRow = (row: ScheduleRow, field: 'date' | 'period', value: string) => { row[field] = value as never; confirmed.value = false }
const rowsForGroup = (groupId: string) => scheduleRows.value.filter(row => row.groupId === groupId)
const groupDate = (groupId: string) => rowsForGroup(groupId)[0]?.date ?? dateOptions[0]
const setGroupDate = (groupId: string, value: string) => { rowsForGroup(groupId).forEach(row => row.date = value); confirmed.value = false }
const totalCompanies = computed(() => props.groups.reduce((total, group) => total + props.getGroupCompanies(group).length, 0))
const totalStudents = computed(() => props.groups.reduce((total, group) => total + props.getGroupCompanies(group).reduce((count, company) => count + company.studentCount, 0), 0))
const suggestSchedule = () => {
  scheduleRows.value = scheduleRows.value.toSorted((a, b) => a.region.localeCompare(b.region, 'th') || a.province.localeCompare(b.province, 'th') || a.companyName.localeCompare(b.companyName, 'th')).map((row, index) => ({ ...row, date: dateOptions[Math.floor(index / 2) % dateOptions.length]!, period: index % 2 ? 'บ่าย' : 'เช้า' }))
  confirmed.value = false
  showToast({ title: 'AI เสนอการจัดตารางแล้ว', description: 'เรียงตามภาค จังหวัด และพื้นที่ใกล้เคียงเบื้องต้น กรุณาตรวจสอบและแก้ไขก่อนยืนยัน' })
}
const totalExpense = (groupId: string) => {
  const draft = expenseDrafts[groupId]
  if (!draft) return 0
  return Number(draft.distance) * 4 + Number(draft.lecturers) * 240 + Number(draft.rooms) * Number(draft.nights) * 800
}
const confirmSchedule = () => {
  confirmed.value = true
  showToast({ title: 'ยืนยันตารางนิเทศแล้ว (เดโม่)', description: 'ระบบจะแจ้งเตือนอาจารย์และนักศึกษาที่เกี่ยวข้องทันทีเมื่อเชื่อมต่อระบบจริง' })
}
</script>

<template>
  <section v-if="groups.length" class="mt-6 space-y-4" aria-labelledby="schedule-planner-heading">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-3"><span class="grid size-10 shrink-0 place-items-center rounded-control bg-primary text-ink"><CalendarDays :size="20" aria-hidden="true" /></span><div><h3 id="schedule-planner-heading" class="text-lg font-bold text-ink">จัดตารางนิเทศ</h3><p class="mt-1 text-sm leading-6 text-muted">AI ช่วยเสนอวันและช่วงเวลา เจ้าหน้าที่เป็นผู้ตรวจสอบและแก้ไขก่อนยืนยัน</p></div></div>
      <div class="flex flex-wrap gap-2"><UiButton variant="secondary" :icon="Sparkles" @click="suggestSchedule">ให้ AI เสนอวันและลำดับ</UiButton><UiButton :icon="CheckCircle2" :disabled="!scheduleRows.length" @click="confirmSchedule">ยืนยันตาราง</UiButton></div>
    </div>
    <UiAlert v-if="confirmed" tone="success" title="ยืนยันตารางแล้ว"><span class="inline-flex items-center gap-1"><Bell :size="15" aria-hidden="true" />พร้อมแจ้งเตือนอาจารย์และนักศึกษาที่เกี่ยวข้อง (เดโม่)</span></UiAlert>
    <UiCard>
      <div class="flex items-start gap-3 border-b border-divider pb-4"><span class="grid size-10 shrink-0 place-items-center rounded-control bg-primary-soft text-primary"><CalendarDays :size="19" aria-hidden="true" /></span><div><h4 class="font-bold text-ink">กลุ่มนิเทศที่จัดแล้ว</h4><p class="mt-1 text-sm text-muted">{{ groups.length }} กลุ่ม · {{ totalCompanies }} สถานประกอบการ · {{ totalStudents }} นักศึกษา</p></div></div>
      <div class="mt-4 space-y-4">
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
    <div class="flex items-center gap-2"><Fuel :size="19" class="text-muted" aria-hidden="true" /><h4 class="font-bold text-ink">ค่าใช้จ่ายการนิเทศแยกตามกลุ่ม</h4></div>
    <div class="grid gap-4 lg:grid-cols-2"><UiCard v-for="group in groups" :key="group.id"><div class="flex items-start justify-between gap-3"><div><h4 class="font-semibold text-ink">{{ group.name }}</h4><p class="mt-1 text-xs text-muted">{{ props.getGroupCompanies(group).length }} สถานประกอบการ · {{ group.lecturerIds.length }} อาจารย์</p></div><span class="text-lg font-bold tabular-nums text-ink">{{ totalExpense(group.id).toLocaleString('th-TH') }} บาท</span></div><div class="mt-4 grid gap-3 sm:grid-cols-2"><div><UiInput v-model="expenseDrafts[group.id]!.distance" type="number" label="ระยะทางรวม (กม.)" input-class="!min-h-9 text-xs" /></div><div><UiInput v-model="expenseDrafts[group.id]!.lecturers" type="number" label="จำนวนอาจารย์ (คน)" input-class="!min-h-9 text-xs" /></div><div><UiInput v-model="expenseDrafts[group.id]!.rooms" type="number" label="จำนวนห้องพัก" input-class="!min-h-9 text-xs" /></div><div><UiInput v-model="expenseDrafts[group.id]!.nights" type="number" label="จำนวนคืน" input-class="!min-h-9 text-xs" /></div></div><p class="mt-3 text-xs text-muted">เดินทาง {{ Number(expenseDrafts[group.id]!.distance) * 4 }} บาท · เบี้ยเลี้ยง {{ Number(expenseDrafts[group.id]!.lecturers) * 240 }} บาท · ที่พัก {{ Number(expenseDrafts[group.id]!.rooms) * Number(expenseDrafts[group.id]!.nights) * 800 }} บาท</p><div class="mt-4 flex justify-end border-t border-divider pt-3"><UiButton size="sm" variant="secondary" :icon="Save" @click="showToast({ title: `บันทึกค่าใช้จ่าย ${group.name} (เดโม่)`, description: 'ยังไม่บันทึกลงฐานข้อมูล' })">บันทึกค่าใช้จ่าย</UiButton></div></UiCard></div>
  </section>
</template>
