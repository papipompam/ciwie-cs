import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { assignDeliveryOwnerSchema } from '../../../../shared/schemas/document'
import { DomainError } from '../../../domain/errors'
import { assignDeliveryOwner } from '../../../services/document-resource-service'
import { runIdempotent } from '../../../services/idempotency-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const deliveryId = getRouterParam(event, 'id'); if (!deliveryId) throw new DomainError('BAD_REQUEST', 'Delivery id is required'); const actor = await getSessionActor(event); const body = parseStrict(assignDeliveryOwnerSchema, await readBody(event)); const key = requireIdempotencyKey(event); const idempotency = { actorId: actor.userId, operation: 'DELIVERY_ASSIGN_OWNER', key }; return await runIdempotent({ ...idempotency, request: { deliveryId, ...body }, work: () => assignDeliveryOwner(prisma, actor, { deliveryId, ...body, idempotency }) }) } catch (error) { return toHttpError(error, correlationId) } })
