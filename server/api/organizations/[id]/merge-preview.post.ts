import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { organizationMergePreviewSchema } from '../../../../shared/schemas/organization'
import { DomainError } from '../../../domain/errors'
import { previewOrganizationMerge } from '../../../services/organization-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try { const actor = await getSessionActor(event); const sourceId = getRouterParam(event, 'id'); if (!sourceId) throw new DomainError('BAD_REQUEST', 'Source organization id is required'); const body = parseStrict(organizationMergePreviewSchema, await readBody(event)); return await previewOrganizationMerge(prisma, actor, sourceId, body.targetOrganizationId) }
  catch (error) { return toHttpError(error, correlationId) }
})

