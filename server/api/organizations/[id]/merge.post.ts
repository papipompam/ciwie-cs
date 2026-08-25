import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { organizationMergeSchema } from '../../../../shared/schemas/organization'
import { DomainError } from '../../../domain/errors'
import { runIdempotent } from '../../../services/idempotency-service'
import { mergeOrganization } from '../../../services/organization-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try { const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const sourceId = getRouterParam(event, 'id'); if (!sourceId) throw new DomainError('BAD_REQUEST', 'Source organization id is required'); const body = parseStrict(organizationMergeSchema, await readBody(event)); return await runIdempotent({ actorId: actor.userId, operation: 'ORGANIZATION_MERGE', key, request: { sourceId, ...body }, work: () => mergeOrganization(prisma, actor, sourceId, body.targetOrganizationId, body.reason) }) }
  catch (error) { return toHttpError(error, correlationId) }
})

