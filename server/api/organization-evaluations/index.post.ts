import { defineEventHandler, readBody } from 'h3'
import { organizationEvaluationDraftSchema } from '../../../shared/schemas/evaluation'
import { saveOrganizationEvaluationDraft } from '../../services/organization-evaluation-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { return await saveOrganizationEvaluationDraft(prisma, await getSessionActor(event), parseStrict(organizationEvaluationDraftSchema, await readBody(event))) } catch (error) { return toHttpError(error, correlationId) } })
