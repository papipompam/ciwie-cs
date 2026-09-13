<script setup lang="ts">
import { Pencil } from '@lucide/vue'
import { reloadBrowser, requestAwareFetch } from '~/utils/requestAwareFetch'
import type { SupervisionCompany } from '~/composables/useSupervisionGroups'

const route = useRoute()
const { cycleId, round } = useSupervisionContext()
const { groups, getAssignedLecturerIds, getCompanies, supervisionLecturers, loadPersistedGroups, persistSuggestedGroups, persistLecturers } = useSupervisionGroups()
const { appointments, loadPersistedAppointments } = useSupervisionAppointments()
const { saveExpense } = useSupervisionExpenses()
const { showToast } = useToast()
const backendState = ref<'loading' | 'ready' | 'error'>('loading')
const backendError = ref('')
const groupCount = ref('4')
const appliedGroupCount = ref(4)
const editingGroupIndex = ref<number | null>(null)
const savingEdit = ref(false)
const editError = ref('')
const draftLecturers = ref<string[]>([])
const draftDate = ref('')
const draftTime = ref('')
const draftDistance = ref('0')
const draftLecturerCount = ref('0')
const draftRooms = ref('0')
const draftNights = ref('0')
const lecturerAssignments = ref<Record<number, string[]>>({})
const groupSchedules = ref<Record<number, { date: string, time: string }>>({})
const companySchedules = ref<Record<string, { date: string, time: string }>>({})
const draftCompanySchedules = ref<Record<string, { date: string, time: string }>>({})
const expandedCompanyStudents = reactive<Record<string, boolean>>({})
const removedCompanies = ref<Record<string, boolean>>({})
const editSnapshot = ref<{ removed: Record<string, boolean>, lecturers: Record<number, string[]>, schedules: Record<number, { date: string, time: string }>, companySchedules: Record<string, { date: string, time: string }> } | null>(null)
const requestedGroups = computed(() => appliedGroupCount.value)
const variant = computed(() => route.query.variant === 'cards' ? 'cards' : 'table')

const companies = reactive<Array<{ id: string, name: string, area: string, address: string, students: number }>>([])
const lecturerOptions = reactive<Array<{ value: string, label: string }>>([])
const mapCompany = (company: SupervisionCompany) => ({ id: company.id, name: company.name, area: `${company.province} · ${company.region}`, address: company.address, students: company.studentCount })
const load = async () => {
  const currentCycleId = cycleId.value
  const currentRound = round.value
  if (!currentCycleId) {
    companies.splice(0)
    lecturerOptions.splice(0)
    backendError.value = ''
    backendState.value = 'ready'
    return
  }
  backendState.value = 'loading'
  backendError.value = ''
  try {
    await loadPersistedGroups(currentCycleId, currentRound)
    await loadPersistedAppointments(currentCycleId, currentRound)
    if (cycleId.value !== currentCycleId || round.value !== currentRound) return
    const actualCompanies = getCompanies(currentCycleId)
    companies.splice(0, companies.length, ...actualCompanies.map(mapCompany))
    lecturerOptions.splice(0, lecturerOptions.length, ...supervisionLecturers.value.map(item => ({ value: item.id, label: item.name })))
    appointments.value.filter(item => item.cycleId === cycleId.value && item.round === round.value).forEach((appointment) => {
      const company = actualCompanies.find(item => item.id === appointment.companyId)
      if (company) companySchedules.value[company.name] = { date: appointment.date, time: appointment.period === 'morning' ? '10:00–12:00' : '13:00–15:00' }
    })
    backendState.value = 'ready'
  }
  catch (cause) {
    if (cycleId.value !== currentCycleId || round.value !== currentRound) return
    backendState.value = 'error'
    backendError.value = typeof cause === 'object' && cause && 'statusCode' in cause && cause.statusCode === 401
      ? 'เซสชันเจ้าหน้าที่หมดอายุ กรุณาเข้าสู่ระบบใหม่'
      : cause instanceof Error ? cause.message : 'โหลดข้อมูลจาก Backend ไม่สำเร็จ'
  }
}
onMounted(() => { void load() })
watch([cycleId, round], () => { void load() })
const lecturerName = (id: string) => lecturerOptions.find(option => option.value === id)?.label ?? ''
const lecturerNames = (ids: string[]) => ids.map(id => lecturerName(id)).filter(Boolean).join(', ')
const provinceOf = (area: string) => area.split(' · ')[0] ?? area
const provinceGroupMap = computed(() => {
  const totals = new Map<string, number>()
  companies.forEach(company => totals.set(provinceOf(company.area), (totals.get(provinceOf(company.area)) ?? 0) + company.students))
  const groupTotals = Array.from({ length: requestedGroups.value }, () => 0)
  const assignments = new Map<string, number>()
  ;[...totals.entries()].sort((a, b) => b[1] - a[1]).forEach(([province, students]) => {
    const target = groupTotals.indexOf(Math.min(...groupTotals))
    assignments.set(province, target)
    groupTotals[target] = (groupTotals[target] ?? 0) + students
  })
  return assignments
})
const scheduleSlots = [
  { date: '15 มี.ค. 2569', time: '10:00–12:00' },
  { date: '16 มี.ค. 2569', time: '13:00–15:00' },
  { date: '17 มี.ค. 2569', time: '10:00–12:00' },
  { date: '18 มี.ค. 2569', time: '13:00–15:00' },
]
const timeOptions = [{ value: '10:00–12:00', label: '10:00–12:00' }, { value: '13:00–15:00', label: '13:00–15:00' }]
const travelCost = computed(() => Math.max(0, Number(draftDistance.value) || 0) * 4)
const allowanceCost = computed(() => Math.max(0, Number(draftLecturerCount.value) || 0) * 240)
const lodgingCost = computed(() => Math.max(0, Number(draftRooms.value) || 0) * Math.max(0, Number(draftNights.value) || 0) * 800)
const totalExpense = computed(() => travelCost.value + allowanceCost.value + lodgingCost.value)

