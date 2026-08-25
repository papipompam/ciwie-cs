import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { responseReturnSchema } from '../../../../shared/schemas/response'
import { DomainError } from '../../../domain/errors'
import { returnResponseToDraft } from '../../../services/response-placement-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { getWorkflowRepositories } from '../../../utils/workflow-context'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    requireIdempotencyKey(event)
    const actor = await getSessionActor(event)
    const responseId = getRouterParam(event, 'id')
    if (!responseId) throw new DomainError('BAD_REQUEST', 'Response id is required')
    const body = parseStrict(responseReturnSchema, await readBody(event))
    return await returnResponseToDraft(getWorkflowRepositories(event).responses, actor, { responseId, ...body })
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
