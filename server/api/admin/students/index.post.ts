import { defineEventHandler, readBody } from 'h3'
import { studentAccountCreateSchema } from '../../../../shared/schemas/admin-identity'
import { createStudentAccount } from '../../../services/admin-identity-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../../utils/http'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try { return await createStudentAccount(prisma, await getSessionActor(event), parseStrict(studentAccountCreateSchema, await readBody(event))) }
  catch (error) { return toHttpError(error, correlationId) }
})
