import { Prisma } from '@prisma/client'
import { defineEventHandler } from 'h3'
import { requireRole } from '../../policies/authorization'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { listQuery, pageEnvelope } from '../../utils/list-query'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); requireRole(actor, 'ADMIN'); const query = listQuery(event)
    const matchingActors = query.search ? await prisma.user.findMany({ where: { OR: [{ identifier: { contains: query.search } }, { email: { contains: query.search } }] }, select: { id: true }, take: 500 }) : []
    const where: Prisma.AuditLogWhereInput = query.search ? { OR: [
      { action: { contains: query.search } }, { entityType: { contains: query.search } }, { entityId: { contains: query.search } },
      { reason: { contains: query.search } }, { actorId: { in: matchingActors.map(item => item.id) } },
    ] } : {}
    const direction = query.order ?? 'asc'
    if (query.sort === 'actorName') {
      const search = query.search ? `%${query.search}%` : null
      const searchClause = search ? Prisma.sql`AND (a.action LIKE ${search} OR a.entity_type LIKE ${search} OR a.entity_id LIKE ${search} OR a.reason LIKE ${search} OR u.identifier LIKE ${search} OR u.email LIKE ${search})` : Prisma.empty
      const orderDirection = direction === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`
      const offset = (query.page - 1) * query.pageSize
      const [records, counts] = await Promise.all([
        prisma.$queryRaw<Array<{ id: string, actorId: string | null, action: string, entityType: string, entityId: string, requestId: string, reason: string | null, createdAt: Date, actorName: string | null }>>(Prisma.sql`
          SELECT a.id, a.actor_id AS actorId, a.action, a.entity_type AS entityType, a.entity_id AS entityId,
                 a.request_id AS requestId, a.reason, a.created_at AS createdAt, u.identifier AS actorName
          FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
          WHERE 1 = 1 ${searchClause}
          ORDER BY COALESCE(u.identifier, 'SYSTEM') ${orderDirection}, a.id ASC
          LIMIT ${query.pageSize} OFFSET ${offset}
        `),
        prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*) AS total FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id WHERE 1 = 1 ${searchClause}`),
      ])
      return pageEnvelope(records.map(record => ({ ...record, occurredAt: record.createdAt, actorName: record.actorName ?? 'SYSTEM' })), Number(counts[0]?.total ?? 0), query.page, query.pageSize)
    }
    const orderBy: Prisma.AuditLogOrderByWithRelationInput[] = !query.sort ? [{ createdAt: 'desc' }, { id: 'desc' }]
      : query.sort === 'occurredAt' ? [{ createdAt: direction }, { id: 'asc' }]
        : query.sort === 'action' ? [{ action: direction }, { id: 'asc' }]
          : [{ createdAt: 'desc' }, { id: 'desc' }]
    const [records, total] = await prisma.$transaction([
      prisma.auditLog.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy }), prisma.auditLog.count({ where }),
    ])
    const users = await prisma.user.findMany({ where: { id: { in: records.flatMap(record => record.actorId ? [record.actorId] : []) } }, select: { id: true, identifier: true } })
    const actorNames = new Map(users.map(user => [user.id, user.identifier]))
    return pageEnvelope(records.map(record => ({ ...record, occurredAt: record.createdAt, actorName: record.actorId ? actorNames.get(record.actorId) ?? record.actorId : 'SYSTEM' })), total, query.page, query.pageSize)
  } catch (error) { return toHttpError(error, correlationId) }
})
