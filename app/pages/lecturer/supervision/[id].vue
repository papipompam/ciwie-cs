<script setup lang="ts">
import { CalendarClock } from '@lucide/vue'
import type { SupervisionPeriod } from '~/composables/useSupervisionAppointments'

definePageMeta({ title: 'รายละเอียดการนิเทศ', middleware: 'lecturer-prototype' })

const route = useRoute()
const { scenario } = useScenario()
const { showToast } = useToast()
const { people, loadPersistedPeople } = usePeopleDirectory()
await loadPersistedPeople('lecturer')
const { groups, getCompanies } = useSupervisionGroups()
const { currentAccount } = useAuthPrototype()
const {
  appointments,
  loadPersistedAppointment,
  persistUpdateAppointment,
  persistSaveResult,
  persistCompleteAppointment,
} = useSupervisionAppointments()
const currentLecturerId = computed(() => currentAccount.value?.id ?? '')
const appointmentId = computed(() => String(route.params.id))
const appointment = computed(() => appointments.value.find(item => item.id === appointmentId.value) ?? null)
const company = computed(() => {
  if (!appointment.value) return null
  const stored = getCompanies(appointment.value.cycleId).find(item => item.id === appointment.value?.companyId)
  if (stored) return stored
  const display = appointment.value.display
  return display
    ? {
        id: appointment.value.companyId, cycleId: appointment.value.cycleId, name: display.companyName, branch: display.branchName, province: display.province,
        region: '', address: display.address, contactName: '', contactPhone: '', status: 'active' as const, studentCount: display.students.length,
        students: display.students.map(student => ({ id: student.id, studentId: student.id, studentName: student.name, prefix: '', firstName: student.name, lastName: '', section: '', position: student.position })),
      }
    : null
})
const group = computed(() => groups.value.find(item => item.id === appointment.value?.groupId) ?? null)
const students = computed(() => company.value?.students.filter(student => appointment.value?.studentIds.includes(student.studentId)) ?? [])
const lecturers = computed(() => people.value.filter(person => person.type === 'lecturer' && person.recordStatus === 'active' && person.accountStatus === 'active'))
const appointmentLoading = ref(true)
const appointmentLoadError = ref(false)
const effectiveViewState = computed(() => scenario.value.forceError || appointmentLoadError.value
  ? 'error'
  : appointmentLoading.value ? 'loading' : scenario.value.viewState)
const isLocked = computed(() => appointment.value?.status === 'completed' || appointment.value?.status === 'cancelled')
const isCancelled = computed(() => appointment.value?.status === 'cancelled')
const canManage = computed(() => Boolean(appointment.value && (
  appointment.value.lecturerIds.includes(currentLecturerId.value)
  || group.value?.lecturerIds.includes(currentLecturerId.value)
)))
const scheduleErrors = ref<{ date?: string, period?: string, lecturerIds?: string }>({})
const scheduleForm = reactive({ date: '', period: 'morning' as SupervisionPeriod, lecturerIds: [] as string[] })
const resultForm = reactive({ summary: '', issues: '', suggestions: '', companyRequirements: '' })
const resultError = ref('')
const isSavingResult = ref(false)
const periodOptions = [
  { value: 'morning', label: 'ช่วงเช้า' },
  { value: 'afternoon', label: 'ช่วงบ่าย' },
]

const lecturerName = (id: string) => {
  const lecturer = people.value.find(person => person.type === 'lecturer' && (person.id === id || person.accountId === id))
  return lecturer ? getPersonFullName(lecturer) : id
}
const formatDateTime = (value: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
  .format(new Date(value))
const retry = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
  void loadAppointment()
}
const toggleLecturer = (id: string, checked: boolean | 'indeterminate') => {
  const selected = scheduleForm.lecturerIds
  const next = checked === true ? [...new Set([...selected, id])] : selected.filter(item => item !== id)
  scheduleForm.lecturerIds = next
  scheduleErrors.value.lecturerIds = undefined
}
const saveSupervisionResult = async () => {
  if (!appointment.value || !canManage.value || isCancelled.value || isSavingResult.value) return
  scheduleErrors.value = {}
  resultError.value = ''
  if (!scheduleForm.date) scheduleErrors.value.date = 'เลือกวันที่นิเทศ'
  if (!scheduleForm.lecturerIds.length) scheduleErrors.value.lecturerIds = 'เลือกอาจารย์ผู้เข้าร่วมอย่างน้อย 1 คน'
  if (Object.values(scheduleErrors.value).some(Boolean)) {
    resultError.value = 'กรุณาตรวจสอบวันและอาจารย์ผู้เข้าร่วม'
    return
  }

  const resultInput = {
    summary: resultForm.summary,
    issues: resultForm.issues,
    suggestions: resultForm.suggestions,
    companyRequirements: resultForm.companyRequirements,
  }
  isSavingResult.value = true
  try {
    if (appointment.value.status === 'completed') {
      await persistSaveResult(appointment.value.id, resultInput)
      showToast({ title: 'บันทึกการแก้ไขผลการนิเทศแล้ว', description: appointment.value.id })
    }
    else {
      await persistUpdateAppointment(appointment.value.id, {
        date: scheduleForm.date,
        period: scheduleForm.period,
        lecturerIds: [...scheduleForm.lecturerIds],
      })
      await persistCompleteAppointment(appointment.value.id, {
        ...resultInput,
        actualLecturerIds: [...scheduleForm.lecturerIds],
      })
      showToast({ title: 'ยืนยันนิเทศเสร็จแล้ว', description: 'บันทึกผลการนิเทศเรียบร้อย สามารถทำแบบประเมินในเมนูการประเมิน' })
    }
  }
  catch {
    showToast({ title: 'บันทึกผลการนิเทศไม่สำเร็จ', description: 'กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง' })
  }
  finally {
    isSavingResult.value = false
  }
}
const loadAppointment = async () => {
  appointmentLoading.value = true
  appointmentLoadError.value = false
  try {
    await loadPersistedAppointment(appointmentId.value)
  }
  catch {
    if (!(import.meta.dev && appointment.value)) appointmentLoadError.value = true
  }
  finally {
    appointmentLoading.value = false
  }
}
onMounted(loadAppointment)
watch(appointmentId, loadAppointment)
watch(appointment, (value) => {
  if (!value) return
  Object.assign(scheduleForm, { date: value.date, period: value.period, lecturerIds: [...value.lecturerIds] })
  Object.assign(resultForm, {
    summary: value.result.summary,
    issues: value.result.issues,
    suggestions: value.result.suggestions,
    companyRequirements: value.result.companyRequirements,
  })
  useHead({ title: `${value.id} · รายละเอียดการนิเทศ` })
}, { immediate: true })
</script>

