import { readonly } from 'vue'
import { persistedEvaluationBundleSchema } from '#shared/evaluations'
import { requestAwareFetch } from '../utils/requestAwareFetch'

export type EvaluationRating = '1' | '2' | '3' | '4' | '5'
export type EvaluationStatus = 'draft' | 'submitted'
export type CompanyRecommendation = 'recommended' | 'conditional' | 'follow_up' | 'not_recommended' | 'safety_risk'

export interface EvaluationCriterion {
  id: string
  label: string
}

export interface StudentEvaluationInput {
  ratings: Record<string, EvaluationRating>
  strengths: string
  issues: string
  suggestions: string
  followUp: string
}

export interface StudentEvaluation extends StudentEvaluationInput {
  appointmentId: string
  studentId: string
  lecturerId: string
  status: EvaluationStatus
  submittedAt: string | null
}

export interface CompanyEvaluationInput {
  ratings: Record<string, EvaluationRating>
  recommendation: CompanyRecommendation | ''
  observations: string
  companyRequirements: string
  issues: string
  suggestions: string
}

export interface CompanyEvaluation extends CompanyEvaluationInput {
  appointmentId: string
  evaluatorId: string
  status: EvaluationStatus
  submittedAt: string | null
}

export const evaluationRatingOptions = [
  { value: '1', label: '1 · น้อยที่สุด', shortLabel: 'น้อยที่สุด' },
  { value: '2', label: '2 · น้อย', shortLabel: 'น้อย' },
  { value: '3', label: '3 · ปานกลาง', shortLabel: 'ปานกลาง' },
  { value: '4', label: '4 · มาก', shortLabel: 'มาก' },
  { value: '5', label: '5 · ดีมากที่สุด', shortLabel: 'ดีมากที่สุด' },
]

export const companyRecommendationOptions = [
  { value: 'recommended', label: 'แนะนำให้ส่งนักศึกษารุ่นถัดไป' },
  { value: 'conditional', label: 'แนะนำแบบมีเงื่อนไข' },
  { value: 'follow_up', label: 'ต้องติดตามข้อมูลเพิ่มเติม' },
  { value: 'not_recommended', label: 'ไม่แนะนำ' },
  { value: 'safety_risk', label: 'มีประเด็นเร่งด่วนด้านความปลอดภัย' },
]

export const studentEvaluationCriteria: EvaluationCriterion[] = [
  { id: 'responsibility', label: 'ความรับผิดชอบและตรงต่อเวลา' },
  { id: 'ethics', label: 'วินัยและจรรยาบรรณในการทำงาน' },
  { id: 'communication', label: 'การสื่อสารและทำงานร่วมกับผู้อื่น' },
  { id: 'knowledge', label: 'การประยุกต์ใช้ความรู้กับงาน' },
  { id: 'work_quality', label: 'คุณภาพและความก้าวหน้าของงาน' },
  { id: 'problem_solving', label: 'การเรียนรู้และแก้ไขปัญหา' },
]

export const companyEvaluationCriteria: EvaluationCriterion[] = [
  { id: 'field_relevance', label: 'ลักษณะงานมีความสอดคล้องกับสาขาวิชาและผลลัพธ์การเรียนรู้ของนักศึกษา' },
  { id: 'work_scope', label: 'ขอบเขต ปริมาณ และระดับความท้าทายของงานมีความเหมาะสม' },
  { id: 'learning_opportunity', label: 'สถานประกอบการเปิดโอกาสให้นักศึกษาเรียนรู้และพัฒนาทักษะวิชาชีพ' },
  { id: 'supervisor_readiness', label: 'ผู้ควบคุมงานมีความพร้อมในการมอบหมายงาน ให้คำแนะนำ และติดตามผล' },
  { id: 'student_support', label: 'สถานประกอบการมีระบบดูแล ช่วยเหลือ และให้ข้อเสนอแนะแก่นักศึกษาอย่างเหมาะสม' },
  { id: 'environment', label: 'สภาพแวดล้อมและบรรยากาศในการทำงานเอื้อต่อการเรียนรู้และการปฏิบัติงาน' },
  { id: 'safety', label: 'มาตรการด้านความปลอดภัยและสุขอนามัยในการทำงานมีความเหมาะสม' },
  { id: 'resources', label: 'อุปกรณ์ เครื่องมือ ระบบงาน และทรัพยากรที่จำเป็นมีความพร้อม' },
  { id: 'allowance', label: 'สวัสดิการ ค่าตอบแทน หรือเบี้ยเลี้ยงที่จัดให้นักศึกษามีความเหมาะสม' },
  { id: 'transportation', label: 'การเดินทางมายังสถานประกอบการมีความสะดวกและปลอดภัย' },
  { id: 'public_transport', label: 'มีบริการรถรับส่งหรือสามารถเข้าถึงระบบขนส่งสาธารณะ เช่น รถโดยสารประจำทาง รถไฟฟ้า BTS หรือ MRT ได้สะดวก' },
  { id: 'nearby_accommodation', label: 'มีที่พักที่ปลอดภัย เหมาะสม และอยู่ในระยะเดินทางสะดวกจากสถานประกอบการ' },
  { id: 'coordination', label: 'การประสานงานและการสื่อสารกับมหาวิทยาลัยมีความชัดเจนและต่อเนื่อง' },
]

