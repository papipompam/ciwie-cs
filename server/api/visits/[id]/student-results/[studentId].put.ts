import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { supervisionResultSchema } from '../../../../../shared/schemas/visit'
import { DomainError } from '../../../../domain/errors'
import { saveSupervisionResult } from '../../../../services/supervision-result-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../../../utils/http'
import { prisma } from '../../../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const visitId = getRouterParam(event, 'id'); const studentTermId = getRouterParam(event, 'studentId'); if (!visitId || !studentTermId) throw new DomainError('BAD_REQUEST', 'Visit and student ids are required'); return await saveSupervisionResult(prisma, await getSessionActor(event), { visitId, studentTermId, ...parseStrict(supervisionResultSchema, await readBody(event)) }) } catch (error) { return toHttpError(error, correlationId) } })
