import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { addBatchMemberSchema } from '../../../../shared/schemas/document'
import { DomainError } from '../../../domain/errors'
import { addDocumentBatchMember } from '../../../services/document-batch-service'
import { getCorrelationId, getSessionActor, parseStrict, requireIdempotencyKey, toHttpError } from '../../../utils/http'
import { getWorkflowRepositories } from '../../../utils/workflow-context'
import { runIdempotent } from '../../../services/idempotency-service'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const key = requireIdempotencyKey(event)
    const actor = await getSessionActor(event)
    const batchId = getRouterParam(event, 'id')
    if (!batchId) throw new DomainError('BAD_REQUEST', 'Batch id is required')
    const body = parseStrict(addBatchMemberSchema, await readBody(event))
    return await runIdempotent({ actorId: actor.userId, operation: 'DOCUMENT_BATCH_ADD_MEMBER', key, request: { batchId, ...body }, work: () => addDocumentBatchMember(getWorkflowRepositories(event).documentBatches, actor, { batchId, ...body }) })
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
