<script setup lang="ts">
import { Building2, Check, Eye, Pencil, Save } from '@lucide/vue'
import { z } from 'zod'
import type { SupervisionAppointment } from '~/composables/useSupervisionAppointments'
import type { CompanyEvaluationInput, CompanyRecommendation, EvaluationRating, StudentEvaluationInput } from '~/composables/useSupervisionEvaluations'

interface StudentSummary {
  id: string
  studentId: string
  studentName: string
  position: string
}

interface Props {
  appointment: SupervisionAppointment
  students: StudentSummary[]
  currentLecturerId: string
  lecturerName: (id: string) => string
  canManage: boolean
  companyOnly?: boolean
  studentOnly?: boolean
  initialStudentId?: string
  initialCompanyOpen?: boolean
  dialogOnly?: boolean
  allowCompanyEvaluation?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  companyDialogClose: []
}>()
const { showToast } = useToast()
const {
  studentEvaluations,
  companyEvaluations,
  getStudentEvaluation,
  persistStudentEvaluation,
  getCompanyEvaluation,
  persistCompanyEvaluation,
  loadPersistedEvaluations,
} = useSupervisionEvaluations()

const ratingSchema = z.enum(['1', '2', '3', '4', '5'])
const studentSubmitSchema = z.object({
  ratings: z.record(z.string(), ratingSchema).refine(
    ratings => studentEvaluationCriteria.every(criterion => Boolean(ratings[criterion.id])),
    'กรุณาประเมินนักศึกษาให้ครบทุกหัวข้อ',
  ),
  strengths: z.string(),
  issues: z.string(),
  suggestions: z.string(),
  followUp: z.string(),
})
const companySubmitSchema = z.object({
  ratings: z.record(z.string(), ratingSchema).refine(
    ratings => companyEvaluationCriteria.every(criterion => Boolean(ratings[criterion.id])),
    'กรุณาประเมินสถานประกอบการให้ครบทุกหัวข้อ',
  ),
  recommendation: z.union([z.literal(''), z.enum(['recommended', 'conditional', 'follow_up', 'not_recommended', 'safety_risk'])]),
  observations: z.string(),
  companyRequirements: z.string(),
  issues: z.string(),
  suggestions: z.string(),
})

const studentDialogOpen = ref(false)
const companyDialogOpen = ref(false)
const selectedStudentId = ref('')
const studentReviewing = ref(false)
const companyReviewing = ref(false)
const isSaving = ref(false)
const saveAllError = ref('')
const companyDialogError = ref('')
const evaluationsLoading = ref(true)
const evaluationsLoadError = ref('')
const stagedStudentEvaluations = ref<Record<string, StudentEvaluationInput>>({})
const stagedCompanyEvaluation = ref<CompanyEvaluationInput | null>(null)
const studentForm = reactive({
  ratings: {} as Record<string, string>,
  strengths: '',
  issues: '',
  suggestions: '',
  followUp: '',
})
const companyForm = reactive({
  ratings: {} as Record<string, string>,
  recommendation: '',
  observations: '',
  companyRequirements: '',
  issues: '',
  suggestions: '',
})

const evaluatorLecturerIds = computed(() => props.appointment.result.actualLecturerIds.length
  ? props.appointment.result.actualLecturerIds
  : props.appointment.lecturerIds)
const companyEvaluation = computed(() => getCompanyEvaluation(props.appointment.id))
const isParticipant = computed(() => props.allowCompanyEvaluation || evaluatorLecturerIds.value.includes(props.currentLecturerId))
const companyEvaluatorId = computed(() => companyEvaluation.value?.evaluatorId
  ?? (props.allowCompanyEvaluation ? props.currentLecturerId : evaluatorLecturerIds.value[0] ?? ''))
