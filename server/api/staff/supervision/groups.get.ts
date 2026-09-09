import { supervisionContextSchema } from '#shared/supervision-groups'
import { requireUserSession } from '../../../utils/session'
import { toSupervisionCompanies, toSupervisionGroupDto } from '../../../utils/supervisionGroups'

export default defineEventHandler(async (event) => {
  await requireUserSession(event, ['staff'])
  const parsed = supervisionContextSchema.safeParse(getQuery(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'SUPERVISION_CONTEXT_INVALID' })
  const { cycleId } = parsed.data
  const prisma = usePrisma()
  const [requests, groups, lecturers] = await prisma.$transaction([
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
    prisma.supervisionGroup.findMany({
      where: { cycleId },
      include: {
        lecturers: { select: { lecturerId: true }, orderBy: { lecturerId: 'asc' } },
        companies: { select: { companySiteId: true }, orderBy: { companySiteId: 'asc' } },
      },
      orderBy: [{ round: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take: 1000,
    }),
    prisma.user.findMany({
      where: { role: 'LECTURER', status: 'ACTIVE', recordStatus: 'ACTIVE' },
      select: { id: true, namePrefix: true, firstName: true, lastName: true, gender: true },
      orderBy: [{ firstName: 'asc' }, { id: 'asc' }],
      take: 1000,
    }),
  ])
  return {
    companies: toSupervisionCompanies(requests),
    groups: groups.map(toSupervisionGroupDto),
    lecturers: lecturers.map(lecturer => ({
      id: lecturer.id,
      name: `${lecturer.namePrefix}${lecturer.firstName} ${lecturer.lastName}`.trim(),
      gender: lecturer.gender === 'MALE' ? 'male' as const : lecturer.gender === 'FEMALE' ? 'female' as const : null,
    })),
  }
})
