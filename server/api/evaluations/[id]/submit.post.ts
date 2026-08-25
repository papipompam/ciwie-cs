import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { evaluationDraftSchema } from '../../../../shared/schemas/evaluation'
import { DomainError } from '../../../domain/errors'
import { submitEvaluation } from '../../../services/evaluation-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { getWorkflowRepositories } from '../../../utils/workflow-context'
import { runIdempotent } from '../../../services/idempotency-service'

const submitBodySchema = evaluationDraftSchema.pick({ answers: true }).extend({ expectedVersion: evaluationDraftSchema.shape.expectedVersion.unwrap() }).strict()

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const key = requireIdempotencyKey(event)
    const actor = await getSessionActor(event)
    const evaluationId = getRouterParam(event, 'id')
    if (!evaluationId) throw new DomainError('BAD_REQUEST', 'Evaluation id is required')
    const body = parseStrict(submitBodySchema, await readBody(event))
    return await runIdempotent({ actorId: actor.userId, operation: 'EVALUATION_SUBMIT', key, request: { evaluationId, ...body }, work: () => submitEvaluation(getWorkflowRepositories(event).evaluations, actor, { evaluationId, ...body }) })
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
