import type { PersonRecord } from '../composables/usePeopleDirectory'
import type { PlacementRequestPreview } from '../../shared/placement-requests'

export interface StudentPlacementSummary {
  confirmed: number
  pending: number
  notStarted: number
  total: number
}

export const summarizeStudentPlacements = (
  students: Array<Pick<PersonRecord, 'id' | 'company'>>,
  requests: Array<Pick<PlacementRequestPreview, 'cycleId' | 'status' | 'application'>>,
  cycleId: string,
): StudentPlacementSummary => {
  const requestsByStudent = new Map<string, typeof requests>()
  requests.filter(request => request.cycleId === cycleId).forEach((request) => {
    const studentRequests = requestsByStudent.get(request.application.studentId) ?? []
    studentRequests.push(request)
    requestsByStudent.set(request.application.studentId, studentRequests)
  })

  return students.reduce<StudentPlacementSummary>((summary, student) => {
    const studentRequests = requestsByStudent.get(student.id) ?? []
    if (student.company?.trim() || studentRequests.some(request => request.status === 'confirmed')) summary.confirmed += 1
    else if (studentRequests.length) summary.pending += 1
    else summary.notStarted += 1
    summary.total += 1
    return summary
  }, { confirmed: 0, pending: 0, notStarted: 0, total: 0 })
}
