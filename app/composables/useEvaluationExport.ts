import { z } from 'zod'
import { buildEvaluationRows, evaluationCsv } from '../utils/evaluationExport'
import type { StudentEvaluationExportScope } from '../utils/evaluationExport'
import type { SupervisionAppointment } from './useSupervisionAppointments'

export const useEvaluationExport = () => {
  const { currentAccount } = useAuthPrototype()
  const { studentEvaluations, companyEvaluations } = useSupervisionEvaluations()
  const { people } = usePeopleDirectory()
  const { companyRecords } = useSupervisionGroups()
  const exportStudentEvaluations = async (appointments: SupervisionAppointment[], format: string, _studentScopes?: readonly StudentEvaluationExportScope[]) => {
    const account = currentAccount.value
    if (!account || (account.role !== 'staff' && account.role !== 'lecturer')) throw new Error('เฉพาะอาจารย์หรือเจ้าหน้าที่เท่านั้นที่ส่งออกคะแนนประเมินนักศึกษาได้')
    const fileFormat = z.enum(['csv', 'xlsx']).parse(format)
    const firstAppointment = appointments[0]
    if (!firstAppointment) throw new Error('ยังไม่มีรายการนิเทศในขอบเขตที่เลือก')
    const response = await $fetch.raw<ArrayBuffer>('/api/evaluations/students/export', {
      query: { format: fileFormat, cycleId: firstAppointment.cycleId, round: firstAppointment.round },
      responseType: 'arrayBuffer',
    })
    const disposition = response.headers.get('content-disposition') ?? ''
    const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? `student-evaluation-scores.${fileFormat}`
    const url = URL.createObjectURL(new Blob([response._data!], {
      type: fileFormat === 'csv' ? 'text/csv;charset=utf-8' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }))
    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.click()
    }
    finally { setTimeout(() => URL.revokeObjectURL(url), 0) }
    return Number(response.headers.get('x-export-count') ?? 0)
  }

  const exportEvaluations = async (appointments: SupervisionAppointment[], format: string) => {
    if (currentAccount.value?.role !== 'staff') throw new Error('เฉพาะเจ้าหน้าที่เท่านั้นที่ส่งออกผลคะแนนได้')
    const fileFormat = z.enum(['csv', 'xlsx']).parse(format)
    const rows = buildEvaluationRows(appointments, studentEvaluations.value, companyEvaluations.value,
      id => {
        if (currentAccount.value?.id === id) return currentAccount.value.name
        const person = people.value.find(item => item.id === id || item.accountId === id)
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
