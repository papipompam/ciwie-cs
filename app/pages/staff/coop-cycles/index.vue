<script setup lang="ts">
import { CalendarRange, Pencil, Plus } from '@lucide/vue'
import type { StudentApplicationRecord } from '#shared/student-applications'
import { academicTermLabels, coopCycleInputSchema, nextCoopCycleStatus, type CoopCycle, type CoopCycleInput, type CoopCycleStatus } from '#shared/coop-cycles'
import { requestAwareFetch } from '~/utils/requestAwareFetch'

definePageMeta({ title: 'รอบสหกิจและการสมัคร', middleware: 'staff-prototype' })

const { cycles, selectedCycle, selectedCycleId, status, error, refresh } = useCoopCycles()
const { data: applications, status: applicationsStatus, error: applicationsError, refresh: refreshApplications } = await useFetch<StudentApplicationRecord[]>('/api/staff/student-applications', { default: () => [] })
const { showToast } = useToast()
const dialogOpen = ref(false)
const editingCycle = ref<CoopCycle | null>(null)
const isSaving = ref(false)
const formError = ref('')
const statusDialogOpen = ref(false)
const statusCycle = ref<CoopCycle | null>(null)
const statusTarget = ref<CoopCycleStatus>('open')
const isChangingStatus = ref(false)
const activeTab = ref<'cycles' | 'applications'>('cycles')
const selectedCycleIdForApplications = computed({ get: () => selectedCycleId.value ?? '', set: (value: string) => { selectedCycleId.value = value || null } })
const cycleOptions = computed(() => cycles.map(cycle => ({ value: cycle.id, label: `${cycle.label} · ${cycle.cohort}` })))

const currentThaiYear = new Date().getFullYear() + 543
const emptyForm = (): Record<keyof CoopCycleInput, string> => ({
  academicYear: String(cycles[0]?.academicYear ?? currentThaiYear),
  term: 'SECOND',
  targetCohortYear: String((cycles[0]?.academicYear ?? currentThaiYear) - 3),
  requestStart: '',
  requestEnd: '',
  trainingStart: '',
  trainingEnd: '',
})
const form = reactive(emptyForm())
const termOptions = Object.entries(academicTermLabels).map(([value, label]) => ({ value, label }))
const statusActionLabel: Partial<Record<CoopCycleStatus, string>> = {
  open: 'ปิดรับคำร้อง',
  closed_to_requests: 'เริ่มช่วงฝึกงาน',
  training: 'ปิดรอบสหกิจ',
}
const statusOptions = Object.entries(cycleStatusMeta).map(([value, meta]) => ({ value, label: meta.label }))

const openCreate = () => {
  editingCycle.value = null
  Object.assign(form, emptyForm())
  formError.value = ''
  dialogOpen.value = true
}
const openEdit = (cycle: CoopCycle) => {
  editingCycle.value = cycle
  Object.assign(form, {
    academicYear: String(cycle.academicYear), term: cycle.term, targetCohortYear: String(cycle.targetCohortYear),
    requestStart: cycle.requestStart, requestEnd: cycle.requestEnd,
    trainingStart: cycle.trainingStart, trainingEnd: cycle.trainingEnd,
  })
  formError.value = ''
  dialogOpen.value = true
}
const saveCycle = async () => {
  formError.value = ''
  const parsed = coopCycleInputSchema.safeParse({
    ...form,
    requestStart: form.requestStart || undefined,
    requestEnd: form.requestEnd || undefined,
    trainingStart: form.trainingStart || undefined,
    trainingEnd: form.trainingEnd || undefined,
  })
  if (!parsed.success) {
    formError.value = parsed.error.issues[0]?.message ?? 'กรุณาตรวจสอบข้อมูลรอบสหกิจศึกษา'
    return
  }
  isSaving.value = true
  try {
    const path = editingCycle.value ? `/api/staff/coop-cycles/${encodeURIComponent(editingCycle.value.id)}` : '/api/staff/coop-cycles'
    await requestAwareFetch(path, { method: editingCycle.value ? 'PATCH' : 'POST', body: parsed.data, reload: false })
    await refresh()
    dialogOpen.value = false
    showToast({ title: editingCycle.value ? 'แก้ไขรอบสหกิจแล้ว' : 'สร้างรอบสหกิจแล้ว', description: 'บันทึกข้อมูลลงฐานข้อมูลเรียบร้อยแล้ว' })
  }
  catch (cause) {
    formError.value = cause instanceof Error && cause.message.includes('COOP_CYCLE_ALREADY_EXISTS')
      ? 'มีรอบสหกิจของปี ภาคเรียน และรุ่นนี้แล้ว'
      : 'บันทึกรอบสหกิจไม่สำเร็จ กรุณาลองอีกครั้ง'
  }
  finally { isSaving.value = false }
}

