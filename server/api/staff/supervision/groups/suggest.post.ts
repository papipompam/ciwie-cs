import { supervisionSuggestionSchema } from '#shared/supervision-groups'
import { clusterCompanies } from '#shared/supervision-clustering'
import { requireUserSession } from '../../../../utils/session'
import { roundToPrisma, toSupervisionCompanies } from '../../../../utils/supervisionGroups'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff'])
  const parsed = supervisionSuggestionSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'CLUSTERING_OPTIONS_INVALID' })
  const { cycleId, round, maxDistanceKm, maxCompanies } = parsed.data
  const prisma = usePrisma()
  const [requests, assignments, existingGroupCount] = await prisma.$transaction([
    prisma.placementRequest.findMany({
      where: { status: 'CONFIRMED', enrollment: { cycleId }, companySiteId: { not: null } },
      select: {
        id: true,
        positionTitle: true,
        companySite: {
          select: {
            id: true, branchName: true, address: true, latitude: true, longitude: true,
            contactName: true, contactPhone: true, recordStatus: true,
            company: { select: { legalName: true } },
            province: { select: { nameTh: true, region: true } },
          },
        },
        enrollment: {
          select: {
            cycleId: true,
            student: { select: { username: true, namePrefix: true, firstName: true, lastName: true, section: true } },
          },
        },
      },
      orderBy: [{ companySiteId: 'asc' }, { id: 'asc' }],
      take: 5000,
    }),
    prisma.supervisionGroupCompany.findMany({
      where: { cycleId, round: roundToPrisma(round) },
      select: { companySiteId: true },
      take: 5000,
    }),
    prisma.supervisionGroup.count({ where: { cycleId, round: roundToPrisma(round) } }),
  ])
  const assigned = new Set(assignments.map(item => item.companySiteId))
  const companies = toSupervisionCompanies(requests).filter(company => !assigned.has(company.id))
  const result = clusterCompanies(companies, { maxDistanceKm, maxCompanies })
  return {
    groups: result.groups.map((companyIds, index) => ({ name: `กลุ่มนิเทศ ${existingGroupCount + index + 1}`, companyIds })),
    missingCompanyIds: result.missingIds,
    algorithm: {
      method: 'complete-link',
      metric: 'haversine-km',
      maxDistanceKm,
      maxCompanies,
    },
  }
})
