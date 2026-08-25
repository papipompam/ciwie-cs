import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { documentRevisionSchema } from '../../../../shared/schemas/commands'
import { DomainError } from '../../../domain/errors'
import { addDocumentRevision } from '../../../services/document-command-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const actor = await getSessionActor(event); const batchId = getRouterParam(event, 'id'); if (!batchId) throw new DomainError('BAD_REQUEST', 'Batch id is required'); return await addDocumentRevision(prisma, actor, { batchId, ...parseStrict(documentRevisionSchema, await readBody(event)) }) } catch (error) { return toHttpError(error, correlationId) } })
