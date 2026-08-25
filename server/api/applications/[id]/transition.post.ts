import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { applicationTransitionSchema } from '../../../../shared/schemas/application'
import { DomainError } from '../../../domain/errors'
import { transitionApplication } from '../../../services/application-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { getWorkflowRepositories } from '../../../utils/workflow-context'
import { runIdempotent } from '../../../services/idempotency-service'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const key = requireIdempotencyKey(event)
    const actor = await getSessionActor(event)
    const applicationId = getRouterParam(event, 'id')
    if (!applicationId) throw new DomainError('BAD_REQUEST', 'Application id is required')
    const body = parseStrict(applicationTransitionSchema, await readBody(event))
    return await runIdempotent({ actorId: actor.userId, operation: 'APPLICATION_TRANSITION', key, request: { applicationId, ...body }, work: () => transitionApplication(getWorkflowRepositories(event).applications, actor, { applicationId, ...body }) })
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
