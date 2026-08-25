import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { responseSubmitSchema } from '../../../../shared/schemas/response'
import { DomainError } from '../../../domain/errors'
import { submitResponseReview } from '../../../services/response-placement-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { getWorkflowRepositories } from '../../../utils/workflow-context'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    requireIdempotencyKey(event)
    const actor = await getSessionActor(event)
    const responseId = getRouterParam(event, 'id')
    if (!responseId) throw new DomainError('BAD_REQUEST', 'Response id is required')
    const body = parseStrict(responseSubmitSchema, await readBody(event))
    return await submitResponseReview(getWorkflowRepositories(event).responses, actor, { responseId, ...body })
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
