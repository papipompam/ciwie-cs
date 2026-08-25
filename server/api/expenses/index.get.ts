import type { Prisma } from '@prisma/client'
import { defineEventHandler } from 'h3'
import { requireRole } from '../../policies/authorization'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { listQuery, pageEnvelope } from '../../utils/list-query'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); requireRole(actor, 'ADMIN'); const query = listQuery(event)
    const where: Prisma.ExpenseWhereInput = query.search ? { OR: [
      { visit: { workSite: { name: { contains: query.search } } } }, { visit: { workSite: { organization: { nameTh: { contains: query.search } } } } },
      { note: { contains: query.search } },
    ] } : {}
    const direction = query.order ?? 'asc'
    const orderBy: Prisma.ExpenseOrderByWithRelationInput[] = !query.sort ? [{ createdAt: 'desc' }, { id: 'desc' }]
      : query.sort === 'round' ? [{ round: direction }, { id: 'asc' }]
        : query.sort === 'visitDate' ? [{ visit: { visitDate: direction } }, { id: 'asc' }]
          : query.sort === 'total' ? [{ totalAmount: direction }, { id: 'asc' }]
            : [{ createdAt: 'desc' }, { id: 'desc' }]
    const [records, total] = await prisma.$transaction([
      prisma.expense.findMany({ where, include: { visit: { include: { workSite: true } } }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, orderBy }),
      prisma.expense.count({ where }),
    ])
    return pageEnvelope(records.map(record => ({ id: record.id, round: record.round === 'ROUND_1' ? 1 : 2, travelDays: record.travelDays, visitDate: record.visit.visitDate, workSiteName: record.visit.workSite.name, travel: record.travelAmount.toFixed(2), lodging: record.lodgingAmount.toFixed(2), meal: record.mealAmount.toFixed(2), total: record.totalAmount.toFixed(2), capabilities: { correct: true } })), total, query.page, query.pageSize)
  } catch (error) { return toHttpError(error, correlationId) }
})
