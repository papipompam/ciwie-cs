<script setup lang="ts">
import { ClipboardCheck, Download, Eye } from '@lucide/vue'
import type { SupervisionAppointment } from '~/composables/useSupervisionAppointments'

definePageMeta({ title: 'การประเมิน', middleware: 'staff-prototype' })
useHead({ title: 'การประเมิน' })

const { cycleId, round } = useSupervisionContext()
const { appointments, loadPersistedAppointments } = useSupervisionAppointments()
const { getCompanies } = useSupervisionGroups()
const { currentAccount } = useAuthPrototype()
const { people, loadPersistedPeople } = usePeopleDirectory()
const { exportStudentEvaluations, exportCompanyEvaluations } = useEvaluationExport()
const { showToast } = useToast()
const loading = ref(true)
const loadError = ref(false)
const exportFormat = ref('xlsx')
const exportType = ref<'student' | 'company'>('student')
const exporting = ref(false)
const exportError = ref('')
const evaluationType = ref<'student' | 'company'>('student')
const selectedAppointment = ref<SupervisionAppointment | null>(null)
const selectedStudentId = ref('')
const companies = computed(() => getCompanies(cycleId.value))
const completedAppointments = computed(() => appointments.value
  .filter(item => item.cycleId === cycleId.value && item.round === round.value && item.status === 'completed')
  .toSorted((a, b) => b.date.localeCompare(a.date)))
const companyName = (appointment: SupervisionAppointment) => companies.value.find(company => company.id === appointment.companyId)?.name
  ?? appointment.display?.companyName
  ?? appointment.companyId
const evaluatorName = (id: string) => {
  const person = people.value.find(item => item.id === id)
  return person ? `${person.prefix}${person.firstName} ${person.lastName}` : id
}
const appointmentStudents = (appointment: SupervisionAppointment) => appointment.studentIds.map((studentId) => {
  const student = companies.value.find(company => company.id === appointment.companyId)?.students.find(item => item.studentId === studentId)
  if (student) return { id: student.id, studentId, studentName: student.studentName, position: student.position }
  const displayStudent = appointment.display?.students.find(item => item.id === studentId)
  return displayStudent
    ? { id: displayStudent.id, studentId, studentName: displayStudent.name, position: displayStudent.position }
    : { id: studentId, studentId, studentName: studentId, position: 'ไม่ระบุตำแหน่ง' }
})
const studentRows = computed(() => completedAppointments.value.flatMap(appointment => appointmentStudents(appointment).map(student => ({ appointment, student }))))
const formatDate = (date: string) => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  .format(new Date(`${date}T00:00:00+07:00`))
const loadAppointments = async () => {
  if (!cycleId.value) { loading.value = false; loadError.value = false; return }
  loading.value = true
  loadError.value = false
  try { await Promise.all([loadPersistedAppointments(cycleId.value, round.value), loadPersistedPeople('lecturer')]) }
  catch { loadError.value = true }
  finally { loading.value = false }
}
const openDetails = (appointment: SupervisionAppointment) => {
  selectedAppointment.value = appointment
  selectedStudentId.value = ''
}
const openStudentDetails = (appointment: SupervisionAppointment, studentId: string) => {
  selectedAppointment.value = appointment
  selectedStudentId.value = studentId
}
const handleExport = async () => {
  if (exporting.value) return
  exporting.value = true
  exportError.value = ''
  try {
    const count = exportType.value === 'student'
      ? await exportStudentEvaluations(completedAppointments.value, exportFormat.value)
      : await exportCompanyEvaluations(completedAppointments.value, exportFormat.value)
    showToast({ title: 'ส่งออกคะแนนแล้ว', description: `${count} รายการ · ${exportFormat.value.toUpperCase()}` })
  } catch (cause) {
    exportError.value = cause instanceof Error ? cause.message : 'ส่งออกคะแนนไม่สำเร็จ กรุณาลองใหม่'
  } finally {
    exporting.value = false
  }
}
onMounted(loadAppointments)
watch([cycleId, round], loadAppointments)
</script>

