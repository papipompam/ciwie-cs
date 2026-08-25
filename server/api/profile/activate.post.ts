import { defineEventHandler, readBody } from 'h3'
import { accountActivationSchema } from '../../../shared/schemas/admin-identity'
import { activateAccount } from '../../services/admin-identity-service'
import { getCorrelationId, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try { const body = parseStrict(accountActivationSchema, await readBody(event)); return await activateAccount(prisma, body.code, body.newPassword) }
  catch (error) { return toHttpError(error, correlationId) }
})

