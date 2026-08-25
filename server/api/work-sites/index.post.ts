import { defineEventHandler, readBody } from 'h3'
import { workSiteCreateSchema } from '../../../shared/schemas/organization'
import { createWorkSite } from '../../services/organization-service'
import { runIdempotent } from '../../services/idempotency-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try { const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const body = parseStrict(workSiteCreateSchema, await readBody(event)); return await runIdempotent({ actorId: actor.userId, operation: 'WORK_SITE_CREATE', key, request: body, work: () => createWorkSite(prisma, actor, body) }) }
  catch (error) { return toHttpError(error, correlationId) }
})
