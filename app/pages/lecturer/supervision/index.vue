<script setup lang="ts">
import { CheckCircle2, RotateCcw, Search, X } from '@lucide/vue'
import type { SupervisionAppointment } from '~/composables/useSupervisionAppointments'

definePageMeta({ title: 'ตารางนิเทศ', middleware: 'lecturer-prototype' })
useHead({ title: 'ตารางนิเทศ' })

const { scenario } = useScenario()
const { showToast } = useToast()
const { people } = usePeopleDirectory()
const { cycleId, round, scheduleGroupId } = useSupervisionContext()
const { groups, getCompanies } = useSupervisionGroups()
const { appointments, completeAppointment } = useSupervisionAppointments()
const currentLecturerId = 'L0012'
const completingAppointmentId = ref<string | null>(null)
const searchQuery = ref('')
const effectiveViewState = computed(() => scenario.value.forceError ? 'error' : scenario.value.viewState)
const groupOptions = computed(() => [
  { value: 'all', label: 'ทุกกลุ่ม' },
  ...groups.value
    .filter(group => group.cycleId === cycleId.value && group.round === round.value)
    .map(group => ({
      value: group.id,
      label: group.lecturerIds.includes(currentLecturerId) ? `${group.name} (กลุ่มของฉัน)` : group.name,
    })),
])
const selectedGroupFilterLabel = computed(() => groupOptions.value
  .find(option => option.value === scheduleGroupId.value)?.label ?? 'ทุกกลุ่ม')
const hasTableFilters = computed(() => Boolean(searchQuery.value.trim() || scheduleGroupId.value !== 'all'))
const currentAppointments = computed(() => appointments.value
  .filter(item => item.cycleId === cycleId.value
    && item.round === round.value
    && (scheduleGroupId.value === 'all' || item.groupId === scheduleGroupId.value))
  .filter((item) => {
    const query = searchQuery.value.trim().toLocaleLowerCase('th')
    if (!query) return true
    const searchableText = [
      item.id,
      companyName(item.companyId),
      company(item.companyId)?.branch,
      company(item.companyId)?.province,
      groupName(item.groupId),
      ...item.lecturerIds.map(lecturerName),
      ...studentNames(item),
    ].filter(Boolean).join(' ').toLocaleLowerCase('th')
    return searchableText.includes(query)
  })
  .sort((a, b) => `${a.date}-${a.period}`.localeCompare(`${b.date}-${b.period}`)))
const companies = computed(() => getCompanies(cycleId.value))

const company = (id: string) => companies.value.find(item => item.id === id)
const companyName = (id: string) => company(id)?.name ?? id
const groupName = (id: string) => groups.value.find(group => group.id === id)?.name ?? id
const lecturerName = (id: string) => {
  const lecturer = people.value.find(person => person.type === 'lecturer' && person.id === id)
  return lecturer ? getPersonFullName(lecturer) : id
}
const studentNames = (appointment: SupervisionAppointment) => company(appointment.companyId)?.students
  .filter(student => appointment.studentIds.includes(student.studentId))
  .map(student => student.studentName) ?? appointment.studentIds
