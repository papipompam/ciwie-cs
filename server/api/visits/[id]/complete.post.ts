import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { visitLifecycleSchema } from '../../../../shared/schemas/commands'
import { DomainError } from '../../../domain/errors'
import { runIdempotent } from '../../../services/idempotency-service'
import { changeVisitSchedule } from '../../../services/operation-command-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const visitId = getRouterParam(event, 'id')
    if (!visitId) throw new DomainError('BAD_REQUEST', 'Visit id is required')
    const body = parseStrict(visitLifecycleSchema, await readBody(event))
    const idempotency = { actorId: actor.userId, operation: 'VISIT_COMPLETE', key }
    return await runIdempotent({ ...idempotency, request: { visitId, ...body }, work: () => changeVisitSchedule(prisma, actor, { visitId, action: 'COMPLETE', ...body, idempotency }) })
  } catch (error) { return toHttpError(error, correlationId) }
})
