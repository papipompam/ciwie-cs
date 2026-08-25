import { defineEventHandler, readBody } from 'h3'
import { profilePasswordChangeSchema } from '../../../shared/schemas/admin-identity'
import { changeOwnPassword } from '../../services/admin-identity-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    const body = parseStrict(profilePasswordChangeSchema, await readBody(event))
    await changeOwnPassword(prisma, actor, body.currentPassword, body.newPassword)
    await clearUserSession(event)
    return { changed: true, reauthenticationRequired: true }
  } catch (error) { return toHttpError(error, correlationId) }
})