<template>
  <div>
    <div class="mb-6">
      <h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">การประเมิน</h2>
      <p class="mt-1 text-sm leading-6 text-muted">ตรวจสอบผลประเมินนักศึกษาและสถานประกอบการของรายการนิเทศที่เสร็จสิ้นแล้ว</p>
      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap gap-2" role="group" aria-label="เลือกประเภทผลประเมิน">
          <UiButton :variant="evaluationType === 'student' ? 'primary' : 'secondary'" @click="evaluationType = 'student'">ดูผลประเมินนักศึกษา</UiButton>
          <UiButton :variant="evaluationType === 'company' ? 'primary' : 'secondary'" @click="evaluationType = 'company'">ดูผลประเมินสถานประกอบการ</UiButton>
        </div>
        <UiDialog :close-on-confirm="false" :title="`ส่งออกคะแนนประเมิน${exportType === 'student' ? 'นักศึกษา' : 'สถานประกอบการ'}`" description="ส่งออกเฉพาะผลประเมินที่ส่งแล้วในรอบและครั้งที่นิเทศที่เลือก">
          <template #trigger><UiButton variant="secondary" :icon="Download" :disabled="!completedAppointments.length">ส่งออกคะแนน</UiButton></template>
          <UiSelect v-model="exportType" :options="[{ value: 'student', label: 'ผลประเมินนักศึกษา' }, { value: 'company', label: 'ผลประเมินสถานประกอบการ' }]" label="ข้อมูลที่ต้องการส่งออก" />
          <UiSelect v-model="exportFormat" :options="[{ value: 'xlsx', label: 'Excel (.xlsx)' }, { value: 'csv', label: 'CSV (.csv)' }]" label="รูปแบบไฟล์" />
          <p v-if="exportError" role="alert" class="mt-3 text-sm text-danger">{{ exportError }}</p>
          <template #cancel><UiButton variant="ghost">ปิด</UiButton></template>
          <template #confirm><UiButton :icon="Download" :loading="exporting" @click="handleExport">ดาวน์โหลดคะแนน</UiButton></template>
        </UiDialog>
      </div>
    </div>

    <UiSkeleton v-if="loading" class="h-52" aria-label="กำลังโหลดรายการประเมิน" />
    <UiAlert v-else-if="loadError" tone="danger" title="โหลดรายการประเมินไม่สำเร็จ"><UiButton class="mt-3" size="sm" variant="secondary" @click="loadAppointments">ลองใหม่</UiButton></UiAlert>
    <AppEmptyState v-else-if="!cycleId" :icon="ClipboardCheck" title="ยังไม่ได้เลือกรอบสหกิจศึกษา" description="เลือกรอบสหกิจศึกษาและครั้งที่นิเทศจากแถบด้านบนเพื่อดูผลประเมิน" />
    <AppEmptyState v-else-if="!completedAppointments.length" :icon="ClipboardCheck" title="ยังไม่มีผลประเมิน" description="ผลประเมินจะแสดงเมื่อรายการนิเทศเสร็จสิ้นแล้ว" />
    <UiCard v-else :padded="false">
      <div v-if="evaluationType === 'student'" class="divide-y divide-divider">
        <article v-for="{ appointment, student } in studentRows" :key="`${appointment.id}-${student.studentId}`" class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div class="min-w-0">
            <p class="font-semibold text-ink">{{ student.studentName }}</p>
            <p class="mt-1 text-sm text-muted">{{ companyName(appointment) }} · {{ appointment.appointmentNo }} · {{ formatDate(appointment.date) }}</p>
          </div>
          <UiButton class="shrink-0" size="sm" variant="secondary" :icon="Eye" @click="openStudentDetails(appointment, student.studentId)">ดูผลประเมิน</UiButton>
        </article>
      </div>
      <div v-else class="divide-y divide-divider">
        <article v-for="appointment in completedAppointments" :key="appointment.id" class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div class="min-w-0">
            <p class="font-semibold text-ink">{{ companyName(appointment) }}</p>
            <p class="mt-1 text-sm text-muted">{{ appointment.appointmentNo }} · {{ formatDate(appointment.date) }} · นักศึกษา {{ appointment.studentIds.length }} คน</p>
          </div>
          <UiButton class="shrink-0" size="sm" variant="secondary" :icon="Eye" @click="openDetails(appointment)">ดูผลประเมิน</UiButton>
        </article>
      </div>
    </UiCard>

    <SupervisionEvaluationPanel
      v-if="selectedAppointment"
      :appointment="selectedAppointment"
      :students="selectedStudentId ? appointmentStudents(selectedAppointment).filter(student => student.studentId === selectedStudentId) : appointmentStudents(selectedAppointment)"
      :current-lecturer-id="currentAccount?.id ?? ''"
      :lecturer-name="evaluatorName"
      :can-manage="false"
      read-only
      dialog-only
      :student-only="evaluationType === 'student'"
      :company-only="evaluationType === 'company'"
      :initial-student-id="selectedStudentId || undefined"
      :initial-company-open="evaluationType === 'company'"
      @student-dialog-close="selectedAppointment = null"
      @company-dialog-close="selectedAppointment = null"
    />
  </div>
</template>
