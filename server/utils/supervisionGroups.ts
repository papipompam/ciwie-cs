import type { Prisma, SupervisionRound } from '@prisma/client'
import type { SupervisionCompanyDto, SupervisionGroupDto, SupervisionRoundNumber } from '#shared/supervision-groups'

export const roundToPrisma = (round: SupervisionRoundNumber): SupervisionRound => round === 1 ? 'ROUND_1' : 'ROUND_2'
export const roundFromPrisma = (round: SupervisionRound): SupervisionRoundNumber => round === 'ROUND_1' ? 1 : 2

const regionLabels = {
  NORTH: 'ภาคเหนือ',
  NORTHEAST: 'ภาคตะวันออกเฉียงเหนือ',
  CENTRAL: 'ภาคกลาง',
  EAST: 'ภาคตะวันออก',
  WEST: 'ภาคตะวันตก',
  SOUTH: 'ภาคใต้',
} as const

export type ConfirmedPlacementForGrouping = Prisma.PlacementRequestGetPayload<{
  select: {
    id: true
    positionTitle: true
    companySite: {
      select: {
        id: true
        branchName: true
        address: true
        latitude: true
        longitude: true
        contactName: true
        contactPhone: true
        recordStatus: true
        company: { select: { legalName: true } }
        province: { select: { nameTh: true, region: true } }
      }
    }
    enrollment: {
      select: {
        cycleId: true
        student: { select: { username: true, namePrefix: true, firstName: true, lastName: true, section: true } }
      }
    }
  }
}>

export const toSupervisionCompanies = (requests: ConfirmedPlacementForGrouping[]): SupervisionCompanyDto[] => {
  const companies = new Map<string, SupervisionCompanyDto>()
  for (const request of requests) {
    const site = request.companySite
    if (!site) continue
    const student = request.enrollment.student
    const item = companies.get(site.id) ?? {
      id: site.id,
      cycleId: request.enrollment.cycleId,
      name: site.company.legalName,
      branch: site.branchName,
      province: site.province.nameTh,
      region: site.province.region ? regionLabels[site.province.region] : 'ยังไม่ระบุ',
      address: site.address,
      contactName: site.contactName ?? 'ยังไม่ระบุ',
      contactPhone: site.contactPhone ?? 'ยังไม่ระบุ',
      status: site.recordStatus === 'ACTIVE' ? 'active' as const : 'inactive' as const,
      latitude: site.latitude === null ? null : Number(site.latitude),
      longitude: site.longitude === null ? null : Number(site.longitude),
      studentCount: 0,
      students: [],
    }
    item.students.push({
      id: request.id,
      studentId: student.username,
      studentName: `${student.namePrefix}${student.firstName} ${student.lastName}`.trim(),
      prefix: student.namePrefix,
      firstName: student.firstName,
      lastName: student.lastName,
      section: student.section ?? 'ยังไม่กำหนด',
      position: request.positionTitle,
    })
    item.studentCount = item.students.length
    companies.set(site.id, item)
  }
  return [...companies.values()].sort((left, right) => left.name.localeCompare(right.name, 'th') || left.id.localeCompare(right.id))
}

export type PersistedGroupForMapping = Prisma.SupervisionGroupGetPayload<{
  include: {
    lecturers: { select: { lecturerId: true } }
    companies: { select: { companySiteId: true } }
  }
}>

export const toSupervisionGroupDto = (group: PersistedGroupForMapping): SupervisionGroupDto => ({
  id: group.id,
  cycleId: group.cycleId,
  round: roundFromPrisma(group.round),
  name: group.name,
  lecturerIds: group.lecturers.map(item => item.lecturerId),
  companyIds: group.companies.map(item => item.companySiteId),
  createdAt: group.createdAt.toISOString(),
})
