import type { DocumentRequestStatus, Prisma } from '@prisma/client'
import { defineEventHandler } from 'h3'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { listQuery, pageEnvelope } from '../../utils/list-query'
import { prisma } from '../../utils/prisma'

const statuses = new Set(['REQUESTED', 'IN_PROGRESS', 'READY_TO_SEND', 'CANCELLED'])

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const query = listQuery(event)
    const where: Prisma.DocumentRequestWhereInput = {
      ...(actor.role === 'STUDENT' ? { studentTermId: actor.studentTermId } : actor.role === 'LECTURER' ? { coopTerm: { isActive: true } } : {}),
      ...(query.status && statuses.has(query.status) ? { status: query.status as DocumentRequestStatus } : {}),
      ...(query.search ? { OR: [
        { id: { contains: query.search } }, { studentTerm: { student: { studentCode: { contains: query.search } } } },
        { studentTerm: { student: { firstNameTh: { contains: query.search } } } }, { studentTerm: { student: { lastNameTh: { contains: query.search } } } },
        { workSite: { name: { contains: query.search } } }, { batchMember: { batch: { documentNo: { contains: query.search } } } },
      ] } : {}),
    }
    const direction = query.order ?? 'asc'
    const orderBy: Prisma.DocumentRequestOrderByWithRelationInput[] = !query.sort ? [{ requestedAt: 'desc' }, { id: 'desc' }]
      : query.sort === 'requestNumber' ? [{ id: direction }]
        : query.sort === 'studentName' ? [{ studentTerm: { student: { firstNameTh: direction } } }, { id: 'asc' }]
          : query.sort === 'status' ? [{ status: direction }, { id: 'asc' }]
            : [{ requestedAt: 'desc' }, { id: 'desc' }]
    const [records, total] = await prisma.$transaction([
      prisma.documentRequest.findMany({ where, include: { workSite: true, studentTerm: { include: { student: true } }, batchMember: { include: { batch: true } } }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy }),
      prisma.documentRequest.count({ where }),
    ])
    return pageEnvelope(records.map(record => ({ id: record.id, requestNumber: record.id.slice(0, 8), studentName: `${record.studentTerm.student.firstNameTh} ${record.studentTerm.student.lastNameTh}`, workSiteName: record.workSite.name, batchNumber: record.batchMember?.batch.documentNo ?? '—', status: record.status })), total, query.page, query.pageSize)
  } catch (error) { return toHttpError(error, correlationId) }
})