const localSuggestedGroups = computed(() => Array.from({ length: requestedGroups.value }, (_, index) => {
  const members = companies.filter(company => !removedCompanies.value[company.name] && provinceGroupMap.value.get(provinceOf(company.area)) === index)
  const groupProvinces = [...new Set(members.map(member => provinceOf(member.area)))]
  return {
    name: `กลุ่มนิเทศ ${index + 1}`,
    companies: members,
    area: groupProvinces.length === 1 ? groupProvinces[0] : `${groupProvinces[0] ?? 'ยังไม่ระบุจังหวัด'} และอีก ${groupProvinces.length - 1} จังหวัด`,
    students: members.reduce((total, member) => total + member.students, 0),
    lecturers: lecturerAssignments.value[index] ?? [],
    schedule: groupSchedules.value[index] ?? scheduleSlots[index % scheduleSlots.length],
  }
}))
const suggestedGroups = computed(() => {
  if (!companies.length) return []
  const persisted = groups.value.filter(group => group.cycleId === cycleId.value && group.round === round.value).map(group => {
    const members = getCompanies(cycleId.value).filter(company => group.companyIds.includes(company.id)).map(company => mapCompany(company))
    return {
      name: group.name,
      companies: members,
      area: [...new Set(members.map(member => provinceOf(member.area)))].join(' และ ') || 'ยังไม่ระบุจังหวัด',
      students: members.reduce((total, member) => total + member.students, 0),
      lecturers: group.lecturerIds,
      schedule: groupSchedules.value[groups.value.indexOf(group)] ?? scheduleSlots[0],
    }
  })
  return persisted.length ? persisted : localSuggestedGroups.value
})
const activeCompanies = computed(() => companies.filter(company => !removedCompanies.value[company.name]))
const emptyGroupingState = computed(() => !cycleId.value
  ? { title: 'ยังไม่มีรอบสหกิจ', description: 'สร้างรอบสหกิจก่อน จึงจะจัดกลุ่มนิเทศได้' }
  : { title: 'ยังไม่มีข้อมูลสำหรับจัดกลุ่ม', description: 'เพิ่มนักศึกษาและยืนยันสถานประกอบการในรอบนี้ก่อน' })

