import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { responseConfirmSchema } from '../../../../shared/schemas/response'
import { DomainError } from '../../../domain/errors'
import { confirmResponseAndPlacements } from '../../../services/response-placement-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { getWorkflowRepositories } from '../../../utils/workflow-context'
import { runIdempotent } from '../../../services/idempotency-service'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const key = requireIdempotencyKey(event)
    const actor = await getSessionActor(event)
    const responseId = getRouterParam(event, 'id')
    if (!responseId) throw new DomainError('BAD_REQUEST', 'Response id is required')
    const body = parseStrict(responseConfirmSchema, await readBody(event))
    const idempotency = { actorId: actor.userId, operation: 'RESPONSE_CONFIRM', key }
    return await runIdempotent({ ...idempotency, request: { responseId, ...body }, work: () => confirmResponseAndPlacements(getWorkflowRepositories(event).responses, actor, { responseId, ...body, idempotency }) })
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
