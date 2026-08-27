import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { documentRequestTransitionSchema } from '../../../../shared/schemas/document'
import { DomainError } from '../../../domain/errors'
import { transitionDocumentRequest } from '../../../services/document-resource-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const id = getRouterParam(event, 'id')
    if (!id) throw new DomainError('BAD_REQUEST', 'Document request id is required')
    const body = parseStrict(documentRequestTransitionSchema, await readBody(event))
    return await transitionDocumentRequest(prisma, actor, id, body.to, body.reason)
  } catch (error) { return toHttpError(error, correlationId) }
})