<template>
  <div>
    <div v-if="effectiveViewState === 'loading'" class="space-y-5" aria-label="กำลังโหลดรายละเอียดการนิเทศ">
      <UiSkeleton class="h-24" /><UiSkeleton class="h-72" /><UiSkeleton class="h-80" />
    </div>
    <AppErrorState v-else-if="effectiveViewState === 'error'" title="โหลดรายละเอียดการนิเทศไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง" @retry="retry" />
    <AppEmptyState v-else-if="!appointment" title="ไม่พบรายการนิเทศ" description="รายการนี้อาจถูกย้ายหรือไม่มีอยู่ในข้อมูลตัวอย่าง"><UiButton variant="secondary" @click="navigateTo('/lecturer/supervision')">กลับไปตารางนิเทศ</UiButton></AppEmptyState>

    <template v-else>
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-sm font-semibold text-primary">{{ appointment.id }} · นิเทศครั้งที่ {{ appointment.round }}</p>
          <h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ company?.name ?? appointment.companyId }}</h2>
          <p class="mt-1 text-sm leading-6 text-muted">{{ company?.branch }} · {{ company?.province }} · {{ group?.name }}</p>
        </div>
        <UiBadge :tone="supervisionAppointmentStatusMeta[appointment.status].tone">{{ supervisionAppointmentStatusMeta[appointment.status].label }}</UiBadge>
      </header>

      <UiAlert v-if="!canManage" class="mb-6" tone="warning" title="ดูรายละเอียดได้ แต่ยังบันทึกผลไม่ได้">เฉพาะอาจารย์ในกลุ่มที่รับผิดชอบหรือมีชื่อในรายการนิเทศเท่านั้นที่บันทึกผลการนิเทศได้</UiAlert>
      <UiAlert v-else-if="appointment.status === 'completed'" class="mb-6" tone="info" title="บันทึกข้อมูลการนิเทศแล้ว" />
      <UiAlert v-else-if="isCancelled" class="mb-6" tone="warning" title="รายการนี้ถูกยกเลิก">ไม่สามารถแก้ไขข้อมูลหรือทำแบบประเมินของรายการที่ยกเลิกแล้วได้</UiAlert>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <div class="space-y-6">
          <UiCard>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h3 class="text-lg font-bold text-ink">วันและอาจารย์ผู้เข้าร่วม</h3>
              <CalendarClock :size="22" class="text-primary" aria-hidden="true" />
            </div>
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div class="min-w-0">
                <UiInput v-model="scheduleForm.date" type="date" label="วันที่นิเทศ" required :disabled="!canManage || isLocked" :error="scheduleErrors.date" />
              </div>
              <div class="min-w-0">
                <UiSelect v-model="scheduleForm.period" :options="periodOptions" label="ช่วงเวลา" required :disabled="!canManage || isLocked" :error="scheduleErrors.period" />
              </div>
            </div>
            <div class="mt-5">
              <div class="flex items-center justify-between gap-3"><h4 class="text-sm font-bold text-ink">อาจารย์ที่วางแผนเข้าร่วม</h4><UiBadge tone="info">{{ scheduleForm.lecturerIds.length }} คน</UiBadge></div>
              <div class="mt-3 divide-y divide-divider overflow-hidden rounded-control border border-divider">
                <label v-for="lecturer in lecturers" :key="lecturer.id" class="flex min-h-14 items-center gap-3 px-4 py-2" :class="canManage && !isLocked ? 'cursor-pointer hover:bg-surface' : ''">
                  <UiCheckbox :model-value="scheduleForm.lecturerIds.includes(getPersonAccountId(lecturer))" :label="`เลือก ${getPersonFullName(lecturer)}`" :disabled="!canManage || isLocked" @update:model-value="toggleLecturer(getPersonAccountId(lecturer), $event)" />
                  <span class="min-w-0 text-sm"><span class="font-semibold text-ink">{{ getPersonFullName(lecturer) }}</span><span class="ml-2 text-muted">{{ lecturer.id }}</span></span>
                </label>
              </div>
              <p v-if="scheduleErrors.lecturerIds" class="mt-2 text-xs font-medium text-danger">{{ scheduleErrors.lecturerIds }}</p>
            </div>
          </UiCard>

          <UiCard>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h3 class="text-lg font-bold text-ink">ผลการนิเทศ</h3>
            </div>
            <div class="mt-5 space-y-5">
              <div class="[&>textarea]:min-h-32">
                <UiTextarea v-model="resultForm.summary" label="สรุปผลการนิเทศ" help="ไม่บังคับกรอก สามารถบันทึกผลการนิเทศโดยเว้นช่องนี้ไว้ได้" :disabled="!canManage || isCancelled" placeholder="สรุปการปฏิบัติงานและสิ่งที่พบจากการนิเทศ" />
              </div>
              <div class="grid gap-5 lg:grid-cols-2">
                <div class="min-w-0 [&>textarea]:min-h-32">
                  <UiTextarea v-model="resultForm.issues" label="ปัญหาที่พบ" :disabled="!canManage || isCancelled" placeholder="ระบุปัญหาของนักศึกษา งาน หรือการประสานงาน" />
                </div>
                <div class="min-w-0 [&>textarea]:min-h-32">
                  <UiTextarea v-model="resultForm.suggestions" label="ข้อเสนอแนะและเรื่องที่ต้องติดตาม" :disabled="!canManage || isCancelled" placeholder="ระบุคำแนะนำหรือสิ่งที่ต้องติดตามครั้งถัดไป" />
                </div>
              </div>
              <div class="[&>textarea]:min-h-32">
                <UiTextarea v-model="resultForm.companyRequirements" label="ความต้องการของสถานประกอบการ" :disabled="!canManage || isCancelled" placeholder="เช่น ทักษะที่ต้องการ จำนวนที่รับ หรือความร่วมมือในรอบถัดไป" />
              </div>
            </div>

            <div v-if="appointment.status === 'completed'" class="mt-5 rounded-control border border-divider bg-surface p-4">
              <p class="text-xs font-medium text-muted">อาจารย์ที่เข้าร่วมนิเทศจริง</p>
              <p class="mt-1 text-sm font-semibold text-ink">{{ appointment.result.actualLecturerIds.map(lecturerName).join(', ') }}</p>
              <p v-if="appointment.result.completedAt" class="mt-2 text-xs text-muted">บันทึกเมื่อ {{ formatDateTime(appointment.result.completedAt) }}</p>
            </div>
            <div v-if="canManage && !isCancelled" class="mt-5 flex flex-col gap-3 border-t border-divider pt-5 sm:flex-row sm:items-center sm:justify-end">
              <p v-if="resultError" class="text-sm font-medium text-danger sm:mr-auto">{{ resultError }}</p>
              <UiButton :loading="isSavingResult" @click="saveSupervisionResult">{{ appointment.status === 'completed' ? 'บันทึกการแก้ไขผล' : 'ยืนยันนิเทศเสร็จแล้ว' }}</UiButton>
            </div>
          </UiCard>
        </div>

        <aside class="space-y-6 xl:sticky xl:top-28 xl:self-start">
          <UiCard>
            <h3 class="text-lg font-bold text-ink">ข้อมูลสถานประกอบการ</h3>
            <dl v-if="company" class="mt-5 space-y-4 text-sm">
              <div><dt class="text-xs text-muted">สาขา / พื้นที่</dt><dd class="mt-1 font-semibold text-ink">{{ company.branch }} · {{ company.province }}</dd></div>
              <div><dt class="text-xs text-muted">ผู้ประสานงาน</dt><dd class="mt-1 text-ink">{{ company.contactName }} · {{ company.contactPhone }}</dd></div>
              <div><dt class="text-xs text-muted">ที่อยู่</dt><dd class="mt-1 leading-6 text-ink">{{ company.address }}</dd></div>
            </dl>
          </UiCard>

          <UiCard :padded="false">
            <div class="flex items-center justify-between gap-3 border-b border-divider p-5"><h3 class="text-lg font-bold text-ink">นักศึกษาในรายการ</h3><UiBadge tone="info">{{ students.length }} คน</UiBadge></div>
            <div class="divide-y divide-divider">
              <article v-for="student in students" :key="student.id" class="p-5">
                <p class="font-semibold text-ink">{{ student.studentName }}</p>
                <p class="mt-1 text-xs text-muted">{{ student.studentId }}</p>
                <p class="mt-2 text-sm text-muted">{{ student.position }}</p>
              </article>
            </div>
          </UiCard>
        </aside>
      </div>
    </template>
  </div>
</template>
