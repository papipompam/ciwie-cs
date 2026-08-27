import type { Prisma } from '@prisma/client'
import { defineEventHandler } from 'h3'
import { requireRole } from '../../policies/authorization'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { listQuery, pageEnvelope } from '../../utils/list-query'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); requireRole(actor, 'LECTURER', 'ADMIN'); const query = listQuery(event)
    const where: Prisma.LecturerProfileWhereInput = { ...(query.status ? { user: { status: query.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' } } : {}), ...(query.search ? { OR: [{ employeeCode: { contains: query.search } }, { firstNameTh: { contains: query.search } }, { lastNameTh: { contains: query.search } }, { user: { email: { contains: query.search } } }] } : {}) }
    const direction = query.order ?? 'asc'
    const orderBy: Prisma.LecturerProfileOrderByWithRelationInput[] = query.sort === 'employeeCode' ? [{ employeeCode: direction }, { id: 'asc' }] : query.sort === 'displayName' ? [{ firstNameTh: direction }, { lastNameTh: direction }, { id: 'asc' }] : query.sort === 'status' ? [{ user: { status: direction } }, { id: 'asc' }] : [{ firstNameTh: 'asc' }, { lastNameTh: 'asc' }]
    const [rows, total] = await prisma.$transaction([prisma.lecturerProfile.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy, include: { user: { select: { email: true, status: true } } } }), prisma.lecturerProfile.count({ where })])
    return pageEnvelope(rows.map(row => ({ id: row.id, employeeCode: row.employeeCode || '—', displayName: `${row.firstNameTh} ${row.lastNameTh}`, email: row.user.email, phone: row.phone || '—', status: row.user.status })), total, query.page, query.pageSize)
  } catch (error) { return toHttpError(error, correlationId) }
})
