import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { deliveryCreateSchema } from '../../../../shared/schemas/commands'
import { DomainError } from '../../../domain/errors'
import { createDelivery } from '../../../services/document-command-service'
import { runIdempotent } from '../../../services/idempotency-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const batchId = getRouterParam(event, 'id'); if (!batchId) throw new DomainError('BAD_REQUEST', 'Batch id is required'); const body = parseStrict(deliveryCreateSchema, await readBody(event)); const idempotency = { actorId: actor.userId, operation: 'DOCUMENT_DELIVERY_CREATE', key }; return await runIdempotent({ ...idempotency, request: { batchId, ...body }, work: () => createDelivery(prisma, actor, { batchId, ...body, idempotency }) }) } catch (error) { return toHttpError(error, correlationId) } })
