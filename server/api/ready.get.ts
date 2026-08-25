import { defineEventHandler } from 'h3'
import { prisma } from '../utils/prisma'
import { getCorrelationId, toHttpError } from '../utils/http'
import { DomainError } from '../domain/errors'
import { checkRuntimeReadiness } from '../services/readiness-service'

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig(event)
    const dependencies = await checkRuntimeReadiness(prisma, config.storage, config.antivirus)
    return { status: 'ready', ...dependencies, timestamp: new Date().toISOString() }
  } catch {
    return toHttpError(new DomainError('DEPENDENCY_UNAVAILABLE', 'One or more runtime dependencies are not ready'), getCorrelationId(event))
  }
})
