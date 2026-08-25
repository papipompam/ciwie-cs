import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { companyRequirementSchema } from '../../../../shared/schemas/visit'
import { DomainError } from '../../../domain/errors'
import { addCompanyRequirement } from '../../../services/visit-resource-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const visitId = getRouterParam(event, 'id'); if (!visitId) throw new DomainError('BAD_REQUEST', 'Visit id is required'); return await addCompanyRequirement(prisma, await getSessionActor(event), { visitId, ...parseStrict(companyRequirementSchema, await readBody(event)) }) } catch (error) { return toHttpError(error, correlationId) } })
