import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../domain/errors'
import { requireRole } from '../../policies/authorization'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    requireRole(await getSessionActor(event), 'ADMIN')
    const id = getRouterParam(event, 'id')
    const item = id ? await prisma.auditLog.findUnique({ where: { id } }) : null
    if (!item) throw new DomainError('NOT_FOUND', 'Audit log was not found')
    return item
  } catch (error) { return toHttpError(error, correlationId) }
})
