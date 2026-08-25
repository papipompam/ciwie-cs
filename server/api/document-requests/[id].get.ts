import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../domain/errors'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const id = getRouterParam(event, 'id')
    const item = id ? await prisma.documentRequest.findFirst({
      where: { id, ...(actor.role === 'STUDENT' ? { studentTermId: actor.studentTermId } : actor.role === 'LECTURER' ? { coopTerm: { isActive: true } } : {}) },
      include: { application: true, workSite: { include: { organization: true } }, studentTerm: { include: { student: true, coopTerm: true } }, batchMember: { include: { batch: true } } },
    }) : null
    if (!item) throw new DomainError('NOT_FOUND', 'Document request was not found')
    return item
  } catch (error) { return toHttpError(error, correlationId) }
})