const openStatusDialog = (cycle: CoopCycle, target: CoopCycleStatus = cycle.status) => {
  statusCycle.value = cycle
  statusTarget.value = target
  statusDialogOpen.value = true
}
const changeStatus = async () => {
  const cycle = statusCycle.value
  if (!cycle || statusTarget.value === cycle.status) return
  isChangingStatus.value = true
  try {
    await requestAwareFetch(`/api/staff/coop-cycles/${encodeURIComponent(cycle.id)}/status`, {
      method: 'PATCH', body: { status: statusTarget.value }, reload: false,
    })
    await refresh()
    statusDialogOpen.value = false
    showToast({ title: 'เปลี่ยนสถานะรอบสหกิจแล้ว', description: cycleStatusMeta[statusTarget.value].label })
  }
  catch { showToast({ title: 'เปลี่ยนสถานะไม่สำเร็จ', description: 'กรุณาโหลดข้อมูลใหม่แล้วลองอีกครั้ง' }) }
  finally { isChangingStatus.value = false }
}

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00+07:00`)) : 'ยังไม่กำหนด'
</script>

<template>
  <div>
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">รอบสหกิจและการสมัคร</h2>
        <p class="mt-1 text-sm leading-6 text-muted">จัดการรอบสหกิจและติดตามข้อมูลการสมัครของนักศึกษาในหน้าเดียว</p>
      </div>
      <UiButton v-if="activeTab === 'cycles'" :icon="Plus" @click="openCreate">สร้างรอบสหกิจ</UiButton>
    </header>

    <div class="mb-6 flex flex-wrap gap-2 border-b border-divider" role="tablist" aria-label="ข้อมูลรอบสหกิจ">
      <button type="button" role="tab" :aria-selected="activeTab === 'cycles'" class="border-b-2 px-4 py-3 text-sm font-semibold" :class="activeTab === 'cycles' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'" @click="activeTab = 'cycles'">จัดการรอบสหกิจ</button>
      <button type="button" role="tab" :aria-selected="activeTab === 'applications'" class="border-b-2 px-4 py-3 text-sm font-semibold" :class="activeTab === 'applications' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'" @click="activeTab = 'applications'">ข้อมูลการสมัครนักศึกษา</button>
    </div>

    <template v-if="activeTab === 'cycles'">
    <div v-if="status === 'loading'" class="space-y-4"><UiSkeleton v-for="row in 3" :key="row" class="h-28" /></div>
    <AppErrorState v-else-if="status === 'error'" title="โหลดรอบสหกิจไม่สำเร็จ" :description="error ?? 'กรุณาลองอีกครั้ง'" @retry="refresh" />
    <AppEmptyState v-else-if="!cycles.length" :icon="CalendarRange" title="ยังไม่มีรอบสหกิจศึกษา" description="สร้างรอบแรกก่อนเพิ่มหรือนำเข้านักศึกษา">
      <UiButton :icon="Plus" @click="openCreate">สร้างรอบสหกิจ</UiButton>
    </AppEmptyState>
    <UiCard v-else :padded="false">
      <div class="hidden overflow-x-auto md:block">
        <table class="w-full min-w-[980px] text-left text-sm">
          <caption class="sr-only">รายการรอบสหกิจศึกษา</caption>
          <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th class="px-6 py-3">รอบสหกิจศึกษา</th><th class="px-4 py-3">รุ่น</th><th class="px-4 py-3">ช่วงรับคำร้อง</th><th class="px-4 py-3">ช่วงฝึกงาน</th><th class="px-4 py-3">สถานะ</th><th class="w-52 px-6 py-3"><span class="sr-only">ดำเนินการ</span></th></tr></thead>
          <tbody class="divide-y divide-divider">
            <tr v-for="cycle in cycles" :key="cycle.id" class="hover:bg-surface/70">
              <td class="px-6 py-4"><p class="font-semibold text-ink">{{ cycle.label }}</p><p class="mt-1 text-xs text-muted">{{ cycle.code }}</p></td>
              <td class="whitespace-nowrap px-4 py-4 text-ink">{{ cycle.cohort }}</td>
              <td class="whitespace-nowrap px-4 py-4 text-muted">{{ formatDate(cycle.requestStart) }} – {{ formatDate(cycle.requestEnd) }}</td>
              <td class="whitespace-nowrap px-4 py-4 text-muted">{{ formatDate(cycle.trainingStart) }} – {{ formatDate(cycle.trainingEnd) }}</td>
              <td class="px-4 py-4"><UiBadge :tone="cycleStatusMeta[cycle.status].tone">{{ cycleStatusMeta[cycle.status].label }}</UiBadge></td>
              <td class="px-6 py-4"><div class="flex justify-end gap-2"><UiButton size="sm" variant="secondary" :icon="Pencil" @click="openEdit(cycle)">แก้ไข</UiButton><UiButton size="sm" variant="secondary" :icon="Pencil" @click="openStatusDialog(cycle)">แก้ไขสถานะ</UiButton><UiButton v-if="statusActionLabel[cycle.status]" size="sm" @click="openStatusDialog(cycle, nextCoopCycleStatus[cycle.status]!)">{{ statusActionLabel[cycle.status] }}</UiButton></div></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="divide-y divide-divider md:hidden">
        <article v-for="cycle in cycles" :key="cycle.id" class="p-5">
          <div class="flex items-start justify-between gap-3"><div><h3 class="font-semibold text-ink">{{ cycle.label }}</h3><p class="mt-1 text-xs text-muted">{{ cycle.cohort }} · {{ cycle.code }}</p></div><UiBadge :tone="cycleStatusMeta[cycle.status].tone">{{ cycleStatusMeta[cycle.status].label }}</UiBadge></div>
          <dl class="mt-4 grid gap-3 text-sm"><div><dt class="text-xs text-muted">ช่วงรับคำร้อง</dt><dd class="mt-1 text-ink">{{ formatDate(cycle.requestStart) }} – {{ formatDate(cycle.requestEnd) }}</dd></div><div><dt class="text-xs text-muted">ช่วงฝึกงาน</dt><dd class="mt-1 text-ink">{{ formatDate(cycle.trainingStart) }} – {{ formatDate(cycle.trainingEnd) }}</dd></div></dl>
          <div class="mt-4 flex flex-wrap justify-end gap-2 border-t border-divider pt-4"><UiButton size="sm" variant="secondary" :icon="Pencil" @click="openEdit(cycle)">แก้ไข</UiButton><UiButton size="sm" variant="secondary" :icon="Pencil" @click="openStatusDialog(cycle)">แก้ไขสถานะ</UiButton><UiButton v-if="statusActionLabel[cycle.status]" size="sm" @click="openStatusDialog(cycle, nextCoopCycleStatus[cycle.status]!)">{{ statusActionLabel[cycle.status] }}</UiButton></div>
        </article>
      </div>
    </UiCard>
    </template>

    <div v-else>
      <AppErrorState v-if="applicationsStatus === 'error' || applicationsError" title="โหลดข้อมูลการสมัครไม่สำเร็จ" description="กรุณาลองโหลดข้อมูลใหม่อีกครั้ง" @retry="refreshApplications" />
      <StaffStudentApplicationsTab v-else-if="selectedCycle" v-model:selected-cycle-id="selectedCycleIdForApplications" :applications="applications" :cycle-id="selectedCycle.id" :cycle-options="cycleOptions" />
      <AppEmptyState v-else-if="status === 'success'" title="ยังไม่มีรอบสหกิจศึกษา" description="สร้างรอบสหกิจศึกษาก่อนดูข้อมูลการสมัคร" />
      <UiSkeleton v-else class="h-56" />
    </div>

    <UiDialog v-if="activeTab === 'cycles'" v-model:open="dialogOpen" :close-on-confirm="false" size="lg" :title="editingCycle ? 'แก้ไขรอบสหกิจศึกษา' : 'สร้างรอบสหกิจศึกษา'" description="รอบใหม่จะเปิดรับคำร้องทันที และสามารถแก้ไขรายละเอียดได้ภายหลัง">
      <UiAlert v-if="formError" class="mb-4" tone="danger" title="บันทึกข้อมูลไม่ได้">{{ formError }}</UiAlert>
      <div class="grid gap-4 sm:grid-cols-2">
        <div><UiInput v-model="form.academicYear" type="number" :min="2500" :max="2700" label="ปีการศึกษา" required /></div>
        <div><UiSelect v-model="form.term" :options="termOptions" label="ภาคเรียน" required /></div>
        <div><UiInput v-model="form.targetCohortYear" type="number" :min="2500" :max="2700" label="รุ่นนักศึกษา (ปี พ.ศ.)" help="เช่น 2566 สำหรับรุ่น 66" required /></div>
        <div aria-hidden="true" />
        <div><UiInput v-model="form.requestStart" type="date" label="วันเริ่มรับคำร้อง" /></div>
        <div><UiInput v-model="form.requestEnd" type="date" label="วันสิ้นสุดรับคำร้อง" /></div>
        <div><UiInput v-model="form.trainingStart" type="date" label="วันเริ่มฝึกงาน" /></div>
        <div><UiInput v-model="form.trainingEnd" type="date" label="วันสิ้นสุดฝึกงาน" /></div>
      </div>
      <template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template>
      <template #confirm><UiButton :loading="isSaving" @click="saveCycle">บันทึกรอบสหกิจ</UiButton></template>
    </UiDialog>

    <UiDialog v-if="activeTab === 'cycles'" v-model:open="statusDialogOpen" :close-on-confirm="false" title="แก้ไขสถานะรอบสหกิจ" :description="statusCycle ? `${statusCycle.label} · ${statusCycle.cohort}` : undefined">
      <UiSelect v-model="statusTarget" :options="statusOptions" label="สถานะรอบสหกิจ" />
      <template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template>
      <template #confirm><UiButton :loading="isChangingStatus" :disabled="!statusCycle || statusTarget === statusCycle.status" @click="changeStatus">บันทึกสถานะ</UiButton></template>
    </UiDialog>
  </div>
</template>
