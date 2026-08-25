import { defineEventHandler } from 'h3'
import { getCorrelationId, toHttpError } from '../../utils/http'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    await clearUserSession(event)
    return { success: true }
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
