import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { evaluationTemplateVersionCreateSchema } from '../../../../shared/schemas/evaluation-template'
import { DomainError } from '../../../domain/errors'
import { createEvaluationTemplateVersion } from '../../../services/evaluation-template-service'
import { runIdempotent } from '../../../services/idempotency-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event); const key = requireIdempotencyKey(event); const templateId = getRouterParam(event, 'templateId')
    if (!templateId) throw new DomainError('BAD_REQUEST', 'Template id is required')
    const body = parseStrict(evaluationTemplateVersionCreateSchema, await readBody(event))
    return await runIdempotent({ actorId: actor.userId, operation: 'EVALUATION_TEMPLATE_VERSION_CREATE', key, request: { templateId, ...body }, work: () => createEvaluationTemplateVersion(prisma, actor, templateId, body) })
  } catch (error) { return toHttpError(error, correlationId) }
})

