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
    const where: Prisma.OrganizationWhereInput = { isActive: true, ...(query.province ? { workSites: { some: { province: query.province } } } : {}), ...(query.region ? { workSites: { some: { region: query.region } } } : {}), ...(query.search ? { OR: [{ nameTh: { contains: query.search } }, { nameEn: { contains: query.search } }, { taxId: { contains: query.search } }, { workSites: { some: { province: { contains: query.search } } } }] } : {}) }
    const [rows, total] = await prisma.$transaction([prisma.organization.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { workSites: { where: { isActive: true }, select: { id: true, province: true, region: true } }, _count: { select: { workSites: true } } }, orderBy: [{ nameTh: query.order ?? 'asc' }, { id: 'asc' }] }), prisma.organization.count({ where })])
    return pageEnvelope(rows.map(row => ({ id: row.id, nameTh: row.nameTh, taxId: row.taxId, workSiteCount: row._count.workSites, provinces: [...new Set(row.workSites.map(site => site.province))].join(', '), regions: [...new Set(row.workSites.map(site => site.region))].join(', '), capabilities: { edit: actor.role === 'ADMIN', merge: actor.role === 'ADMIN' } })), total, query.page, query.pageSize)
  } catch (error) { return toHttpError(error, correlationId) }
})
