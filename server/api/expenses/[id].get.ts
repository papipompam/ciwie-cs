import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../domain/errors'
import { requireRole } from '../../policies/authorization'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); requireRole(actor, 'ADMIN')
    const id = getRouterParam(event, 'id')
    const item = id ? await prisma.expense.findUnique({ where: { id }, include: { visit: { include: { workSite: true } }, versions: { orderBy: { createdAt: 'desc' } } } }) : null
    if (!item) throw new DomainError('NOT_FOUND', 'Expense was not found')
    return { ...item, round: item.round === 'ROUND_1' ? 1 : 2, travelAmount: item.travelAmount.toNumber(), lodgingAmount: item.lodgingAmount.toNumber(), mealAmount: item.mealAmount.toNumber(), totalAmount: item.totalAmount.toNumber(), capabilities: { correct: true } }
  } catch (error) { return toHttpError(error, correlationId) }
})
