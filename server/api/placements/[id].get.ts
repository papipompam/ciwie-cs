import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../domain/errors'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const id = getRouterParam(event, 'id')
    const item = id ? await prisma.placement.findFirst({
      where: { id, ...(actor.role === 'STUDENT' ? { studentTermId: actor.studentTermId } : actor.role === 'LECTURER' ? { studentTerm: { coopTerm: { isActive: true } } } : {}) },
      include: { currentWorkSite: { include: { organization: true } }, studentTerm: { include: { student: true, coopTerm: true } }, versions: { orderBy: { createdAt: 'desc' } } },
    }) : null
    if (!item) throw new DomainError('NOT_FOUND', 'Placement was not found')
    const canChange = actor.role === 'ADMIN' || (actor.role === 'LECTURER' && item.studentTerm.coopTerm.isActive)
    return { ...item, workSiteId: item.currentWorkSiteId, capabilities: { correct: canChange && item.status === 'ACTIVE', reverse: canChange && item.status === 'ACTIVE' } }
  } catch (error) { return toHttpError(error, correlationId) }
})
