import type { SupervisionAppointmentStatus, SupervisionPeriod, SupervisionRound } from '@prisma/client'

const roundFromPrisma: Record<SupervisionRound, 1 | 2> = { ROUND_1: 1, ROUND_2: 2 }
const periodFromPrisma: Record<SupervisionPeriod, 'morning' | 'afternoon'> = { MORNING: 'morning', AFTERNOON: 'afternoon' }
const statusFromPrisma: Record<SupervisionAppointmentStatus, 'draft' | 'published' | 'postponed' | 'completed' | 'cancelled'> = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  POSTPONED: 'postponed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

interface PersistedAppointment {
  id: string
  scheduledDate: Date | null
  period: SupervisionPeriod | null
  status: SupervisionAppointmentStatus
  splitReason: string | null
  completedAt: Date | null
  resultSummary: string | null
  resultIssues: string | null
  resultSuggestions: string | null
  companyRequirements: string | null
  createdAt: Date
  groupCompany: {
    groupId: string, cycleId: string, round: SupervisionRound, companySiteId: string
    group?: { name: string }
    companySite?: { branchName: string, address: string, province: { nameTh: string }, company: { legalName: string } }
  }
  lecturers: Array<{ lecturerId: string, isActual: boolean, lecturer?: { namePrefix: string, firstName: string, lastName: string } }>
  students: Array<{ placementRequest: { positionTitle?: string, enrollment: { student: { username: string, namePrefix?: string, firstName?: string, lastName?: string } } } }>
}

export const toSupervisionAppointmentDto = (appointment: PersistedAppointment) => ({
  id: appointment.id,
  cycleId: appointment.groupCompany.cycleId,
  round: roundFromPrisma[appointment.groupCompany.round],
  groupId: appointment.groupCompany.groupId,
  companyId: appointment.groupCompany.companySiteId,
  studentIds: appointment.students.map(student => student.placementRequest.enrollment.student.username),
  date: appointment.scheduledDate?.toISOString().slice(0, 10) ?? '',
  period: appointment.period ? periodFromPrisma[appointment.period] : 'morning' as const,
  lecturerIds: appointment.lecturers.map(lecturer => lecturer.lecturerId),
  splitReason: appointment.splitReason ?? undefined,
  status: statusFromPrisma[appointment.status],
  result: {
    summary: appointment.resultSummary ?? '',
    issues: appointment.resultIssues ?? '',
    suggestions: appointment.resultSuggestions ?? '',
    companyRequirements: appointment.companyRequirements ?? '',
    actualLecturerIds: appointment.lecturers.filter(lecturer => lecturer.isActual).map(lecturer => lecturer.lecturerId),
    completedAt: appointment.completedAt?.toISOString() ?? null,
  },
  createdAt: appointment.createdAt.toISOString(),
  ...(appointment.groupCompany.companySite && appointment.groupCompany.group
    ? {
        display: {
          companyName: appointment.groupCompany.companySite.company.legalName,
          branchName: appointment.groupCompany.companySite.branchName,
          address: appointment.groupCompany.companySite.address,
          province: appointment.groupCompany.companySite.province.nameTh,
          groupName: appointment.groupCompany.group.name,
          lecturers: appointment.lecturers.map(item => ({
            id: item.lecturerId,
            name: item.lecturer ? `${item.lecturer.namePrefix}${item.lecturer.firstName} ${item.lecturer.lastName}` : item.lecturerId,
          })),
          students: appointment.students.map((item) => {
            const student = item.placementRequest.enrollment.student
            return {
              id: student.username,
              name: student.firstName ? `${student.namePrefix ?? ''}${student.firstName} ${student.lastName ?? ''}`.trim() : student.username,
              position: item.placementRequest.positionTitle ?? '',
            }
          }),
        },
      }
    : {}),
})
