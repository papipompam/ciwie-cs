import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { deliverySendSchema } from '../../../../shared/schemas/commands'
import { DomainError } from '../../../domain/errors'
import { sendDelivery } from '../../../services/document-command-service'
import { runIdempotent } from '../../../services/idempotency-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const deliveryId = getRouterParam(event, 'id')
    if (!deliveryId) throw new DomainError('BAD_REQUEST', 'Delivery id is required')
    const key = requireIdempotencyKey(event)
    const body = parseStrict(deliverySendSchema, await readBody(event))
    const idempotency = { actorId: actor.userId, operation: 'DELIVERY_SEND', key }
    return await runIdempotent({ ...idempotency, request: { deliveryId, ...body }, work: () => sendDelivery(prisma, actor, { deliveryId, ...body, idempotency }) })
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
