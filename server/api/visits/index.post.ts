import { defineEventHandler, readBody } from 'h3'
import { visitScheduleSchema } from '../../../shared/schemas/visit'
import { scheduleVisit } from '../../services/visit-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../utils/http'
import { getWorkflowRepositories } from '../../utils/workflow-context'
import { runIdempotent } from '../../services/idempotency-service'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const key = requireIdempotencyKey(event)
    const actor = await getSessionActor(event)
    const body = parseStrict(visitScheduleSchema, await readBody(event))
    const idempotency = { actorId: actor.userId, operation: 'VISIT_SCHEDULE', key }
    return await runIdempotent({ ...idempotency, request: body, work: () => scheduleVisit(getWorkflowRepositories(event).visits, actor, { ...body, idempotency }) })
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
