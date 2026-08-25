import { defineEventHandler, getRequestIP, readBody } from 'h3'
import { loginSchema } from '../../../shared/schemas/auth'
import { PrismaAuthRepository } from '../../repositories/auth-repository'
import { authenticate, clearLoginAttempts, consumeLoginAttempt, normalizeEmail } from '../../services/auth-service'
import { getCorrelationId, parseStrict, toHttpError } from '../../utils/http'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const correlationId = getCorrelationId(event)
  try {
    const body = parseStrict(loginSchema, await readBody(event))
    const attemptKey = `${getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'}:${normalizeEmail(body.email)}`
    consumeLoginAttempt(attemptKey)
    const actor = await authenticate(new PrismaAuthRepository(prisma), body.email, body.password)
    await setUserSession(event, { user: actor, loggedInAt: new Date().toISOString() })
    clearLoginAttempts(attemptKey)
    return { user: actor }
  } catch (error) {
    return toHttpError(error, correlationId)
  }
})
