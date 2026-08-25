import { defineEventHandler, readBody } from 'h3'
import { createApplicationSchema } from '../../../shared/schemas/application'
import { createStudentApplication } from '../../services/organization-service'
import { runIdempotent } from '../../services/idempotency-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try { const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const body = parseStrict(createApplicationSchema, await readBody(event)); return await runIdempotent({ actorId: actor.userId, operation: 'APPLICATION_CREATE', key, request: body, work: () => createStudentApplication(prisma, actor, body) }) }
  catch (error) { return toHttpError(error, correlationId) }
})
