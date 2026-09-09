export const studentScoreColumns = [
  ['responsibilityScore', 'ความรับผิดชอบและตรงต่อเวลา'],
  ['disciplineScore', 'วินัยและจรรยาบรรณในการทำงาน'],
  ['communicationScore', 'การสื่อสารและทำงานร่วมกับผู้อื่น'],
  ['knowledgeScore', 'การประยุกต์ใช้ความรู้กับงาน'],
  ['workQualityScore', 'คุณภาพและความก้าวหน้าของงาน'],
  ['problemSolvingScore', 'การเรียนรู้และแก้ไขปัญหา'],
] as const

interface PersistedStudentEvaluation {
  responsibilityScore: number | null
  disciplineScore: number | null
  communicationScore: number | null
  knowledgeScore: number | null
  workQualityScore: number | null
  problemSolvingScore: number | null
  appointmentStudent: {
    placementRequest: {
      companyNameSnapshot: string
      positionTitle: string
      enrollment: {
        student: { namePrefix: string, firstName: string, lastName: string }
      }
    }
  }
}

export type StudentEvaluationExportRow = Record<string, string | number>

export const buildPersistedStudentEvaluationRows = (evaluations: PersistedStudentEvaluation[]): StudentEvaluationExportRow[] => evaluations.map((evaluation) => {
  const request = evaluation.appointmentStudent.placementRequest
  const student = request.enrollment.student
  const scores = studentScoreColumns.map(([key]) => evaluation[key])
  const answered = scores.filter((score): score is number => score !== null)
  const average = answered.length ? Number((answered.reduce((sum, score) => sum + score, 0) / answered.length).toFixed(2)) : ''
  return {
    'ชื่อ-นามสกุล': `${student.namePrefix}${student.firstName} ${student.lastName}`.trim(),
    'ตำแหน่งงาน': request.positionTitle,
    'ชื่อสถานประกอบการ': request.companyNameSnapshot,
    'สรุปผลคะแนน (เฉลี่ยเต็ม 5)': average,
    ...Object.fromEntries(studentScoreColumns.map(([key, label]) => [label, evaluation[key] ?? ''])),
  }
})

export const rowsToCsv = (rows: StudentEvaluationExportRow[]) => {
  const headers = Object.keys(rows[0] ?? {})
  const cell = (value: string | number) => {
    const text = String(value)
    const safe = typeof value === 'string' && /^[\s]*[=+@-]/.test(text) ? `'${text}` : text
    return `"${safe.replaceAll('"', '""')}"`
  }
  return `\uFEFF${[headers, ...rows.map(row => headers.map(header => row[header] ?? ''))].map(row => row.map(cell).join(',')).join('\r\n')}`
}
