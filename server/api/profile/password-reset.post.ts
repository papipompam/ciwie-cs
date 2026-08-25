import { defineEventHandler, readBody } from 'h3'
import { passwordResetCompleteSchema } from '../../../shared/schemas/admin-identity'
import { completePasswordReset } from '../../services/admin-identity-service'
import { getCorrelationId, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try { const body = parseStrict(passwordResetCompleteSchema, await readBody(event)); return await completePasswordReset(prisma, body.token, body.newPassword) }
  catch (error) { return toHttpError(error, correlationId) }
})
