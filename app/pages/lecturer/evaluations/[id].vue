<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'

definePageMeta({ title: 'แบบประเมินการนิเทศ', middleware: 'lecturer-prototype' })

const route = useRoute()
const { scenario } = useScenario()
const { people } = usePeopleDirectory()
const { groups, getCompanies } = useSupervisionGroups()
const { currentAccount } = useAuthPrototype()
const { appointments, loadPersistedAppointment } = useSupervisionAppointments()
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
const evaluatorIds = computed(() => appointment.value?.result.actualLecturerIds.length ? appointment.value.result.actualLecturerIds : appointment.value?.lecturerIds ?? [])
const evaluationType = computed(() => route.query.type === 'company' ? 'company' : 'student')
const selectedStudentId = computed(() => typeof route.query.student === 'string' ? route.query.student : undefined)
const selectedStudentValid = computed(() => !selectedStudentId.value || Boolean(appointment.value?.studentIds.includes(selectedStudentId.value)))
const students = computed(() => company.value?.students.filter(student => appointment.value?.studentIds.includes(student.studentId)
  && (!selectedStudentId.value || student.studentId === selectedStudentId.value)) ?? [])
const pageTitle = computed(() => evaluationType.value === 'company' ? 'ประเมินสถานประกอบการ' : 'ประเมินนักศึกษา')
const canManage = computed(() => Boolean(appointment.value?.status === 'completed'
  && selectedStudentValid.value
  && (evaluationType.value === 'company' ? evaluatorIds.value[0] === currentLecturerId.value : evaluatorIds.value.includes(currentLecturerId.value))))
const appointmentLoading = ref(true)
const appointmentLoadError = ref(false)
const effectiveViewState = computed(() => scenario.value.forceError || appointmentLoadError.value
  ? 'error'
  : appointmentLoading.value ? 'loading' : scenario.value.viewState)
const backPath = computed(() => ({ path: '/lecturer/evaluations', query: { type: evaluationType.value } }))

const lecturerName = (id: string) => {
  const lecturer = people.value.find(person => person.type === 'lecturer' && (person.id === id || person.accountId === id))
  return lecturer ? getPersonFullName(lecturer) : id
}
const loadAppointment = async () => {
  appointmentLoading.value = true
  appointmentLoadError.value = false
  try { await loadPersistedAppointment(appointmentId.value) }
  catch { if (!(import.meta.dev && appointment.value)) appointmentLoadError.value = true }
  finally { appointmentLoading.value = false }
}
const retry = () => { scenario.value.forceError = false; scenario.value.viewState = 'data'; void loadAppointment() }
onMounted(loadAppointment)
watch(appointmentId, loadAppointment)

watch([appointment, pageTitle], ([value]) => {
  if (value) useHead({ title: `${value.id} · ${pageTitle.value}` })
}, { immediate: true })
</script>

<template>
  <div>
    <button type="button" class="mb-4 inline-flex min-h-10 items-center gap-2 rounded-control px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-ink" @click="navigateTo(backPath)"><ArrowLeft :size="18" aria-hidden="true" />กลับไปหน้า{{ pageTitle }}</button>
    <div v-if="effectiveViewState === 'loading'" class="space-y-5" aria-label="กำลังโหลดแบบประเมิน"><UiSkeleton class="h-24" /><UiSkeleton class="h-96" /></div>
    <AppErrorState v-else-if="effectiveViewState === 'error'" title="โหลดแบบประเมินไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง" @retry="retry" />
    <AppEmptyState v-else-if="!appointment" title="ไม่พบรายการประเมิน" description="รายการนี้อาจถูกย้ายหรือไม่มีอยู่ในข้อมูลตัวอย่าง"><UiButton variant="secondary" @click="navigateTo(backPath)">กลับไปหน้า{{ pageTitle }}</UiButton></AppEmptyState>
    <template v-else>
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p class="text-sm font-semibold text-primary">{{ appointment.id }} · นิเทศครั้งที่ {{ appointment.round }}</p><h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ pageTitle }}</h2><p class="mt-1 text-sm leading-6 text-muted">{{ company?.name ?? appointment.companyId }} · {{ group?.name }}</p></div><UiBadge :tone="canManage ? 'success' : 'warning'">{{ canManage ? 'พร้อมประเมิน' : 'ยังไม่พร้อมประเมิน' }}</UiBadge></header>
      <UiAlert v-if="appointment.status !== 'completed'" class="mb-6" tone="warning" title="ประเมินได้หลังนิเทศเสร็จ">กลับไปที่ตารางนิเทศและยืนยันผลการนิเทศก่อนเริ่มทำแบบประเมิน</UiAlert>
      <UiAlert v-else-if="evaluationType === 'student' && !selectedStudentValid" class="mb-6" tone="warning" title="ไม่พบนักศึกษาในรายการนิเทศนี้">กลับไปหน้าประเมินนักศึกษาแล้วเลือกรายการใหม่อีกครั้ง</UiAlert>
      <UiAlert v-else-if="!canManage" class="mb-6" tone="warning" title="ไม่มีสิทธิ์ทำแบบประเมินรายการนี้">เฉพาะอาจารย์ที่เข้าร่วมนิเทศจริงเท่านั้นที่ทำแบบประเมินได้</UiAlert>
      <div class="mb-6 grid gap-4 sm:grid-cols-3"><UiCard><p class="text-xs text-muted">สถานประกอบการ</p><p class="mt-1 font-semibold text-ink">{{ company?.name ?? appointment.companyId }}</p></UiCard><UiCard><p class="text-xs text-muted">นักศึกษา</p><p class="mt-1 font-semibold text-ink">{{ students.length }} คน</p></UiCard><UiCard><p class="text-xs text-muted">อาจารย์ที่เข้าร่วมจริง</p><p class="mt-1 font-semibold text-ink">{{ evaluatorIds.length }} คน</p></UiCard></div>
      <SupervisionEvaluationPanel v-if="appointment.status === 'completed' && selectedStudentValid" :appointment="appointment" :students="students" :current-lecturer-id="currentLecturerId" :lecturer-name="lecturerName" :can-manage="canManage" :student-only="evaluationType === 'student'" :company-only="evaluationType === 'company'" :initial-student-id="selectedStudentId" />
    </template>
  </div>
</template>
