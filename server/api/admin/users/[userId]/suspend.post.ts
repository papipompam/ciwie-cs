import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { adminUserCommandSchema } from '../../../../../shared/schemas/admin-identity'
import { DomainError } from '../../../../domain/errors'
import { changeUserStatus } from '../../../../services/admin-identity-service'
import { runIdempotent } from '../../../../services/idempotency-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../../utils/http'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const userId = getRouterParam(event, 'userId')
    if (!userId) throw new DomainError('BAD_REQUEST', 'User id is required')
    const body = parseStrict(adminUserCommandSchema, await readBody(event))
    return await runIdempotent({ actorId: actor.userId, operation: 'USER_SUSPEND', key, request: { userId, ...body }, work: () => changeUserStatus(prisma, actor, userId, 'SUSPEND', body.reason) })
  } catch (error) { return toHttpError(error, correlationId) }
})

