import { defineEventHandler, getRouterParam } from 'h3'
import { DomainError } from '../../../domain/errors'
import { acknowledgeVisit } from '../../../services/visit-resource-service'
import { getCorrelationId, getSessionActor, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const visitId = getRouterParam(event, 'id'); if (!visitId) throw new DomainError('BAD_REQUEST', 'Visit id is required'); return await acknowledgeVisit(prisma, await getSessionActor(event), visitId) } catch (error) { return toHttpError(error, correlationId) } })
