import { defineEventHandler, getQuery } from 'h3'
import { organizationSuggestionQuerySchema } from '../../../shared/schemas/organization'
import { suggestOrganizationDuplicates } from '../../services/organization-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try { const actor = await getSessionActor(event); const query = parseStrict(organizationSuggestionQuerySchema, getQuery(event)); return await suggestOrganizationDuplicates(prisma, actor, query.name, query.taxId) }
  catch (error) { return toHttpError(error, correlationId) }
})

