import type { NotificationStatus, Prisma } from '@prisma/client'
import { defineEventHandler } from 'h3'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { listQuery, pageEnvelope } from '../../utils/list-query'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const query = listQuery(event)
    const status = query.status === 'READ' || query.status === 'UNREAD' ? query.status as NotificationStatus : undefined
    const where: Prisma.NotificationWhereInput = {
      recipientId: actor.userId,
      ...(status ? { status } : {}),
      ...(query.search ? { OR: [{ title: { contains: query.search } }, { body: { contains: query.search } }, { eventType: { contains: query.search } }] } : {}),
    }
    const direction = query.order ?? 'asc'
    const orderBy: Prisma.NotificationOrderByWithRelationInput[] = !query.sort ? [{ createdAt: 'desc' }, { id: 'desc' }]
      : query.sort === 'createdAt' ? [{ createdAt: direction }, { id: 'asc' }]
        : query.sort === 'title' ? [{ title: direction }, { id: 'asc' }]
          : query.sort === 'status' ? [{ status: direction }, { id: 'asc' }]
            : [{ createdAt: 'desc' }, { id: 'desc' }]
    const [items, total] = await prisma.$transaction([
      prisma.notification.findMany({ where, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy }), prisma.notification.count({ where }),
    ])
    return pageEnvelope(items, total, query.page, query.pageSize)
  } catch (error) { return toHttpError(error, correlationId) }
})
