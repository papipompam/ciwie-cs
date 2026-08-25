import { defineEventHandler, readBody } from 'h3'
import { organizationCreateSchema } from '../../../shared/schemas/organization'
import { createOrganization } from '../../services/organization-service'
import { runIdempotent } from '../../services/idempotency-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try { const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const body = parseStrict(organizationCreateSchema, await readBody(event)); return await runIdempotent({ actorId: actor.userId, operation: 'ORGANIZATION_CREATE', key, request: body, work: () => createOrganization(prisma, actor, body) }) }
  catch (error) { return toHttpError(error, correlationId) }
})
