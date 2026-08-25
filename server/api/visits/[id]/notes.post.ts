import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { internalNoteSchema } from '../../../../shared/schemas/visit'
import { DomainError } from '../../../domain/errors'
import { addInternalNote } from '../../../services/visit-resource-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const visitId = getRouterParam(event, 'id'); if (!visitId) throw new DomainError('BAD_REQUEST', 'Visit id is required'); const body = parseStrict(internalNoteSchema, await readBody(event)); return await addInternalNote(prisma, await getSessionActor(event), visitId, body.content) } catch (error) { return toHttpError(error, correlationId) } })
