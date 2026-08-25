import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { evaluationCorrectionSchema } from '../../../../shared/schemas/evaluation'
import { DomainError } from '../../../domain/errors'
import { runIdempotent } from '../../../services/idempotency-service'
import { correctStudentEvaluation } from '../../../services/student-evaluation-draft-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const id = getRouterParam(event, 'id')
    if (!id) throw new DomainError('BAD_REQUEST', 'Evaluation id is required')
    const actor = await getSessionActor(event)
    const key = requireIdempotencyKey(event)
    const body = parseStrict(evaluationCorrectionSchema, await readBody(event))
    return await runIdempotent({ actorId: actor.userId, operation: 'STUDENT_EVALUATION_CORRECT', key, request: { id, ...body }, work: () => correctStudentEvaluation(prisma, actor, { evaluationId: id, ...body }) })
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