const chooseVariant = (next: 'table' | 'cards') => navigateTo({ query: { variant: next === 'cards' ? 'cards' : undefined } })
const editingGroup = computed(() => editingGroupIndex.value === null ? null : suggestedGroups.value[editingGroupIndex.value] ?? null)
const unavailableLecturerIds = computed(() => {
  const assigned = getAssignedLecturerIds(cycleId.value, round.value)
  const current = groups.value.find(group => group.cycleId === cycleId.value && group.round === round.value && group.name === editingGroup.value?.name)
  current?.lecturerIds.forEach(id => assigned.delete(id))
  return assigned
})
const lecturerCandidates = computed(() => lecturerOptions.filter(lecturer => !unavailableLecturerIds.value.has(lecturer.value)))
const editingGroupCompanies = computed(() => {
  if (editingGroupIndex.value === null) return []
  const persistedGroup = groups.value.find(item => item.cycleId === cycleId.value && item.round === round.value && item.name === editingGroup.value?.name)
  if (persistedGroup) return getCompanies(cycleId.value).filter(company => persistedGroup.companyIds.includes(company.id)).map(mapCompany)
  return companies.filter(company => provinceGroupMap.value.get(provinceOf(company.area)) === editingGroupIndex.value)
})
const editDialogOpen = computed({
  get: () => editingGroupIndex.value !== null,
  set: value => {
    if (!value) {
      if (editSnapshot.value) {
        removedCompanies.value = editSnapshot.value.removed
        lecturerAssignments.value = editSnapshot.value.lecturers
        groupSchedules.value = editSnapshot.value.schedules
        companySchedules.value = editSnapshot.value.companySchedules
      }
      editSnapshot.value = null
      editingGroupIndex.value = null
    }
  },
})
const openEdit = (index: number) => {
  editingGroupIndex.value = index
  editError.value = ''
  const persistedGroup = groups.value.filter(item => item.cycleId === cycleId.value && item.round === round.value)[index]
  draftLecturers.value = [...(persistedGroup?.lecturerIds ?? lecturerAssignments.value[index] ?? [])]
  const schedule = groupSchedules.value[index] ?? scheduleSlots[index % scheduleSlots.length] ?? { date: '', time: '' }
  draftDate.value = schedule.date
  draftTime.value = schedule.time
  draftDistance.value = '0'
  draftLecturerCount.value = String(lecturerAssignments.value[index]?.length ?? 0)
  draftRooms.value = '0'
  draftNights.value = '0'
  draftCompanySchedules.value = { ...companySchedules.value }
  editingGroupCompanies.value.forEach(company => { draftCompanySchedules.value[company.name] ??= { date: '', time: '' } })
  editSnapshot.value = { removed: { ...removedCompanies.value }, lecturers: { ...lecturerAssignments.value }, schedules: { ...groupSchedules.value }, companySchedules: { ...companySchedules.value } }
}
const setCompanyIncluded = (companyName: string, included: boolean | 'indeterminate') => {
  removedCompanies.value = { ...removedCompanies.value, [companyName]: included !== true }
}
const studentsForCompany = (companyName: string) => getCompanies(cycleId.value).find(company => company.name === companyName)?.students ?? []
const toggleCompanyStudents = (companyName: string) => { expandedCompanyStudents[companyName] = !expandedCompanyStudents[companyName] }
const setCompanySchedule = (companyName: string, field: 'date' | 'time', value: string) => {
  const current = draftCompanySchedules.value[companyName] ?? { date: '', time: '' }
  const next = { ...current, [field]: value }
  draftCompanySchedules.value = { ...draftCompanySchedules.value, [companyName]: next }
  companySchedules.value = { ...companySchedules.value, [companyName]: next }
}
const setLecturerSelected = (lecturerId: string, selected: boolean | 'indeterminate') => {
  const next = selected === true
    ? [...new Set([...draftLecturers.value, lecturerId])]
    : draftLecturers.value.filter(id => id !== lecturerId)
  draftLecturers.value = next
  draftLecturerCount.value = String(next.length)
  if (editingGroupIndex.value !== null) lecturerAssignments.value = { ...lecturerAssignments.value, [editingGroupIndex.value]: next }
}
const saveEdit = async () => {
  if (savingEdit.value) return
  savingEdit.value = true
  editError.value = ''
  try {
  const incompleteSchedule = editingGroupCompanies.value.find(company => {
    const schedule = draftCompanySchedules.value[company.name]
    return !schedule?.date.match(/^\d{4}-\d{2}-\d{2}$/) || !schedule.time
  })
  if (incompleteSchedule) throw new Error(`กรุณากำหนดวันที่และช่วงเวลาให้ ${incompleteSchedule.name}`)
  if (editingGroupIndex.value !== null && draftLecturers.value.length) lecturerAssignments.value = { ...lecturerAssignments.value, [editingGroupIndex.value]: [...draftLecturers.value] }
  if (editingGroupIndex.value !== null && draftDate.value && draftTime.value) groupSchedules.value = { ...groupSchedules.value, [editingGroupIndex.value]: { date: draftDate.value, time: draftTime.value } }
  if (editingGroupIndex.value !== null) {
    const persistedGroups = groups.value.filter(item => item.cycleId === cycleId.value && item.round === round.value)
    const group = persistedGroups.find(item => item.name === editingGroup.value?.name) ?? persistedGroups[editingGroupIndex.value]
    if (!group) throw new Error('ยังไม่มีกลุ่มในระบบ กรุณากดจัดกลุ่มก่อน')
    if (draftLecturers.value.length) await persistLecturers(group.id, draftLecturers.value, false)
    if (draftLecturers.value.length) {
      try {
        await saveExpense(group.id, {
          fuel: Math.max(0, Number(draftDistance.value) || 0) * 4,
          roomRate: 800,
          nights: Math.max(0, Number(draftNights.value) || 0),
          allowanceRate: 240,
          allowanceDays: 1,
          roomCapacity: 2,
        }, false)
      }
      catch { showToast({ title: 'บันทึกตารางแล้ว แต่ยังบันทึกงบประมาณไม่ได้', description: 'ตรวจสอบข้อมูลค่าใช้จ่ายในหน้าสรุปงบประมาณอีกครั้ง' }) }
    }
    if (group && draftLecturers.value.length) {
      const realCompanies = getCompanies(cycleId.value)
      for (const company of editingGroupCompanies.value) {
        const schedule = draftCompanySchedules.value[company.name]
        const realCompany = realCompanies.find(item => item.name === company.name)
        if (!realCompany || !group.companyIds.includes(realCompany.id) || !schedule?.date.match(/^\d{4}-\d{2}-\d{2}$/) || !schedule.time) continue
        await requestAwareFetch('/api/staff/supervision/appointments', {
          method: 'POST',
          body: { cycleId: cycleId.value, round: round.value, groupId: group.id, companyId: realCompany.id, studentIds: realCompany.students.map(student => student.studentId), lecturerIds: draftLecturers.value, date: schedule.date, period: schedule.time.startsWith('10:') ? 'morning' : 'afternoon', publish: true },
          reload: false,
        })
      }
    }
  }
  editSnapshot.value = null
  editingGroupIndex.value = null
  showToast({ title: 'บันทึกข้อมูลกลุ่มแล้ว', description: 'อาจารย์นิเทศถูกบันทึกลงระบบเรียบร้อย' })
  reloadBrowser()
  }
  catch (cause) {
    const statusMessage = typeof cause === 'object' && cause && 'statusMessage' in cause ? cause.statusMessage : ''
    editError.value = statusMessage === 'LECTURER_NOT_AVAILABLE'
      ? 'อาจารย์บางคนอยู่ในกลุ่มอื่น หรือไม่พร้อมใช้งานแล้ว กรุณาเปิดรายการใหม่และเลือกรายชื่ออีกครั้ง'
      : cause instanceof Error ? cause.message : 'บันทึกการเปลี่ยนแปลงไม่สำเร็จ'
  }
  finally { savingEdit.value = false }
}
const cancelEdit = () => {
  if (editSnapshot.value) {
    removedCompanies.value = editSnapshot.value.removed
    lecturerAssignments.value = editSnapshot.value.lecturers
    groupSchedules.value = editSnapshot.value.schedules
    companySchedules.value = editSnapshot.value.companySchedules
  }
  editSnapshot.value = null
  editingGroupIndex.value = null
}
const runGrouping = async () => {
  if (!cycleId.value || !companies.length) return
  const requested = Math.min(10, Math.max(1, Number(groupCount.value) || 1))
  try {
    const result = await $fetch<{ groups: Array<{ name: string, companyIds: string[] }> }>('/api/staff/supervision/groups/suggest', { method: 'POST', body: { cycleId: cycleId.value, round: round.value, maxDistanceKm: 100, maxCompanies: Math.max(1, Math.ceil(companies.length / requested)) } })
    if (result.groups.length) await persistSuggestedGroups(cycleId.value, round.value, result.groups)
    appliedGroupCount.value = requested
    backendState.value = 'ready'
  }
  catch (cause) {
    backendState.value = 'error'
    backendError.value = cause instanceof Error ? cause.message : 'จัดกลุ่มไม่สำเร็จ กรุณาลองใหม่'
  }
}
</script>

