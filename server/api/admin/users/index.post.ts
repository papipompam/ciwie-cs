import { defineEventHandler, readBody } from 'h3'
import { lecturerAccountCreateSchema } from '../../../../shared/schemas/admin-identity'
import { createLecturerAccount } from '../../../services/admin-identity-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try { const actor = await getSessionActor(event); const body = parseStrict(lecturerAccountCreateSchema, await readBody(event)); return await createLecturerAccount(prisma, actor, body) }
  catch (error) { return toHttpError(error, correlationId) }
})
