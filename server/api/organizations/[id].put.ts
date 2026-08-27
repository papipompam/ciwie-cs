import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { organizationUpdateSchema } from '../../../shared/schemas/organization'
import { DomainError } from '../../domain/errors'
import { updateOrganization } from '../../services/organization-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const id = getRouterParam(event, 'id'); if (!id) throw new DomainError('BAD_REQUEST', 'Organization id is required'); return await updateOrganization(prisma, await getSessionActor(event), id, parseStrict(organizationUpdateSchema, await readBody(event))) } catch (error) { return toHttpError(error, correlationId) } })
