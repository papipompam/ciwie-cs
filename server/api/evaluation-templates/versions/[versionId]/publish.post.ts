import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { evaluationTemplatePublishSchema } from '../../../../../shared/schemas/evaluation-template'
import { DomainError } from '../../../../domain/errors'
import { publishEvaluationTemplateVersion } from '../../../../services/evaluation-template-service'
import { runIdempotent } from '../../../../services/idempotency-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../../utils/http'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const versionId = getRouterParam(event, 'versionId')
    if (!versionId) throw new DomainError('BAD_REQUEST', 'Template version id is required')
    const body = parseStrict(evaluationTemplatePublishSchema, await readBody(event))
    return await runIdempotent({ actorId: actor.userId, operation: 'EVALUATION_TEMPLATE_PUBLISH', key, request: { versionId, ...body }, work: () => publishEvaluationTemplateVersion(prisma, actor, versionId) })
  } catch (error) { return toHttpError(error, correlationId) }
})
