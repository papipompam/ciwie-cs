import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { removeBatchMemberSchema } from '../../../../shared/schemas/document'
import { DomainError } from '../../../domain/errors'
import { removeDocumentBatchMember } from '../../../services/document-batch-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../../utils/http'
import { getWorkflowRepositories } from '../../../utils/workflow-context'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const batchId = getRouterParam(event, 'id')
    if (!batchId) throw new DomainError('BAD_REQUEST', 'Batch id is required')
    const body = parseStrict(removeBatchMemberSchema, await readBody(event))
    return await removeDocumentBatchMember(getWorkflowRepositories(event).documentBatches, actor, { batchId, ...body })
  } catch (error) { return toHttpError(error, correlationId) }
})
