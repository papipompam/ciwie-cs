import { defineEventHandler, readBody } from 'h3'
import { createDocumentRequestSchema } from '../../../shared/schemas/document'
import { createDocumentRequest } from '../../services/document-resource-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const body = parseStrict(createDocumentRequestSchema, await readBody(event)); return await createDocumentRequest(prisma, await getSessionActor(event), body.applicationId) } catch (error) { return toHttpError(error, correlationId) } })
