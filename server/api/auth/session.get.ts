import { defineEventHandler } from 'h3'
import { DomainError } from '../../domain/errors'
import { getCorrelationId, getSessionActor, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const user = await prisma.user.findUnique({ where: { id: actor.userId }, select: { role: true, status: true, sessionVersion: true } })
    if (!user || user.status !== 'ACTIVE' || user.sessionVersion !== actor.sessionVersion) {
      await clearUserSession(event)
      throw new DomainError('UNAUTHENTICATED', 'Session is no longer valid')
    }
    return { user: actor }
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
