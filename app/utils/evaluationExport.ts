import type { SupervisionAppointment } from '../composables/useSupervisionAppointments'
import { companyEvaluationCriteria, studentEvaluationCriteria } from '../composables/useSupervisionEvaluations'
import type { CompanyEvaluation, StudentEvaluation } from '../composables/useSupervisionEvaluations'

export type EvaluationExportRow = Record<string, string | number>
export interface StudentEvaluationExportContext {
  studentName: string
  position: string
  companyName: string
}
export interface StudentEvaluationExportScope {
  appointmentId: string
  studentId: string
}

export const buildStudentEvaluationRows = (
  appointments: readonly SupervisionAppointment[],
  students: readonly StudentEvaluation[],
  contextFor: (studentId: string, appointment: SupervisionAppointment) => StudentEvaluationExportContext | undefined,
  lecturerId?: string,
  studentScopes?: readonly StudentEvaluationExportScope[],
): EvaluationExportRow[] => {
  const appointmentsById = new Map(appointments.map(item => [item.id, item]))
  const scopedStudents = studentScopes
    ? new Set(studentScopes.map(item => `${item.appointmentId}\u0000${item.studentId}`))
    : undefined

  return students
    .filter(item => item.status === 'submitted'
      && (!lecturerId || item.lecturerId === lecturerId)
      && (!scopedStudents || scopedStudents.has(`${item.appointmentId}\u0000${item.studentId}`)))
    .flatMap((item) => {
      const appointment = appointmentsById.get(item.appointmentId)
      if (!appointment || !appointment.studentIds.includes(item.studentId)) return []
      const context = contextFor(item.studentId, appointment)
      if (!context) return []
      const criterionScores = studentEvaluationCriteria.map(criterion => Number(item.ratings[criterion.id]) || 0)
      const averageScore = criterionScores.length
        ? Number((criterionScores.reduce((total, score) => total + score, 0) / criterionScores.length).toFixed(2))
        : ''

      return [{
        'ชื่อ-นามสกุล': context.studentName,
        'ตำแหน่งงาน': context.position,
        'ชื่อสถานประกอบการ': context.companyName,
        'สรุปผลคะแนน (เฉลี่ยเต็ม 5)': averageScore,
        ...Object.fromEntries(studentEvaluationCriteria.map((criterion, index) => [criterion.label, criterionScores[index] || ''])),
      }]
    })
}

export const buildEvaluationRows = (
  appointments: readonly SupervisionAppointment[],
  students: readonly StudentEvaluation[],
  companies: readonly CompanyEvaluation[],
  nameFor: (id: string) => string,
  companyFor: (id: string) => string,
): EvaluationExportRow[] => {
  const byId = new Map(appointments.map(item => [item.id, item]))
  const evaluations = [
    ...students.map(item => ({ ...item, kind: 'นักศึกษา', personId: item.studentId, evaluator: item.lecturerId, criteria: studentEvaluationCriteria })),
    ...companies.map(item => ({ ...item, kind: 'สถานประกอบการ', personId: '', evaluator: item.evaluatorId, criteria: companyEvaluationCriteria })),
  ]
  return evaluations.filter(item => item.status === 'submitted' && byId.has(item.appointmentId)).flatMap(item => {
    const appointment = byId.get(item.appointmentId)!
    return item.criteria.map(criterion => ({
      'รอบสหกิจศึกษา': appointment.cycleId,
      'ครั้งที่นิเทศ': appointment.round,
      'รหัสนัดนิเทศ': appointment.id,
      'วันที่นิเทศ': appointment.date,
      'ประเภทแบบประเมิน': item.kind,
      'รหัสนักศึกษา': item.personId,
      'ชื่อนักศึกษา': item.personId ? nameFor(item.personId) : '',
      'สถานประกอบการ': companyFor(appointment.companyId),
      'รหัสผู้ประเมิน': item.evaluator,
      'ผู้ประเมิน': nameFor(item.evaluator),
      'เกณฑ์ประเมิน': criterion.label,
      'คะแนน (เต็ม 5)': Number(item.ratings[criterion.id]) || '',
      'วันที่ส่งผลประเมิน': item.submittedAt ?? '',
    }))
  })
}

export const evaluationCsv = (rows: EvaluationExportRow[]) => {
  const headers = Object.keys(rows[0] ?? {})
  const cell = (value: string | number) => {
    const text = String(value)
    // Quoting alone does not prevent spreadsheet formula injection.
    const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }
  return `\uFEFF${[headers, ...rows.map(row => headers.map(key => row[key] ?? ''))].map(row => row.map(cell).join(',')).join('\r\n')}`
}
