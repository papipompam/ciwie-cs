import { defineEventHandler, readBody } from 'h3'
import { createDocumentBatchSchema } from '../../../shared/schemas/document'
import { createDocumentBatch } from '../../services/document-resource-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { return await createDocumentBatch(prisma, await getSessionActor(event), parseStrict(createDocumentBatchSchema, await readBody(event))) } catch (error) { return toHttpError(error, correlationId) } })
