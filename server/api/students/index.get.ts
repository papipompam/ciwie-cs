import { defineEventHandler, getQuery } from 'h3'
import { paginationSchema } from '../../../shared/schemas/common'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../policies/authorization'
import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); requireRole(actor, 'LECTURER', 'ADMIN'); const query = parseStrict(paginationSchema, getQuery(event))
    const where = { ...(query.search ? { OR: [{ studentCode: { contains: query.search } }, { firstNameTh: { contains: query.search } }, { lastNameTh: { contains: query.search } }] } : {}), ...(query.status ? { user: { status: query.status === 'ACTIVE' ? 'ACTIVE' as const : 'SUSPENDED' as const } } : {}), ...(actor.role === 'LECTURER' ? { enrollments: { some: { coopTerm: { isActive: true } } } } : {}) }
    const direction = query.order ?? 'asc'
    const orderBy: Prisma.StudentProfileOrderByWithRelationInput[] = !query.sort ? [{ createdAt: 'desc' }, { id: 'desc' }]
      : query.sort === 'studentCode' ? [{ studentCode: direction }, { id: 'asc' }]
        : query.sort === 'displayName' ? [{ firstNameTh: direction }, { lastNameTh: direction }, { id: 'asc' }]
          : query.sort === 'status' ? [{ user: { status: direction } }, { id: 'asc' }]
            : query.sort === 'coopTerm' ? [{ enrollments: { _count: direction } }, { id: 'asc' }]
              : [{ createdAt: 'desc' }, { id: 'desc' }]
    const [records, total] = await prisma.$transaction([
      prisma.studentProfile.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy, include: { user: { select: { status: true } }, enrollments: { where: { coopTerm: { isActive: true } }, include: { coopTerm: true }, take: 1 } } }),
      prisma.studentProfile.count({ where }),
    ])
    const items = records.map(record => ({ id: record.id, studentCode: record.studentCode, displayName: `${record.firstNameTh} ${record.lastNameTh}`, coopTerm: record.enrollments[0]?.coopTerm.name ?? '—', status: record.user.status, phone: record.phone }))
    return { items, total, page: query.page, pageSize: query.pageSize }
  } catch (error) { return toHttpError(error, correlationId) }
})