const isCompanyEvaluator = computed(() => Boolean(props.allowCompanyEvaluation || companyEvaluatorId.value === props.currentLecturerId))
const selectedStudent = computed(() => props.students.find(student => student.studentId === selectedStudentId.value) ?? null)
const selectedStudentEvaluation = computed(() => selectedStudentId.value
  ? getStudentEvaluation(props.appointment.id, selectedStudentId.value, props.currentLecturerId)
  : null)
const currentStudentSubmitted = computed(() => props.students.filter(student => getStudentEvaluation(
  props.appointment.id,
  student.studentId,
  props.currentLecturerId,
)?.status === 'submitted').length)
const currentRequiredCount = computed(() => props.companyOnly ? 1 : props.students.length + (!props.studentOnly && isCompanyEvaluator.value ? 1 : 0))
const currentSubmittedCount = computed(() => (props.companyOnly ? 0 : currentStudentSubmitted.value) + (!props.studentOnly && isCompanyEvaluator.value && companyEvaluation.value?.status === 'submitted' ? 1 : 0))
const totalRequiredCount = computed(() => props.companyOnly ? 1 : evaluatorLecturerIds.value.length * props.students.length + (props.studentOnly ? 0 : 1))
const totalSubmittedCount = computed(() => (props.companyOnly ? 0 : studentEvaluations.value.filter(evaluation => evaluation.appointmentId === props.appointment.id
  && evaluatorLecturerIds.value.includes(evaluation.lecturerId)
  && props.students.some(student => student.studentId === evaluation.studentId)
  && evaluation.status === 'submitted').length) + (!props.studentOnly && companyEvaluations.value.some(evaluation => evaluation.appointmentId === props.appointment.id && evaluation.status === 'submitted') ? 1 : 0))
const evaluationComplete = computed(() => totalSubmittedCount.value === totalRequiredCount.value)
const selectedStudentLocked = computed(() => selectedStudentEvaluation.value?.status === 'submitted')
const companyLocked = computed(() => companyEvaluation.value?.status === 'submitted')
const isStudentStaged = (studentId: string) => Boolean(stagedStudentEvaluations.value[studentId])
const hasStudentDraftContent = () => Object.keys(studentForm.ratings).length > 0
  || [studentForm.strengths, studentForm.issues, studentForm.suggestions, studentForm.followUp].some(value => value.trim())
const hasCompanyDraftContent = () => Object.keys(companyForm.ratings).length > 0
  || Boolean(companyForm.recommendation)
  || [companyForm.observations, companyForm.companyRequirements, companyForm.issues, companyForm.suggestions].some(value => value.trim())
const ratingLabel = (value: string) => evaluationRatingOptions.find(option => option.value === value)?.label ?? 'ยังไม่ได้ประเมิน'
const ratingShortLabel = (value: string) => evaluationRatingOptions.find(option => option.value === value)?.shortLabel ?? ''
const ratingScaleDescription = evaluationRatingOptions.map(option => option.label.replace(' · ', ' = ')).join(' · ')
const validRatings = (ratings: Record<string, string>) => Object.fromEntries(Object.entries(ratings)
  .filter((entry): entry is [string, EvaluationRating] => ratingSchema.safeParse(entry[1]).success))

