import { defineEventHandler, readBody } from 'h3'
import { responseCreateSchema } from '../../../shared/schemas/response'
import { createSharedResponse } from '../../services/response-create-service'
import { runIdempotent } from '../../services/idempotency-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const body = parseStrict(responseCreateSchema, await readBody(event)); return await runIdempotent({ actorId: actor.userId, operation: 'RESPONSE_CREATE', key, request: body, work: () => createSharedResponse(prisma, actor, body) }) } catch (error) { return toHttpError(error, correlationId) } })
