import { defineEventHandler, readBody } from 'h3'
import { exportRequestSchema } from '../../../shared/schemas/import-export'
import { createExportJob } from '../../services/export-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => { const correlationId = getCorrelationId(event); try { const body = parseStrict(exportRequestSchema, await readBody(event)); return await createExportJob(prisma, await getSessionActor(event), body) } catch (error) { return toHttpError(error, correlationId) } })