const formatDate = (date: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00+07:00`))
const retry = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
}
const resetTable = () => {
  searchQuery.value = ''
  scheduleGroupId.value = 'all'
}
const isParticipating = (appointment: SupervisionAppointment) => appointment.lecturerIds.includes(currentLecturerId)
const isResponsibleGroup = (appointment: SupervisionAppointment) => groups.value
  .find(group => group.id === appointment.groupId)?.lecturerIds.includes(currentLecturerId) ?? false
const canComplete = (appointment: SupervisionAppointment) => ['published', 'postponed'].includes(appointment.status)
  && isParticipating(appointment)
const completeSupervision = (appointment: SupervisionAppointment) => {
  if (!canComplete(appointment) || completingAppointmentId.value) return
  completingAppointmentId.value = appointment.id
  try {
    completeAppointment(appointment.id, {
      summary: appointment.result.summary,
      issues: appointment.result.issues,
      suggestions: appointment.result.suggestions,
      companyRequirements: appointment.result.companyRequirements,
      actualLecturerIds: [...appointment.lecturerIds],
    })
    showToast({ title: 'บันทึกว่านิเทศเสร็จแล้ว', description: `${companyName(appointment.companyId)} พร้อมสำหรับการประเมิน` })
  } catch {
    showToast({ title: 'บันทึกสถานะไม่สำเร็จ', description: 'รายการต้องมีอาจารย์ผู้เข้าร่วมอย่างน้อย 1 คน กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง' })
  } finally {
    completingAppointmentId.value = null
  }
}
watchEffect(() => {
  if (!groupOptions.value.some(option => option.value === scheduleGroupId.value)) scheduleGroupId.value = 'all'
})
</script>

<template>
  <div>
    <div class="mb-6">
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">ตารางนิเทศ</h2>
        <p class="mt-1 text-sm leading-6 text-muted">ดูตารางนิเทศที่ได้รับมอบหมายและบันทึกสถานะเมื่อดำเนินการนิเทศเรียบร้อยแล้ว</p>
      </div>
    </div>

    <UiCard :padded="false">
      <div class="border-b border-divider p-5 sm:p-6">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label class="block w-full text-sm font-semibold text-ink sm:max-w-sm lg:w-96 lg:flex-none">
            <span class="sr-only">ค้นหารายการนิเทศ</span>
            <span class="relative block">
              <Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input v-model="searchQuery" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" placeholder="ค้นหาบริษัท กลุ่ม อาจารย์ หรือนักศึกษา">
            </span>
          </label>
          <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
            <div class="w-full sm:w-56">
              <UiSelect v-model="scheduleGroupId" :options="groupOptions" :placeholder="selectedGroupFilterLabel" label="กรองตามกลุ่มอาจารย์" :label-visible="false" />
            </div>
            <button type="button" class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink transition-colors hover:bg-surface" aria-label="รีเซ็ตตาราง" title="รีเซ็ตตาราง" @click="resetTable"><RotateCcw :size="18" aria-hidden="true" /></button>
          </div>
        </div>

        <div v-if="hasTableFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="text-muted">ตัวกรองที่ใช้:</span>
          <span v-if="searchQuery.trim()" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">คำค้น “{{ searchQuery.trim() }}”</span>
          <span v-if="scheduleGroupId !== 'all'" class="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface px-3 text-ink">{{ selectedGroupFilterLabel }}</span>
          <button type="button" class="inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-semibold text-warning hover:bg-warning-soft" @click="resetTable"><X :size="15" aria-hidden="true" />ล้างทั้งหมด</button>
        </div>
      </div>

      <div v-if="effectiveViewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดรายการนัด"><UiSkeleton v-for="row in 4" :key="row" class="h-14" /></div>
      <div v-else-if="effectiveViewState === 'error'" class="p-5 sm:p-6"><AppErrorState title="โหลดรายการนัดไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง" @retry="retry" /></div>
      <div v-else-if="!currentAppointments.length" class="p-5 sm:p-6"><AppEmptyState :title="hasTableFilters ? 'ไม่พบรายการนิเทศที่ตรงกับตัวกรอง' : 'ยังไม่มีตารางสำหรับการนิเทศครั้งนี้'" :description="hasTableFilters ? `${scheduleGroupId === 'all' ? 'ทุกกลุ่ม' : groupName(scheduleGroupId)} กรุณาเปลี่ยนคำค้นหาหรือตัวกรองที่ใช้อยู่` : 'เจ้าหน้าที่ยังไม่ได้กำหนดตารางของกลุ่มอาจารย์และสถานประกอบการ'" /></div>
      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[1180px] table-fixed border-collapse text-left text-sm">
            <caption class="sr-only">รายการนัดนิเทศ พร้อมสถานประกอบการ อาจารย์ และนักศึกษา</caption>
            <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
              <tr><th scope="col" class="w-60 px-5 py-3">สถานประกอบการ</th><th scope="col" class="w-44 px-4 py-3">วันและช่วงเวลา</th><th scope="col" class="w-48 px-4 py-3">กลุ่มรับผิดชอบ</th><th scope="col" class="w-64 px-4 py-3">อาจารย์ผู้เข้าร่วม</th><th scope="col" class="w-36 px-4 py-3">นักศึกษา</th><th scope="col" class="w-56 px-4 py-3 text-right"><span class="sr-only">การดำเนินการ</span></th></tr>
            </thead>
            <tbody class="divide-y divide-divider">
              <tr v-for="item in currentAppointments" :key="item.id" class="hover:bg-surface/70">
                <td class="px-5 py-4 align-top"><p class="font-semibold text-ink">{{ companyName(item.companyId) }}</p><p class="mt-1 text-xs leading-5 text-muted">{{ company(item.companyId)?.branch }} · {{ company(item.companyId)?.province }}</p></td>
                <td class="px-4 py-4 align-top"><p class="font-medium text-ink">{{ formatDate(item.date) }}</p><p class="mt-1 text-xs text-muted">{{ supervisionPeriodMeta[item.period].label }} · {{ item.id }}</p><UiBadge class="mt-2" :tone="supervisionAppointmentStatusMeta[item.status].tone">{{ supervisionAppointmentStatusMeta[item.status].label }}</UiBadge></td>
                <td class="px-4 py-4 align-top"><p class="font-medium text-ink">{{ groupName(item.groupId) }}</p><UiBadge v-if="isResponsibleGroup(item)" class="mt-2" tone="info">กลุ่มของคุณ</UiBadge></td>
                <td class="px-4 py-4 align-top"><div v-if="item.lecturerIds.length" class="space-y-1"><p v-for="id in item.lecturerIds" :key="id" class="text-sm leading-5 text-ink">{{ lecturerName(id) }}</p></div><p v-else class="text-sm text-danger">ยังไม่มีอาจารย์เข้าร่วม</p></td>
                <td class="px-4 py-4 align-top"><p class="font-semibold text-ink">{{ item.studentIds.length }} คน</p><p class="mt-1 text-xs text-muted">ดูรายชื่อในรายละเอียด</p></td>
                <td class="px-4 py-4 align-top"><div class="flex items-center justify-end gap-2"><UiButton v-if="canComplete(item)" size="sm" :icon="CheckCircle2" :loading="completingAppointmentId === item.id" @click="completeSupervision(item)">นิเทศเสร็จ</UiButton><UiButton size="sm" variant="secondary" @click="navigateTo(`/lecturer/supervision/${item.id}`)">ดูข้อมูล</UiButton></div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mobile-card-list md:hidden">
          <article v-for="item in currentAppointments" :key="item.id" class="bg-canvas p-5">
            <div class="flex items-start justify-between gap-3"><div class="min-w-0"><h3 class="font-semibold text-ink">{{ companyName(item.companyId) }}</h3><p class="mt-1 text-xs text-muted">{{ company(item.companyId)?.branch }} · {{ company(item.companyId)?.province }}</p></div><UiButton class="shrink-0" size="sm" variant="secondary" @click="navigateTo(`/lecturer/supervision/${item.id}`)">ดูข้อมูล</UiButton></div>
            <div class="mt-3 flex flex-wrap items-center gap-2"><UiBadge v-if="isResponsibleGroup(item)" tone="info">กลุ่มของคุณ</UiBadge><UiBadge :tone="supervisionAppointmentStatusMeta[item.status].tone">{{ supervisionAppointmentStatusMeta[item.status].label }}</UiBadge><span class="text-sm text-muted">{{ formatDate(item.date) }} · {{ supervisionPeriodMeta[item.period].label }}</span></div>
            <dl class="mt-3 grid gap-2 border-t border-divider pt-3 text-sm"><div><dt class="text-xs font-medium text-muted">กลุ่มรับผิดชอบ</dt><dd class="mt-1 text-ink">{{ groupName(item.groupId) }}</dd></div><div><dt class="text-xs font-medium text-muted">อาจารย์ผู้เข้าร่วม</dt><dd class="mt-1 text-ink">{{ item.lecturerIds.length ? item.lecturerIds.map(lecturerName).join(', ') : 'ยังไม่มีอาจารย์เข้าร่วม' }}</dd></div><div><dt class="text-xs font-medium text-muted">นักศึกษา</dt><dd class="mt-1 text-ink">{{ studentNames(item).join(', ') }} ({{ item.studentIds.length }} คน)</dd></div></dl>
            <UiButton v-if="canComplete(item)" class="mt-4 w-full" :icon="CheckCircle2" :loading="completingAppointmentId === item.id" @click="completeSupervision(item)">นิเทศเสร็จ</UiButton>
          </article>
        </div>
      </template>
    </UiCard>

  </div>
</template>
