import type { Prisma, ResponseStatus } from '@prisma/client'
import { defineEventHandler } from 'h3'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { listQuery, pageEnvelope } from '../../utils/list-query'
import { prisma } from '../../utils/prisma'

const statuses = new Set(['DRAFT', 'PENDING_REVIEW', 'CONFIRMED'])

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const query = listQuery(event)
    const where: Prisma.ResponseFormWhereInput = {
      ...(actor.role === 'STUDENT' ? { batch: { members: { some: { studentTermId: actor.studentTermId } } } } : actor.role === 'LECTURER' ? { batch: { coopTerm: { isActive: true } } } : {}),
      ...(query.status && statuses.has(query.status) ? { status: query.status as ResponseStatus } : {}),
      ...(query.search ? { OR: [
        { batch: { documentNo: { contains: query.search } } }, { batch: { workSite: { name: { contains: query.search } } } },
        { batch: { workSite: { organization: { nameTh: { contains: query.search } } } } },
      ] } : {}),
    }
    const direction = query.order ?? 'asc'
    const orderBy: Prisma.ResponseFormOrderByWithRelationInput[] = !query.sort ? [{ createdAt: 'desc' }, { id: 'desc' }]
      : query.sort === 'batchNumber' ? [{ batch: { documentNo: direction } }, { id: 'asc' }]
        : query.sort === 'workSiteName' ? [{ batch: { workSite: { organization: { nameTh: direction } } } }, { id: 'asc' }]
          : query.sort === 'status' ? [{ status: direction }, { id: 'asc' }]
            : query.sort === 'updatedAt' ? [{ updatedAt: direction }, { id: 'asc' }]
              : [{ createdAt: 'desc' }, { id: 'desc' }]
    const [records, total] = await prisma.$transaction([
      prisma.responseForm.findMany({ where, include: { batch: { include: { workSite: { include: { organization: true } }, _count: { select: { members: true } } } } }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy }),
      prisma.responseForm.count({ where }),
    ])
    return pageEnvelope(records.map(record => ({ id: record.id, batchNumber: record.batch.documentNo ?? record.batch.id.slice(0, 8), workSiteName: record.batch.workSite.organization.nameTh, memberCount: record.batch._count.members, status: record.status, updatedAt: record.updatedAt, capabilities: { review: actor.role !== 'STUDENT' } })), total, query.page, query.pageSize)
  } catch (error) { return toHttpError(error, correlationId) }
})
