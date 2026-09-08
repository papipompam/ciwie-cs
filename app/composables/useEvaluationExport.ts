import { z } from 'zod'
import { buildEvaluationRows, buildStudentEvaluationRows, evaluationCsv } from '../utils/evaluationExport'
import type { StudentEvaluationExportScope } from '../utils/evaluationExport'
import type { SupervisionAppointment } from './useSupervisionAppointments'

export const useEvaluationExport = () => {
  const { currentAccount } = useAuthPrototype()
  const { studentEvaluations, companyEvaluations } = useSupervisionEvaluations()
  const { people } = usePeopleDirectory()
  const { companyRecords, placements } = useSupervisionGroups()
  const downloadRows = async (rows: Record<string, string | number>[], format: 'csv' | 'xlsx', fileName: string) => {
    if (!rows.length) throw new Error('ยังไม่มีผลประเมินนักศึกษาที่ส่งแล้วในรายการที่กรอง')
    if (format === 'xlsx') {
      const { default: writeExcelFile } = await import('write-excel-file/browser')
      const headers = Object.keys(rows[0]!)
      const matrix = [headers, ...rows.map(row => headers.map(key => row[key] ?? ''))]
      await writeExcelFile(matrix.map(row => row.map(value => typeof value === 'number' ? { value, type: Number } : { value, type: String }))).toFile(`${fileName}.xlsx`)
      return
    }

    const url = URL.createObjectURL(new Blob([evaluationCsv(rows)], { type: 'text/csv;charset=utf-8' }))
    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${fileName}.csv`
      anchor.click()
    }
    finally { setTimeout(() => URL.revokeObjectURL(url), 0) }
  }

  const exportStudentEvaluations = async (appointments: SupervisionAppointment[], format: string, studentScopes?: readonly StudentEvaluationExportScope[]) => {
    const account = currentAccount.value
    if (!account || (account.role !== 'staff' && account.role !== 'lecturer')) throw new Error('เฉพาะอาจารย์หรือเจ้าหน้าที่เท่านั้นที่ส่งออกคะแนนประเมินนักศึกษาได้')
    const fileFormat = z.enum(['csv', 'xlsx']).parse(format)
    const scopedLecturerId = account.role === 'lecturer'
      ? account.id === 'lecturer-001' ? 'L0012' : account.id
      : undefined
    const scopedAppointments = scopedLecturerId
      ? appointments.filter((appointment) => {
          const evaluatorIds = appointment.result.actualLecturerIds.length
            ? appointment.result.actualLecturerIds
            : appointment.lecturerIds
          return evaluatorIds.includes(scopedLecturerId)
        })
      : appointments
    const rows = buildStudentEvaluationRows(scopedAppointments, studentEvaluations.value, (studentId, appointment) => {
      const placement = placements.value.find(item => item.studentId === studentId
        && item.cycleId === appointment.cycleId
        && item.companyId === appointment.companyId)
      if (!placement) return undefined
      return { studentName: placement.studentName, position: placement.position, companyName: placement.company }
    }, scopedLecturerId, studentScopes)
    await downloadRows(rows, fileFormat, `student-evaluation-scores-${new Date().toISOString().slice(0, 10)}`)
    return rows.length
  }

  const exportEvaluations = async (appointments: SupervisionAppointment[], format: string) => {
    if (currentAccount.value?.role !== 'staff') throw new Error('เฉพาะเจ้าหน้าที่เท่านั้นที่ส่งออกผลคะแนนได้')
    const fileFormat = z.enum(['csv', 'xlsx']).parse(format)
    const rows = buildEvaluationRows(appointments, studentEvaluations.value, companyEvaluations.value,
      id => {
        if (currentAccount.value?.id === id) return currentAccount.value.name
        const person = people.value.find(item => item.id === id)
        return person ? getPersonFullName(person) : id
      },
      id => companyRecords.value.find(item => item.id === id)?.name ?? id)
    if (!rows.length) throw new Error('ยังไม่มีผลประเมินที่ส่งแล้วในรายการที่กรอง')
    const fileName = `evaluation-scores-${new Date().toISOString().slice(0, 10)}`
    if (fileFormat === 'xlsx') {
      const { default: writeExcelFile } = await import('write-excel-file/browser')
      const headers = Object.keys(rows[0]!)
      const matrix = [headers, ...rows.map(row => headers.map(key => row[key] ?? ''))]
      await writeExcelFile(matrix.map(row => row.map(value => typeof value === 'number' ? { value, type: Number } : { value, type: String }))).toFile(`${fileName}.xlsx`)
    }
    else {
      const url = URL.createObjectURL(new Blob([evaluationCsv(rows)], { type: 'text/csv;charset=utf-8' }))
      try {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${fileName}.csv`
        anchor.click()
      }
      finally { setTimeout(() => URL.revokeObjectURL(url), 0) }
    }
    return rows.length
  }
  return { exportEvaluations, exportStudentEvaluations }
}
