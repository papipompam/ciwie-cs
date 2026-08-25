import { defineEventHandler, readBody } from 'h3'
import { profileUpdateSchema } from '../../../shared/schemas/admin-identity'
import { updateOwnProfile } from '../../services/admin-identity-service'
import { getCorrelationId, getSessionActor, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const actor = await getSessionActor(event)
    return await updateOwnProfile(prisma, actor, parseStrict(profileUpdateSchema, await readBody(event)))
  } catch (error) { return toHttpError(error, correlationId) }
})