const resetStudentForm = () => {
  Object.assign(studentForm, { ratings: {}, strengths: '', issues: '', suggestions: '', followUp: '' })
}
const resetCompanyForm = () => {
  Object.assign(companyForm, { ratings: {}, recommendation: '', observations: '', companyRequirements: '', issues: '', suggestions: '' })
}
const studentEvaluationInput = (studentId: string) => {
  const staged = stagedStudentEvaluations.value[studentId]
  if (staged) {
    return {
      ratings: { ...staged.ratings },
      strengths: staged.strengths,
      issues: staged.issues,
      suggestions: staged.suggestions,
      followUp: staged.followUp,
    }
  }
  const saved = getStudentEvaluation(props.appointment.id, studentId, props.currentLecturerId)
  if (!saved) return null
  return {
    ratings: { ...saved.ratings },
    strengths: saved.strengths,
    issues: saved.issues,
    suggestions: saved.suggestions,
    followUp: saved.followUp,
  }
}
const openStudentEvaluation = (studentId: string) => {
  selectedStudentId.value = studentId
  studentReviewing.value = false
  resetStudentForm()
  const evaluation = getStudentEvaluation(props.appointment.id, studentId, props.currentLecturerId)
  const input = studentEvaluationInput(studentId)
  if (input) Object.assign(studentForm, input)
  if (evaluation?.status === 'submitted') studentReviewing.value = true
  studentDialogOpen.value = true
}
watch(() => props.initialStudentId, (studentId) => {
  if (!evaluationsLoading.value && props.studentOnly && studentId && props.students.some(student => student.studentId === studentId)) {
    openStudentEvaluation(studentId)
  }
}, { immediate: true })
const openCompanyEvaluation = () => {
  companyDialogError.value = ''
  companyReviewing.value = false
  resetCompanyForm()
  const input = stagedCompanyEvaluation.value ?? companyEvaluation.value
  if (input) {
    Object.assign(companyForm, {
      ratings: { ...input.ratings },
      recommendation: input.recommendation,
      observations: input.observations,
      companyRequirements: input.companyRequirements,
      issues: input.issues,
      suggestions: input.suggestions,
    })
  }
  if (companyEvaluation.value?.status === 'submitted') companyReviewing.value = true
  companyDialogOpen.value = true
}
watch(() => props.initialCompanyOpen, (open) => {
  if (!evaluationsLoading.value && props.companyOnly && open) openCompanyEvaluation()
}, { immediate: true })
const hydrateEvaluations = async () => {
  evaluationsLoading.value = true
  evaluationsLoadError.value = ''
  try {
    await loadPersistedEvaluations(props.appointment.id)
  } catch (error) {
    const status = (error as { statusCode?: number, response?: { status?: number } }).statusCode
      ?? (error as { response?: { status?: number } }).response?.status
    if (status !== 404) evaluationsLoadError.value = 'โหลดผลประเมินที่บันทึกไว้ไม่สำเร็จ'
  } finally {
    evaluationsLoading.value = false
  }
}
onMounted(async () => {
  await hydrateEvaluations()
  if (props.studentOnly && props.initialStudentId && props.students.some(student => student.studentId === props.initialStudentId)) {
    openStudentEvaluation(props.initialStudentId)
  }
  if (props.companyOnly && props.initialCompanyOpen) openCompanyEvaluation()
})
const studentDraftInput = (): StudentEvaluationInput => ({
  ratings: validRatings(studentForm.ratings),
  strengths: studentForm.strengths,
  issues: studentForm.issues,
  suggestions: studentForm.suggestions,
  followUp: studentForm.followUp,
})
const companyDraftInput = (): CompanyEvaluationInput => ({
  ratings: validRatings(companyForm.ratings),
  recommendation: companyForm.recommendation as CompanyRecommendation | '',
  observations: companyForm.observations,
  companyRequirements: companyForm.companyRequirements,
  issues: companyForm.issues,
  suggestions: companyForm.suggestions,
})
const setStudentDialogOpen = (open: boolean) => {
  studentDialogOpen.value = open
  if (!open && selectedStudent.value && !selectedStudentLocked.value && hasStudentDraftContent()) {
    stagedStudentEvaluations.value = {
      ...stagedStudentEvaluations.value,
      [selectedStudent.value.studentId]: studentDraftInput(),
    }
  }
}
const setCompanyDialogOpen = async (open: boolean) => {
  companyDialogOpen.value = open
  if (!open && isCompanyEvaluator.value && !companyLocked.value && hasCompanyDraftContent()) {
    stagedCompanyEvaluation.value = companyDraftInput()
    if (props.dialogOnly) {
      try {
        await persistCompanyEvaluation(props.appointment.id, props.currentLecturerId, stagedCompanyEvaluation.value, 'draft')
      } catch {
        showToast({ title: 'บันทึกฉบับร่างไม่สำเร็จ', description: 'กรุณาเปิดแบบประเมินและลองบันทึกอีกครั้ง' })
      }
    }
  }
  if (!open && props.dialogOnly) emit('companyDialogClose')
}
const submitCompanyDialog = async () => {
  if (isSaving.value || !props.canManage) return
  companyDialogError.value = ''
  const parsed = companySubmitSchema.safeParse(companyDraftInput())
  if (!parsed.success) {
    companyDialogError.value = parsed.error.issues[0]?.message ?? 'กรุณากรอกแบบประเมินสถานประกอบการให้ครบ'
    return
  }
  isSaving.value = true
  try {
    await persistCompanyEvaluation(props.appointment.id, props.currentLecturerId, parsed.data, 'submitted')
    showToast({ title: 'บันทึกแบบประเมินสถานประกอบการแล้ว', description: 'คะแนนและความคิดเห็นถูกบันทึกเรียบร้อยแล้ว' })
    companyDialogOpen.value = false
    emit('companyDialogClose')
  } catch {
    showToast({ title: 'บันทึกข้อมูลไม่สำเร็จ', description: 'กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง' })
  } finally {
    isSaving.value = false
  }
}
const submitAllEvaluations = async () => {
  if (isSaving.value || !props.canManage) return
  saveAllError.value = ''
  const pendingStudents = (props.companyOnly ? [] : props.students).filter(student => getStudentEvaluation(
    props.appointment.id,
    student.studentId,
    props.currentLecturerId,
  )?.status !== 'submitted')
  const parsedStudents = pendingStudents.map((student) => {
    const input = studentEvaluationInput(student.studentId)
    const parsed = studentSubmitSchema.safeParse(input)
    return { student, parsed }
  })
  const invalidStudent = parsedStudents.find(item => !item.parsed.success)
  if (invalidStudent) {
    saveAllError.value = `กรุณากรอกแบบประเมินของ ${invalidStudent.student.studentName} ให้ครบทุกหัวข้อ`
    return
  }

  const shouldSubmitCompany = !props.studentOnly && isCompanyEvaluator.value && companyEvaluation.value?.status !== 'submitted'
  const parsedCompany = shouldSubmitCompany ? companySubmitSchema.safeParse(stagedCompanyEvaluation.value ?? companyEvaluation.value) : null
  if (parsedCompany && !parsedCompany.success) {
    saveAllError.value = parsedCompany.error.issues[0]?.message ?? 'กรุณากรอกแบบประเมินสถานประกอบการให้ครบ'
    return
  }

  isSaving.value = true
  try {
    for (const { student, parsed } of parsedStudents) {
      if (parsed.success) await persistStudentEvaluation(props.appointment.id, student.studentId, props.currentLecturerId, parsed.data, 'submitted')
    }
    if (parsedCompany?.success) await persistCompanyEvaluation(props.appointment.id, props.currentLecturerId, parsedCompany.data, 'submitted')
    stagedStudentEvaluations.value = {}
    stagedCompanyEvaluation.value = null
    showToast({
      title: props.companyOnly ? 'บันทึกแบบประเมินสถานประกอบการแล้ว' : props.studentOnly ? 'บันทึกแบบประเมินนักศึกษาแล้ว' : 'บันทึกแบบประเมินทั้งหมดแล้ว',
      description: props.companyOnly ? 'คะแนนและความคิดเห็นถูกบันทึกเรียบร้อยแล้ว' : props.studentOnly ? 'แบบประเมินนักศึกษาถูกบันทึกเรียบร้อยแล้ว' : 'แบบประเมินนักศึกษาและสถานประกอบการถูกบันทึกเรียบร้อยแล้ว',
    })
  } catch {
    showToast({ title: 'บันทึกข้อมูลไม่สำเร็จ', description: 'กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง' })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <UiSkeleton v-if="evaluationsLoading && !dialogOnly" class="mb-4 h-16" aria-label="กำลังโหลดผลประเมินที่บันทึกไว้" />
    <UiAlert v-else-if="evaluationsLoadError" class="mb-4" tone="danger" :title="evaluationsLoadError">
      <UiButton class="mt-3" size="sm" variant="secondary" @click="hydrateEvaluations">ลองใหม่</UiButton>
    </UiAlert>
    <UiCard v-if="!dialogOnly" :padded="false">
    <div class="border-b border-divider p-5 sm:p-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 class="text-lg font-bold text-ink">{{ companyOnly ? 'แบบประเมินสถานประกอบการ' : studentOnly ? 'แบบประเมินนักศึกษา' : 'แบบประเมิน' }}</h3>
        </div>
        <UiBadge :tone="evaluationComplete ? 'success' : totalSubmittedCount ? 'warning' : 'neutral'">
          {{ evaluationComplete ? 'ประเมินครบถ้วน' : totalSubmittedCount ? 'กำลังประเมิน' : 'ยังไม่เริ่มประเมิน' }}
        </UiBadge>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        <div class="rounded-control border border-divider bg-surface p-4">
          <p class="text-xs font-medium text-muted">{{ companyOnly ? 'สถานะการประเมิน' : 'งานประเมินของคุณ' }}</p>
          <p class="mt-1 text-xl font-bold text-ink">{{ currentSubmittedCount }} / {{ currentRequiredCount }}</p>
        </div>
        <div class="rounded-control border border-divider bg-surface p-4">
          <p class="text-xs font-medium text-muted">ความคืบหน้ารวมของรายการ</p>
          <p class="mt-1 text-xl font-bold text-ink">{{ totalSubmittedCount }} / {{ totalRequiredCount }}</p>
        </div>
      </div>
    </div>

    <UiAlert v-if="!isParticipant" class="m-5 sm:m-6" tone="warning" title="ไม่มีสิทธิ์ทำแบบประเมินรายการนี้">เฉพาะอาจารย์ที่มีชื่ออยู่ในรายการนิเทศเท่านั้นที่ทำแบบประเมินได้</UiAlert>

    <template v-else>
      <section v-if="!studentOnly" id="company-evaluation-panel" class="p-5 sm:p-6" aria-labelledby="company-evaluation-heading">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <div class="flex items-center gap-2"><Building2 :size="19" class="text-primary" aria-hidden="true" /><h4 id="company-evaluation-heading" class="font-bold text-ink">ประเมินสถานประกอบการร่วม</h4></div>
            <p class="mt-1 text-sm text-muted">ผู้ประเมิน: {{ lecturerName(companyEvaluatorId) }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <UiBadge :tone="companyEvaluation?.status === 'submitted' ? 'success' : stagedCompanyEvaluation || companyEvaluation ? 'warning' : 'neutral'">
              {{ companyEvaluation?.status === 'submitted' ? 'ส่งแล้ว' : stagedCompanyEvaluation ? 'กรอกแล้ว · รอบันทึก' : companyEvaluation ? 'ฉบับร่าง' : 'ยังไม่ประเมิน' }}
            </UiBadge>
            <UiButton v-if="isCompanyEvaluator || companyEvaluation?.status === 'submitted'" size="sm" :variant="companyEvaluation?.status === 'submitted' ? 'secondary' : 'primary'" :icon="companyEvaluation?.status === 'submitted' ? Eye : Building2" @click="openCompanyEvaluation">
              {{ companyEvaluation?.status === 'submitted' ? 'ดูผล' : 'ประเมิน' }}
            </UiButton>
          </div>
        </div>
        <UiAlert v-if="!isCompanyEvaluator && companyEvaluation?.status !== 'submitted'" class="mt-4" tone="info" title="ไม่ต้องกรอกแบบประเมินซ้ำ">รออาจารย์ผู้รับผิดชอบจัดทำแบบประเมินสถานประกอบการร่วม</UiAlert>
      </section>

      <section v-if="!companyOnly" id="student-evaluation-panel" class="p-5 sm:p-6" :class="{ 'border-t border-divider': !studentOnly }" aria-labelledby="student-evaluation-heading">
        <div class="flex items-start justify-between gap-3">
          <h4 id="student-evaluation-heading" class="font-bold text-ink">ประเมินนักศึกษารายบุคคล</h4>
          <UiBadge tone="info">{{ currentStudentSubmitted }} / {{ students.length }} คน</UiBadge>
        </div>
        <div class="mt-4 divide-y divide-divider overflow-hidden rounded-control border border-divider">
          <article v-for="student in students" :key="student.studentId" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <p class="font-semibold text-ink">{{ student.studentName }}</p>
              <p class="mt-1 text-xs text-muted">{{ student.studentId }} · {{ student.position }}</p>
            </div>
            <div class="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
              <UiBadge :tone="getStudentEvaluation(appointment.id, student.studentId, currentLecturerId)?.status === 'submitted' ? 'success' : isStudentStaged(student.studentId) || getStudentEvaluation(appointment.id, student.studentId, currentLecturerId) ? 'warning' : 'neutral'">
                {{ getStudentEvaluation(appointment.id, student.studentId, currentLecturerId)?.status === 'submitted' ? 'ส่งแล้ว' : isStudentStaged(student.studentId) ? 'กรอกแล้ว · รอบันทึก' : getStudentEvaluation(appointment.id, student.studentId, currentLecturerId) ? 'ฉบับร่าง' : 'ยังไม่ประเมิน' }}
              </UiBadge>
              <UiButton size="sm" :variant="getStudentEvaluation(appointment.id, student.studentId, currentLecturerId)?.status === 'submitted' ? 'secondary' : 'primary'" :icon="getStudentEvaluation(appointment.id, student.studentId, currentLecturerId)?.status === 'submitted' ? Eye : Pencil" @click="openStudentEvaluation(student.studentId)">
                {{ getStudentEvaluation(appointment.id, student.studentId, currentLecturerId)?.status === 'submitted' ? 'ดูผล' : 'ประเมิน' }}
              </UiButton>
            </div>
          </article>
        </div>
      </section>
    </template>
    </UiCard>

    <div v-if="canManage && !dialogOnly" class="mt-6 border-t border-divider pt-6">
      <form class="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-end" @submit.prevent="submitAllEvaluations">
        <p v-if="saveAllError" class="text-sm font-medium text-danger sm:mr-auto">{{ saveAllError }}</p>
        <UiButton type="submit" :icon="Save" :loading="isSaving">{{ companyOnly ? 'บันทึกแบบประเมินสถานประกอบการ' : studentOnly ? 'บันทึกแบบประเมินนักศึกษา' : 'บันทึกแบบประเมินทั้งหมด' }}</UiButton>
      </form>
    </div>

    <UiDialog :open="studentDialogOpen" size="xl" :title="`${selectedStudentLocked ? 'ผลประเมิน' : 'ประเมิน'} ${selectedStudent?.studentName ?? 'นักศึกษา'}`" @update:open="setStudentDialogOpen">
    <p class="mb-4 rounded-control border border-info/25 bg-info-soft px-4 py-3 text-sm leading-6 text-info"><span class="font-semibold">เกณฑ์การให้คะแนน 5 ระดับ:</span> {{ ratingScaleDescription }}</p>
    <template v-if="!studentReviewing">
      <fieldset>
        <legend class="text-sm font-semibold text-ink">คะแนนประเมินรายหัวข้อ <span class="text-danger" aria-hidden="true">*</span></legend>
        <div class="mt-3 overflow-x-auto rounded-control border border-divider">
          <table class="w-full min-w-[760px] border-collapse text-sm">
            <caption class="sr-only">ตารางเลือกคะแนนประเมินนักศึกษา</caption>
            <thead class="bg-surface text-muted">
              <tr>
                <th scope="col" class="min-w-64 px-4 py-3 text-left font-semibold">หัวข้อประเมิน</th>
                <th v-for="option in evaluationRatingOptions" :key="option.value" scope="col" class="w-20 px-2 py-3 text-center font-semibold" :title="option.label">
                  <span class="block text-ink">{{ option.value }}</span>
                  <span class="mt-0.5 block text-[10px] font-normal normal-case">{{ ratingShortLabel(option.value) }}</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-divider">
              <tr v-for="criterion in studentEvaluationCriteria" :key="criterion.id" class="hover:bg-surface/70">
                <th scope="row" class="px-4 py-3 text-left font-medium text-ink">{{ criterion.label }}</th>
                <td v-for="option in evaluationRatingOptions" :key="option.value" class="p-1.5 text-center">
                  <label class="mx-auto grid size-11 cursor-pointer place-items-center rounded-control border transition-colors" :class="studentForm.ratings[criterion.id] === option.value ? 'border-primary bg-warning-soft' : 'border-transparent hover:border-divider hover:bg-surface'">
                    <input
                      v-model="studentForm.ratings[criterion.id]"
                      type="radio"
                      :name="`student-rating-${criterion.id}`"
                      :value="option.value"
                      class="size-4 cursor-pointer accent-amber-500"
                    >
                    <span class="sr-only">{{ criterion.label }} {{ option.label }}</span>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </fieldset>
      <div class="mt-5">
        <div class="[&>textarea]:min-h-32"><UiTextarea v-model="studentForm.suggestions" label="ข้อเสนอแนะให้นักศึกษา" placeholder="แนวทางที่ช่วยให้นักศึกษาพัฒนาต่อ" /></div>
      </div>
      <div class="mt-6 flex justify-end"><UiButton :icon="Check" @click="setStudentDialogOpen(false)">เสร็จสิ้น</UiButton></div>
    </template>
    <template v-else>
      <UiAlert tone="success" title="ส่งแบบประเมินแล้ว">ไม่สามารถแก้ไขแบบประเมินที่ส่งแล้วได้</UiAlert>
      <div class="mt-5 overflow-hidden rounded-control border border-divider">
        <dl class="divide-y divide-divider text-sm">
          <div v-for="criterion in studentEvaluationCriteria" :key="criterion.id" class="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_14rem]"><dt class="text-muted">{{ criterion.label }}</dt><dd class="font-semibold text-ink sm:text-right">{{ ratingLabel(studentForm.ratings[criterion.id] ?? '') }}</dd></div>
        </dl>
      </div>
      <dl class="mt-5 text-sm">
        <div><dt class="font-semibold text-muted">ข้อเสนอแนะ</dt><dd class="mt-1 whitespace-pre-line text-ink">{{ studentForm.suggestions || '—' }}</dd></div>
      </dl>
    </template>
    </UiDialog>

    <UiDialog :open="companyDialogOpen" size="xl" :title="companyLocked ? 'ผลประเมินสถานประกอบการ' : 'ประเมินสถานประกอบการร่วม'" @update:open="setCompanyDialogOpen">
    <p class="mb-4 rounded-control border border-info/25 bg-info-soft px-4 py-3 text-sm leading-6 text-info"><span class="font-semibold">เกณฑ์การให้คะแนน 5 ระดับ:</span> {{ ratingScaleDescription }}</p>
    <template v-if="!companyReviewing">
      <fieldset>
        <legend class="text-sm font-semibold text-ink">คะแนนประเมินรายหัวข้อ <span class="text-danger" aria-hidden="true">*</span></legend>
        <div class="mt-3 overflow-x-auto rounded-control border border-divider">
          <table class="w-full min-w-[760px] border-collapse text-sm">
            <caption class="sr-only">ตารางเลือกคะแนนประเมินสถานประกอบการ</caption>
            <thead class="bg-surface text-muted">
              <tr>
                <th scope="col" class="min-w-64 px-4 py-3 text-left font-semibold">หัวข้อประเมิน</th>
                <th v-for="option in evaluationRatingOptions" :key="option.value" scope="col" class="w-20 px-2 py-3 text-center font-semibold" :title="option.label">
                  <span class="block text-ink">{{ option.value }}</span>
                  <span class="mt-0.5 block text-[10px] font-normal normal-case">{{ ratingShortLabel(option.value) }}</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-divider">
              <tr v-for="criterion in companyEvaluationCriteria" :key="criterion.id" class="hover:bg-surface/70">
                <th scope="row" class="px-4 py-3 text-left font-medium text-ink">{{ criterion.label }}</th>
                <td v-for="option in evaluationRatingOptions" :key="option.value" class="p-1.5 text-center">
                  <label class="mx-auto grid size-11 cursor-pointer place-items-center rounded-control border transition-colors" :class="companyForm.ratings[criterion.id] === option.value ? 'border-primary bg-warning-soft' : 'border-transparent hover:border-divider hover:bg-surface'">
                    <input v-model="companyForm.ratings[criterion.id]" type="radio" :name="`company-rating-${criterion.id}`" :value="option.value" class="size-4 cursor-pointer accent-amber-500">
                    <span class="sr-only">{{ criterion.label }} {{ option.label }}</span>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </fieldset>
      <div class="mt-5 grid gap-5 sm:grid-cols-2">
        <div class="[&>textarea]:min-h-32"><UiTextarea v-model="companyForm.companyRequirements" label="ความต้องการของสถานประกอบการ" placeholder="ทักษะ จำนวนรับ หรือความร่วมมือในอนาคต" /></div>
        <div class="[&>textarea]:min-h-32"><UiTextarea v-model="companyForm.suggestions" label="ข้อเสนอแนะเพิ่มเติม" placeholder="แนวทางปรับปรุงหรือเรื่องที่ควรติดตาม" /></div>
      </div>
      <div class="mt-6 flex flex-col items-end gap-3 border-t border-divider pt-5">
        <p v-if="companyDialogError" role="alert" aria-live="assertive" class="self-start text-sm font-medium text-danger">{{ companyDialogError }}</p>
        <UiButton v-if="dialogOnly" :icon="Save" :loading="isSaving" @click="submitCompanyDialog">บันทึกแบบประเมิน</UiButton>
        <UiButton v-else :icon="Check" @click="setCompanyDialogOpen(false)">เสร็จสิ้น</UiButton>
      </div>
    </template>
    <template v-else>
      <UiAlert tone="success" title="ส่งแบบประเมินแล้ว">ไม่สามารถแก้ไขแบบประเมินที่ส่งแล้วได้</UiAlert>
      <div class="mt-5 overflow-hidden rounded-control border border-divider"><dl class="divide-y divide-divider text-sm"><div v-for="criterion in companyEvaluationCriteria" :key="criterion.id" class="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_14rem]"><dt class="text-muted">{{ criterion.label }}</dt><dd class="font-semibold text-ink sm:text-right">{{ ratingLabel(companyForm.ratings[criterion.id] ?? '') }}</dd></div></dl></div>
      <dl class="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt class="font-semibold text-muted">ความต้องการของสถานประกอบการ</dt><dd class="mt-1 whitespace-pre-line text-ink">{{ companyForm.companyRequirements || '—' }}</dd></div><div><dt class="font-semibold text-muted">ข้อเสนอแนะ</dt><dd class="mt-1 whitespace-pre-line text-ink">{{ companyForm.suggestions || '—' }}</dd></div></dl>
    </template>
    </UiDialog>
  </div>
</template>
