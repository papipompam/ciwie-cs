import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { placementReverseSchema } from '../../../../shared/schemas/commands'
import { DomainError } from '../../../domain/errors'
import { runIdempotent } from '../../../services/idempotency-service'
import { changePlacement } from '../../../services/operation-command-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const placementId = getRouterParam(event, 'id')
    if (!placementId) throw new DomainError('BAD_REQUEST', 'Placement id is required')
    const body = parseStrict(placementReverseSchema, await readBody(event))
    const idempotency = { actorId: actor.userId, operation: 'PLACEMENT_REVERSE', key }
    return await runIdempotent({ ...idempotency, request: { placementId, ...body }, work: () => changePlacement(prisma, actor, { placementId, action: 'REVERSE', ...body, idempotency }) })
  } catch (error) { return toHttpError(error, correlationId) }
})