const hasCompleteRatings = (ratings: Record<string, EvaluationRating>, criteria: EvaluationCriterion[]) => criteria
  .every(criterion => Boolean(ratings[criterion.id]))
const cloneStudentEvaluation = (evaluation: StudentEvaluation): StudentEvaluation => ({ ...evaluation, ratings: { ...evaluation.ratings } })
const cloneCompanyEvaluation = (evaluation: CompanyEvaluation): CompanyEvaluation => ({ ...evaluation, ratings: { ...evaluation.ratings } })

export const useSupervisionEvaluations = () => {
  const studentEvaluations = useState<StudentEvaluation[]>('supervision-student-evaluations-v1', () => [])
  const companyEvaluations = useState<CompanyEvaluation[]>('supervision-company-evaluations-v2', () => [])
  const { currentAccount } = useAuthPrototype()
  const requireStudentEvaluator = () => {
    if (currentAccount.value?.role !== 'lecturer') throw new Error('ไม่มีสิทธิ์ประเมินนักศึกษา')
  }
  const requireCompanyEvaluator = () => {
    if (!currentAccount.value || !['lecturer', 'staff'].includes(currentAccount.value.role)) throw new Error('ไม่มีสิทธิ์ประเมินสถานประกอบการ')
  }

  const findStudentEvaluation = (appointmentId: string, studentId: string, lecturerId: string) => studentEvaluations.value
    .find(item => item.appointmentId === appointmentId && item.studentId === studentId && item.lecturerId === lecturerId) ?? null
  const getStudentEvaluation = (appointmentId: string, studentId: string, lecturerId: string) => {
    const evaluation = findStudentEvaluation(appointmentId, studentId, lecturerId)
    return evaluation ? cloneStudentEvaluation(evaluation) : null
  }
  const writeStudentEvaluation = (appointmentId: string, studentId: string, lecturerId: string, input: StudentEvaluationInput) => {
    const existing = findStudentEvaluation(appointmentId, studentId, lecturerId)
    if (existing?.status === 'submitted') throw new Error('evaluation-locked')
    const evaluation: StudentEvaluation = {
      appointmentId,
      studentId,
      lecturerId,
      ...structuredClone(input),
      status: 'draft',
      submittedAt: null,
    }
    if (existing) Object.assign(existing, evaluation)
    else studentEvaluations.value.push(evaluation)
    return existing ?? evaluation
  }
  const saveStudentEvaluation = (appointmentId: string, studentId: string, lecturerId: string, input: StudentEvaluationInput) => {
    requireStudentEvaluator()
    const evaluation = writeStudentEvaluation(appointmentId, studentId, lecturerId, input)
    return cloneStudentEvaluation(evaluation)
  }

  const submitStudentEvaluation = (appointmentId: string, studentId: string, lecturerId: string, input: StudentEvaluationInput) => {
    requireStudentEvaluator()
    if (!hasCompleteRatings(input.ratings, studentEvaluationCriteria)) throw new Error('ratings-incomplete')
    const evaluation = writeStudentEvaluation(appointmentId, studentId, lecturerId, input)
    evaluation.status = 'submitted'
    evaluation.submittedAt = new Date().toISOString()
    return cloneStudentEvaluation(evaluation)
  }

  const persistStudentEvaluation = async (appointmentId: string, studentId: string, lecturerId: string, input: StudentEvaluationInput, status: EvaluationStatus) => {
    requireStudentEvaluator()
    await requestAwareFetch(`/api/evaluations/students/${appointmentId}/${encodeURIComponent(studentId)}`, {
      method: 'PUT',
      body: { status, ...input },
      reload: false,
    })
    await loadPersistedEvaluations(appointmentId)
    const saved = getStudentEvaluation(appointmentId, studentId, lecturerId)
    if (!saved) throw new Error('EVALUATION_SAVE_NOT_RETURNED')
    return saved
  }

  const findCompanyEvaluation = (appointmentId: string) => companyEvaluations.value
    .find(item => item.appointmentId === appointmentId) ?? null
  const getCompanyEvaluation = (appointmentId: string) => {
    const evaluation = findCompanyEvaluation(appointmentId)
    return evaluation ? cloneCompanyEvaluation(evaluation) : null
  }
  const writeCompanyEvaluation = (appointmentId: string, evaluatorId: string, input: CompanyEvaluationInput) => {
    const existing = findCompanyEvaluation(appointmentId)
    if (existing?.status === 'submitted') throw new Error('evaluation-locked')
    const evaluation: CompanyEvaluation = {
      appointmentId,
      evaluatorId,
      ...structuredClone(input),
      status: 'draft',
      submittedAt: null,
    }
    if (existing) Object.assign(existing, evaluation)
    else companyEvaluations.value.push(evaluation)
    return existing ?? evaluation
  }
  const saveCompanyEvaluation = (appointmentId: string, evaluatorId: string, input: CompanyEvaluationInput) => {
    requireCompanyEvaluator()
    const evaluation = writeCompanyEvaluation(appointmentId, evaluatorId, input)
    return cloneCompanyEvaluation(evaluation)
  }

  const submitCompanyEvaluation = (appointmentId: string, evaluatorId: string, input: CompanyEvaluationInput) => {
    requireCompanyEvaluator()
    if (!hasCompleteRatings(input.ratings, companyEvaluationCriteria)) throw new Error('ratings-incomplete')
    const evaluation = writeCompanyEvaluation(appointmentId, evaluatorId, input)
    evaluation.status = 'submitted'
    evaluation.submittedAt = new Date().toISOString()
    return cloneCompanyEvaluation(evaluation)
  }

  const persistCompanyEvaluation = async (appointmentId: string, evaluatorId: string, input: CompanyEvaluationInput, status: EvaluationStatus) => {
    requireCompanyEvaluator()
    const { recommendation, ...details } = input
    await requestAwareFetch(`/api/evaluations/companies/${appointmentId}`, {
      method: 'PUT',
      body: { status, ...details, ...(recommendation ? { recommendation } : {}) },
      reload: false,
    })
    await loadPersistedEvaluations(appointmentId)
    const saved = getCompanyEvaluation(appointmentId)
    if (!saved || saved.evaluatorId !== evaluatorId) throw new Error('EVALUATION_SAVE_NOT_RETURNED')
    return saved
  }

  const loadPersistedEvaluations = async (appointmentId: string) => {
    const response = persistedEvaluationBundleSchema.parse(await requestAwareFetch(`/api/evaluations/appointments/${encodeURIComponent(appointmentId)}`))
    studentEvaluations.value = [
      ...studentEvaluations.value.filter(evaluation => evaluation.appointmentId !== appointmentId),
      ...response.studentEvaluations.map(evaluation => ({
        ...evaluation,
        ratings: { ...evaluation.ratings } as Record<string, EvaluationRating>,
      })),
    ]
    companyEvaluations.value = [
      ...companyEvaluations.value.filter(evaluation => evaluation.appointmentId !== appointmentId),
      ...(response.companyEvaluation
        ? [{
            ...response.companyEvaluation,
            ratings: { ...response.companyEvaluation.ratings } as Record<string, EvaluationRating>,
          }]
        : []),
    ]
    return response
  }

  return {
    studentEvaluations: readonly(studentEvaluations),
    companyEvaluations: readonly(companyEvaluations),
    getStudentEvaluation,
    saveStudentEvaluation,
    submitStudentEvaluation,
    persistStudentEvaluation,
    getCompanyEvaluation,
    saveCompanyEvaluation,
    submitCompanyEvaluation,
    persistCompanyEvaluation,
    loadPersistedEvaluations,
  }
}
