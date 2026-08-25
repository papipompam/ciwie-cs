import { defineEventHandler, readBody } from 'h3'
import { evaluationTemplateCreateSchema } from '../../../shared/schemas/evaluation-template'
import { createEvaluationTemplate } from '../../services/evaluation-template-service'
import { runIdempotent } from '../../services/idempotency-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const body = parseStrict(evaluationTemplateCreateSchema, await readBody(event))
    return await runIdempotent({ actorId: actor.userId, operation: 'EVALUATION_TEMPLATE_CREATE', key, request: body, work: () => createEvaluationTemplate(prisma, actor, body) })
  } catch (error) { return toHttpError(error, correlationId) }
})

