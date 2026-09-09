import { randomUUID } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { createSupervisionGroupsSchema } from '#shared/supervision-groups'
import { requireUserSession } from '../../../utils/session'
import { roundToPrisma, toSupervisionGroupDto } from '../../../utils/supervisionGroups'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, ['staff'])
  const parsed = createSupervisionGroupsSchema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'SUPERVISION_GROUPS_INVALID' })
  const { cycleId, round, groups } = parsed.data
  const companyIds = groups.flatMap(group => group.companyIds)
  if (new Set(companyIds).size !== companyIds.length || new Set(groups.map(group => group.name)).size !== groups.length) {
    throw createError({ statusCode: 400, statusMessage: 'SUPERVISION_GROUPS_DUPLICATE' })
  }
  const prismaRound = roundToPrisma(round)
  const prisma = usePrisma()
  try {
    const created = await prisma.$transaction(async (transaction) => {
      const [eligible, assigned, duplicateNames] = await Promise.all([
        transaction.placementRequest.findMany({
          where: { status: 'CONFIRMED', enrollment: { cycleId }, companySiteId: { in: companyIds } },
          select: { companySiteId: true },
          distinct: ['companySiteId'],
          take: 5000,
        }),
        transaction.supervisionGroupCompany.findMany({
          where: { cycleId, round: prismaRound, companySiteId: { in: companyIds } },
          select: { companySiteId: true },
          take: companyIds.length,
        }),
        transaction.supervisionGroup.count({ where: { cycleId, round: prismaRound, name: { in: groups.map(group => group.name) } } }),
      ])
      const eligibleIds = new Set(eligible.flatMap(item => item.companySiteId ? [item.companySiteId] : []))
      if (eligibleIds.size !== companyIds.length || assigned.length || duplicateNames) {
        throw createError({ statusCode: 409, statusMessage: 'SUPERVISION_GROUPS_STALE' })
      }
      const records = []
      for (const group of groups) {
        records.push(await transaction.supervisionGroup.create({
          data: {
            code: `SG-${randomUUID()}`,
            cycleId,
            round: prismaRound,
            name: group.name,
            createdById: user.id,
            companies: {
              create: group.companyIds.map(companySiteId => ({ companySiteId })),
            },
          },
          include: {
            lecturers: { select: { lecturerId: true } },
            companies: { select: { companySiteId: true } },
          },
        }))
      }
      return records
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    setResponseStatus(event, 201)
    return created.map(toSupervisionGroupDto)
  }
  catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'SUPERVISION_GROUPS_STALE' })
    }
    throw cause
  }
})