<template>
  <div class="pb-20">
    <UiAlert v-if="backendState === 'error'" class="mb-4" tone="danger" title="เชื่อมต่อข้อมูลไม่สำเร็จ">{{ backendError }}</UiAlert>
    <UiAlert v-else-if="backendState === 'loading'" class="mb-4" tone="info" title="กำลังโหลดข้อมูล">กำลังโหลดกลุ่ม สถานประกอบการ และรายชื่ออาจารย์จากระบบ</UiAlert>
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><p class="text-sm font-semibold text-warning">การจัดกลุ่มนิเทศ</p><h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">จัดกลุ่มนิเทศ</h2><p class="mt-1 text-sm text-muted">เจ้าหน้าที่กำหนดจำนวนกลุ่ม แล้วตรวจสอบผลที่ระบบเสนอ</p></div>
    </div>

    <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h3 class="text-lg font-bold text-ink">จัดกลุ่มการนิเทศ</h3><p class="mt-1 text-sm text-muted">{{ suggestedGroups.length }} กลุ่ม · {{ activeCompanies.length }} สถานประกอบการ · {{ activeCompanies.reduce((total, company) => total + company.students, 0) }} นักศึกษา</p></div>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end"><div class="w-full sm:w-56"><UiInput v-model="groupCount" type="number" label="จำนวนกลุ่ม" /></div><UiButton class="!border-[#F5B32B] !bg-[#F5B32B] hover:!border-[#e0a323] hover:!bg-[#e0a323]" variant="secondary" :disabled="backendState !== 'ready' || !companies.length" @click="runGrouping">จัดกลุ่ม</UiButton></div>
    </div>

    <UiCard v-if="!suggestedGroups.length" class="mt-4">
      <AppEmptyState :title="emptyGroupingState.title" :description="emptyGroupingState.description" />
    </UiCard>
    <UiCard v-else-if="variant === 'table'" class="mt-4" :padded="false">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-sm">
          <caption class="sr-only">ผลจัดกลุ่มนิเทศ</caption>
          <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th class="px-6 py-3">กลุ่มนิเทศ</th><th class="px-4 py-3">พื้นที่หลัก</th><th class="px-4 py-3">สถานประกอบการ</th><th class="px-4 py-3">อาจารย์นิเทศ</th><th class="px-4 py-3 text-right">นักศึกษา</th><th class="w-28 px-4 py-3"><span class="sr-only">แก้ไข</span></th></tr></thead>
          <tbody class="divide-y divide-divider"><tr v-for="(group, index) in suggestedGroups" :key="group.name"><td class="px-6 py-4 font-semibold text-ink">{{ group.name }}</td><td class="px-4 py-4 text-ink">{{ group.area }}</td><td class="px-4 py-4"><p v-for="company in group.companies" :key="company.name" class="mt-1 first:mt-0 text-ink">{{ company.name }}</p></td><td class="px-4 py-4 text-sm text-primary">{{ group.lecturers.length ? lecturerNames(group.lecturers) : 'ยังไม่ได้เลือก' }}</td><td class="px-4 py-4 text-right font-semibold text-ink">{{ group.students }} คน</td><td class="px-4 py-4 text-right"><UiButton class="!border-[#F5B32B] !bg-[#F5B32B] hover:!border-[#e0a323] hover:!bg-[#e0a323]" size="sm" variant="secondary" :icon="Pencil" @click="openEdit(index)">แก้ไข</UiButton></td></tr></tbody>
        </table>
      </div>
    </UiCard>

    <div v-else class="mt-4 grid gap-4 lg:grid-cols-2">
      <UiCard v-for="(group, index) in suggestedGroups" :key="group.name">
        <div class="flex items-start justify-between gap-3"><div><h4 class="font-bold text-ink">{{ group.name }}</h4><p class="mt-1 text-sm text-muted">{{ group.area }}</p></div><UiBadge tone="info">{{ group.students }} คน</UiBadge></div>
        <ul class="mt-4 space-y-2 border-t border-divider pt-4 text-sm text-ink"><li v-for="company in group.companies" :key="company.name" class="flex justify-between gap-3"><span>{{ company.name }}</span><span class="shrink-0 text-muted">{{ company.students }} คน</span></li></ul>
        <p v-if="group.lecturers.length" class="mt-4 text-sm text-primary">อาจารย์นิเทศ: {{ lecturerNames(group.lecturers) }}</p><div class="mt-4 flex justify-end"><UiButton class="!border-[#F5B32B] !bg-[#F5B32B] hover:!border-[#e0a323] hover:!bg-[#e0a323]" size="sm" variant="secondary" :icon="Pencil" @click="openEdit(index)">แก้ไขกลุ่ม</UiButton></div>
      </UiCard>
    </div>

    <UiDialog v-model:open="editDialogOpen" :close-on-confirm="false" size="lg" content-class="bg-[#E5E7E9]" :title="`แก้ไข ${editingGroup?.name ?? ''}`">
      <div v-if="editingGroup" class="space-y-4"><div class="rounded-control bg-surface p-3 text-sm text-muted">{{ editingGroup.area }} · กำหนดวันและช่วงเวลานิเทศรายสถานประกอบการ</div><div><p class="mb-2 text-sm font-semibold text-ink">อาจารย์นิเทศ (เลือกได้หลายคน)</p><p class="mb-2 text-xs text-muted">แสดงเฉพาะอาจารย์ที่ยังไม่อยู่ในกลุ่มอื่นของการนิเทศครั้งนี้</p><div class="grid gap-1 rounded-control border border-divider p-2 sm:grid-cols-2"><label v-for="lecturer in lecturerCandidates" :key="lecturer.value" class="flex items-center gap-2 rounded-control px-2 py-1.5 hover:bg-surface"><UiCheckbox :model-value="draftLecturers.includes(lecturer.value)" :label="`เลือก ${lecturer.label}`" @update:model-value="setLecturerSelected(lecturer.value, $event)" /><span class="text-sm text-ink">{{ lecturer.label }}</span></label><p v-if="!lecturerCandidates.length" class="col-span-full px-2 py-1.5 text-sm text-muted">ไม่มีอาจารย์ที่พร้อมมอบหมาย</p></div></div><div><p class="mb-2 text-sm font-semibold text-ink">สถานประกอบการในกลุ่ม</p><div class="space-y-2"><div v-for="company in editingGroupCompanies" :key="company.name" class="rounded-control border border-divider px-3 py-3"><div class="flex items-start gap-2"><UiCheckbox :model-value="!removedCompanies[company.name]" :label="`เลือก ${company.name}`" @update:model-value="setCompanyIncluded(company.name, $event)" /><div class="min-w-0 flex-1"><p class="text-sm font-medium text-ink" :class="removedCompanies[company.name] && 'text-muted line-through'">{{ company.name }}</p><p class="mt-1 text-sm text-muted">{{ company.address }} · {{ company.students }} คน</p><button type="button" class="mt-2 text-sm font-semibold text-primary hover:underline" :aria-expanded="expandedCompanyStudents[company.name] ? 'true' : 'false'" @click="toggleCompanyStudents(company.name)">{{ expandedCompanyStudents[company.name] ? 'ซ่อนรายชื่อนักศึกษา' : 'ดูรายชื่อนักศึกษา' }}</button><ul v-if="expandedCompanyStudents[company.name]" class="mt-2 space-y-1 border-t border-divider pt-2 text-sm text-ink"><li v-for="student in studentsForCompany(company.name)" :key="student.id" class="flex justify-between gap-3"><span>{{ student.studentName }}</span><span class="text-xs text-muted">{{ student.studentId }}</span></li><li v-if="!studentsForCompany(company.name).length" class="text-sm text-muted">ยังไม่มีข้อมูลนักศึกษา</li></ul></div></div><div class="mt-3 grid grid-cols-2 gap-2"><div class="min-w-0"><UiInput :model-value="draftCompanySchedules[company.name]?.date ?? ''" type="date" label="วันที่" placeholder="เลือกวันที่" @update:model-value="setCompanySchedule(company.name, 'date', $event)" /></div><div class="min-w-0"><UiSelect :model-value="draftCompanySchedules[company.name]?.time ?? ''" :options="timeOptions" label="ช่วงเวลา" placeholder="เลือกช่วงเวลา" @update:model-value="setCompanySchedule(company.name, 'time', $event)" /></div></div></div><p v-if="editingGroupCompanies.length === 0" class="rounded-control bg-surface px-4 py-3 text-sm text-muted">ยังไม่มีสถานประกอบการในกลุ่มนี้</p></div></div></div>
      <UiCard v-if="editingGroup" class="mt-6 border border-divider text-sm" :padded="true"><div><h4 class="text-lg font-bold text-ink">ค่าใช้จ่ายการนิเทศ</h4><p class="mt-1 text-sm text-muted">คำนวณแยกตามกลุ่มนิเทศ กรุณากรอกระยะทางตามเส้นทางจริง</p></div><div class="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2"><div class="min-w-0 pb-3"><UiInput v-model="draftDistance" type="number" label="ระยะทางรวม (กม.)" /></div><div class="min-w-0 pb-3"><UiInput v-model="draftLecturerCount" type="number" label="จำนวนอาจารย์" /></div><div class="min-w-0 pt-3"><UiInput v-model="draftRooms" type="number" label="จำนวนห้องพัก" /></div><div class="min-w-0 pt-3"><UiInput v-model="draftNights" type="number" label="จำนวนคืน" /></div></div><div class="mt-4 space-y-2 rounded-control bg-surface p-3 text-sm"><div class="flex justify-between gap-3"><span>ค่าเดินทาง ({{ draftDistance || 0 }} กม. × 4)</span><span class="font-semibold text-ink">{{ travelCost.toLocaleString() }} บาท</span></div><div class="flex justify-between gap-3"><span>เบี้ยเลี้ยง ({{ draftLecturerCount || 0 }} คน × 240)</span><span class="font-semibold text-ink">{{ allowanceCost.toLocaleString() }} บาท</span></div><div class="flex justify-between gap-3"><span>ค่าที่พัก ({{ draftRooms || 0 }} ห้อง × {{ draftNights || 0 }} คืน × 800)</span><span class="font-semibold text-ink">{{ lodgingCost.toLocaleString() }} บาท</span></div><div class="mt-3 flex justify-between gap-3 border-t border-divider pt-4 text-lg font-bold text-ink"><span>รวมค่าใช้จ่าย</span><span>{{ totalExpense.toLocaleString() }} บาท</span></div></div></UiCard>
      <p v-if="editError" role="alert" class="mt-3 text-sm font-medium text-danger">{{ editError }}</p>
      <template #cancel><UiButton variant="ghost" @click="cancelEdit">ยกเลิก</UiButton></template>
      <template #confirm><UiButton variant="success" :loading="savingEdit" :disabled="!draftLecturers.length" @click="saveEdit">บันทึกการเปลี่ยนแปลง</UiButton></template>
    </UiDialog>

    <div class="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4"><div class="flex items-center gap-1 rounded-full border border-divider bg-canvas p-1 shadow-lg"><button type="button" class="rounded-full px-4 py-2 text-sm font-semibold" :class="variant === 'table' ? 'bg-sidebar text-white' : 'text-muted'" @click="chooseVariant('table')">แบบตาราง</button><button type="button" class="rounded-full px-4 py-2 text-sm font-semibold" :class="variant === 'cards' ? 'bg-sidebar text-white' : 'text-muted'" @click="chooseVariant('cards')">แบบการ์ด</button></div></div>
  </div>
</template>
