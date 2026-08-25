import type { PlacementStatus, Prisma } from '@prisma/client'
import { defineEventHandler } from 'h3'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { listQuery, pageEnvelope } from '../../utils/list-query'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const query = listQuery(event)
    const status = query.status === 'ACTIVE' || query.status === 'REVERSED' ? query.status as PlacementStatus : undefined
    const where: Prisma.PlacementWhereInput = {
      ...(actor.role === 'STUDENT' ? { studentTermId: actor.studentTermId } : actor.role === 'LECTURER' ? { studentTerm: { coopTerm: { isActive: true } } } : {}),
      ...(status ? { status } : {}),
      ...(query.search ? { OR: [
        { studentTerm: { student: { studentCode: { contains: query.search } } } }, { studentTerm: { student: { firstNameTh: { contains: query.search } } } },
        { studentTerm: { student: { lastNameTh: { contains: query.search } } } }, { currentWorkSite: { name: { contains: query.search } } },
        { currentWorkSite: { organization: { nameTh: { contains: query.search } } } }, { studentTerm: { coopTerm: { name: { contains: query.search } } } },
      ] } : {}),
    }
    const direction = query.order ?? 'asc'
    const orderBy: Prisma.PlacementOrderByWithRelationInput[] = !query.sort ? [{ confirmedAt: 'desc' }, { id: 'desc' }]
      : query.sort === 'studentName' ? [{ studentTerm: { student: { firstNameTh: direction } } }, { id: 'asc' }]
        : query.sort === 'organizationName' ? [{ currentWorkSite: { organization: { nameTh: direction } } }, { id: 'asc' }]
          : query.sort === 'coopTerm' ? [{ studentTerm: { coopTerm: { startsOn: direction } } }, { id: 'asc' }]
            : query.sort === 'confirmedAt' ? [{ confirmedAt: direction }, { id: 'asc' }]
              : [{ confirmedAt: 'desc' }, { id: 'desc' }]
    const [records, total] = await prisma.$transaction([
      prisma.placement.findMany({ where, include: { currentWorkSite: { include: { organization: true } }, studentTerm: { include: { student: true, coopTerm: true } } }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy }),
      prisma.placement.count({ where }),
    ])
    return pageEnvelope(records.map(record => ({ id: record.id, studentName: `${record.studentTerm.student.firstNameTh} ${record.studentTerm.student.lastNameTh}`, organizationName: record.currentWorkSite.organization.nameTh, workSiteName: record.currentWorkSite.name, coopTerm: record.studentTerm.coopTerm.name, confirmedAt: record.confirmedAt, status: record.status, capabilities: { correct: actor.role !== 'STUDENT' } })), total, query.page, query.pageSize)
  } catch (error) { return toHttpError(error, correlationId) }
})
