import { defineEventHandler, getQuery } from 'h3'
import { paginationSchema } from '../../../shared/schemas/common'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'
import { requireRole } from '../../policies/authorization'
import type { Prisma, UserStatus } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); requireRole(actor, 'LECTURER', 'ADMIN'); const query = parseStrict(paginationSchema, getQuery(event))
    const accountStatus = query.status === 'ACTIVE' || query.status === 'PENDING' || query.status === 'SUSPENDED' ? query.status as UserStatus : undefined
    const where: Prisma.StudentProfileWhereInput = { ...(query.search ? { OR: [{ studentCode: { contains: query.search } }, { firstNameTh: { contains: query.search } }, { lastNameTh: { contains: query.search } }] } : {}), ...(accountStatus ? { user: { status: accountStatus } } : {}), ...(actor.role === 'LECTURER' ? { enrollments: { some: { coopTerm: { isActive: true } } } } : {}) }
    const direction = query.order ?? 'asc'
    const orderBy: Prisma.StudentProfileOrderByWithRelationInput[] = !query.sort ? [{ createdAt: 'desc' }, { id: 'desc' }]
      : query.sort === 'studentCode' ? [{ studentCode: direction }, { id: 'asc' }]
        : query.sort === 'displayName' ? [{ firstNameTh: direction }, { lastNameTh: direction }, { id: 'asc' }]
          : query.sort === 'status' ? [{ user: { status: direction } }, { id: 'asc' }]
            : query.sort === 'coopTerm' ? [{ enrollments: { _count: direction } }, { id: 'asc' }]
              : [{ createdAt: 'desc' }, { id: 'desc' }]
    const [records, total] = await prisma.$transaction([
      prisma.studentProfile.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy, include: { user: { select: { email: true, status: true, lastLoginAt: true } }, enrollments: { where: { coopTerm: { isActive: true } }, include: { coopTerm: true }, take: 1 } } }),
      prisma.studentProfile.count({ where }),
    ])
    const items = records.map(record => ({ id: record.id, userId: record.userId, studentCode: record.studentCode, displayName: `${record.firstNameTh} ${record.lastNameTh}`, coopTerm: record.enrollments[0]?.coopTerm.name ?? '—', email: record.user.email, phone: record.phone ?? '—', status: record.user.status, lastLoginAt: record.user.lastLoginAt, capabilities: { edit: actor.role === 'ADMIN', account: actor.role === 'ADMIN' } }))
    return { items, total, page: query.page, pageSize: query.pageSize }
  } catch (error) { return toHttpError(error, correlationId) }
})
