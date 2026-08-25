import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { adminUserCommandSchema } from '../../../../../shared/schemas/admin-identity'
import { DomainError } from '../../../../domain/errors'
import { createPasswordReset } from '../../../../services/admin-identity-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../../../utils/http'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const userId = getRouterParam(event, 'userId')
    if (!userId) throw new DomainError('BAD_REQUEST', 'User id is required')
    const body = parseStrict(adminUserCommandSchema, await readBody(event))
    return await createPasswordReset(prisma, actor, userId, body.reason)
  } catch (error) { return toHttpError(error, correlationId) }
})
