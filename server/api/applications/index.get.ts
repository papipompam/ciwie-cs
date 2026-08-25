import type { Prisma } from '@prisma/client'
import { defineEventHandler } from 'h3'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { listQuery, pageEnvelope } from '../../utils/list-query'
import { prisma } from '../../utils/prisma'
import { allowedApplicationTransitions } from '../../services/application-service'

const statuses = new Set(['SUBMITTED', 'WAITING_RESPONSE', 'INTERVIEW_PENDING', 'PRELIMINARY_ACCEPTED', 'REJECTED', 'CANCELLED'])

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const query = listQuery(event)
    const where: Prisma.ApplicationWhereInput = {
      ...(actor.role === 'STUDENT' ? { studentTermId: actor.studentTermId } : actor.role === 'LECTURER' ? { coopTerm: { isActive: true } } : {}),
      ...(query.status && statuses.has(query.status) ? { status: query.status as Prisma.EnumApplicationStatusFilter['equals'] } : {}),
      ...(query.search ? { OR: [
        { studentTerm: { student: { studentCode: { contains: query.search } } } },
        { studentTerm: { student: { firstNameTh: { contains: query.search } } } },
        { studentTerm: { student: { lastNameTh: { contains: query.search } } } },
        { workSite: { name: { contains: query.search } } },
        { workSite: { organization: { nameTh: { contains: query.search } } } },
      ] } : {}),
    }
    const direction = query.order ?? 'asc'
    const orderBy: Prisma.ApplicationOrderByWithRelationInput[] = !query.sort
      ? [{ appliedAt: 'desc' }, { id: 'desc' }]
      : query.sort === 'studentName' ? [{ studentTerm: { student: { firstNameTh: direction } } }, { id: 'asc' }]
        : query.sort === 'organizationName' ? [{ workSite: { organization: { nameTh: direction } } }, { id: 'asc' }]
          : query.sort === 'status' ? [{ status: direction }, { id: 'asc' }]
            : query.sort === 'updatedAt' ? [{ updatedAt: direction }, { id: 'asc' }]
              : [{ appliedAt: 'desc' }, { id: 'desc' }]
    const [records, total] = await prisma.$transaction([
      prisma.application.findMany({ where, include: { coopTerm: { select: { isActive: true } }, workSite: { include: { organization: true } }, studentTerm: { include: { student: true } } }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy }),
      prisma.application.count({ where }),
    ])
    return pageEnvelope(records.map((record) => {
      const allowedTransitions = allowedApplicationTransitions({ id: record.id, studentTermId: record.studentTermId, status: record.status, version: record.version, activeTerm: record.coopTerm.isActive }, actor)
      return { id: record.id, studentName: `${record.studentTerm.student.firstNameTh} ${record.studentTerm.student.lastNameTh}`, organizationName: record.workSite.organization.nameTh, workSiteName: record.workSite.name, status: record.status, updatedAt: record.updatedAt, allowedTransitions, capabilities: { transition: allowedTransitions.length > 0 } }
    }), total, query.page, query.pageSize)
  } catch (error) { return toHttpError(error, correlationId) }
})
