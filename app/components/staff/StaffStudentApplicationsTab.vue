<script setup lang="ts">
import { BriefcaseBusiness, CheckCircle2, Clock3, Search, XCircle } from '@lucide/vue'
import type { StudentApplicationRecord, StudentApplicationStatusGroup } from '#shared/student-applications'
import { getStudentApplicationStatusGroup, studentApplicationStatusGroupMeta } from '#shared/student-applications'

const props = defineProps<{ applications: StudentApplicationRecord[], cycleId: string, cycleOptions: Array<{ value: string, label: string }>, selectedCycleId: string }>()
const emit = defineEmits<{ 'update:selectedCycleId': [value: string] }>()
const search = ref('')
const statusFilter = ref<'all' | StudentApplicationStatusGroup>('all')

const filteredApplications = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('th')
  return props.applications.filter((application) => {
    const status = getStudentApplicationStatusGroup(application.status)
    const searchable = `${application.studentId} ${application.companyName} ${application.position} ${application.province}`.toLocaleLowerCase('th')
    return application.cycleId === props.cycleId
      && (statusFilter.value === 'all' || status === statusFilter.value)
      && (!keyword || searchable.includes(keyword))
  })
})
const summary = computed(() => ({
  all: filteredApplications.value.length,
  pending: filteredApplications.value.filter(item => getStudentApplicationStatusGroup(item.status) === 'pending').length,
  confirmed: filteredApplications.value.filter(item => getStudentApplicationStatusGroup(item.status) === 'confirmed').length,
  rejected: filteredApplications.value.filter(item => getStudentApplicationStatusGroup(item.status) === 'rejected').length,
}))
const statusOptions = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'pending', label: studentApplicationStatusGroupMeta.pending.label },
  { value: 'confirmed', label: studentApplicationStatusGroupMeta.confirmed.label },
  { value: 'rejected', label: studentApplicationStatusGroupMeta.rejected.label },
]
const formatDate = (value: string) => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00+07:00`))
</script>

<template>
  <div>
    <div class="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <UiCard
        v-for="card in [
        { label: 'รายการสมัครทั้งหมด', value: summary.all, icon: BriefcaseBusiness, tone: 'bg-info-soft text-info' },
        { label: 'อยู่ระหว่างดำเนินการ', value: summary.pending, icon: Clock3, tone: 'bg-warning-soft text-warning' },
        { label: 'ยืนยันแล้ว', value: summary.confirmed, icon: CheckCircle2, tone: 'bg-success-soft text-success' },
        { label: 'ปฏิเสธ', value: summary.rejected, icon: XCircle, tone: 'bg-danger-soft text-danger' },
        ]"
        :key="card.label"
        class="flex items-center gap-4"
      >
        <span class="grid size-11 shrink-0 place-items-center rounded-control" :class="card.tone"><component :is="card.icon" :size="20" aria-hidden="true" /></span>
        <div><p class="text-xs font-medium text-muted">{{ card.label }}</p><p class="mt-1 text-2xl font-bold text-ink">{{ card.value }}</p></div>
      </UiCard>
    </div>
    <UiCard :padded="false">
      <div class="flex flex-col gap-3 border-b border-divider p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div><h3 class="text-lg font-bold text-ink">รายการสมัครของนักศึกษา</h3><p class="mt-1 text-sm text-muted">แสดงเฉพาะนักศึกษาในรอบสหกิจที่เลือก</p></div>
        <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label class="relative block sm:w-72"><span class="sr-only">ค้นหารายการสมัคร</span><Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" /><input v-model="search" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 placeholder:text-gray-400" placeholder="ค้นหารหัส บริษัท ตำแหน่ง"></label>
          <div class="sm:w-64"><UiSelect :model-value="selectedCycleId" :options="cycleOptions" label="รอบสหกิจศึกษา" :label-visible="false" @update:model-value="emit('update:selectedCycleId', $event)" /></div>
          <div class="sm:w-48"><UiSelect v-model="statusFilter" :options="statusOptions" label="กรองตามสถานะ" :label-visible="false" /></div>
          <button v-if="search || statusFilter !== 'all'" type="button" class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider text-muted hover:bg-surface" aria-label="ล้างตัวกรอง" @click="search = ''; statusFilter = 'all'"><XCircle :size="18" aria-hidden="true" /></button>
        </div>
      </div>
      <AppEmptyState v-if="!filteredApplications.length" title="ยังไม่มีข้อมูลการสมัครในรอบนี้" description="เมื่อนักศึกษาเพิ่มข้อมูลบริษัท รายการจะแสดงที่หน้านี้" />
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm"><caption class="sr-only">รายการสมัครของนักศึกษาในรอบสหกิจที่เลือก</caption><thead class="bg-surface text-xs font-semibold text-muted"><tr><th class="px-6 py-3">รหัสนักศึกษา</th><th class="px-4 py-3">สถานประกอบการ / ตำแหน่ง</th><th class="px-4 py-3">จังหวัด</th><th class="px-4 py-3">วันที่สมัคร</th><th class="px-4 py-3">สถานะ</th></tr></thead><tbody class="divide-y divide-divider"><tr v-for="application in filteredApplications" :key="application.id" class="hover:bg-surface/70"><td class="px-6 py-4 font-semibold text-ink">{{ application.studentId }}</td><td class="px-4 py-4"><p class="font-medium text-ink">{{ application.companyName }}</p><p class="mt-1 text-xs text-muted">{{ application.position }}</p></td><td class="px-4 py-4 text-muted">{{ application.province }}</td><td class="whitespace-nowrap px-4 py-4 text-muted">{{ formatDate(application.appliedAt) }}</td><td class="px-4 py-4"><UiBadge :tone="getStudentApplicationStatusGroup(application.status) === 'confirmed' ? 'success' : getStudentApplicationStatusGroup(application.status) === 'rejected' ? 'danger' : 'warning'">{{ studentApplicationStatusGroupMeta[getStudentApplicationStatusGroup(application.status)].label }}</UiBadge></td></tr></tbody></table>
      </div>
    </UiCard>
  </div>
</template>
