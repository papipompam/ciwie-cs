import { randomUUID } from 'node:crypto'
import { createError, getHeader, type EventHandlerRequest, type H3Event } from 'h3'
import type { ZodType } from 'zod'
import type { ApiErrorBody, SessionActor } from '../../shared/types/api'
import { DomainError } from '../domain/errors'
import { prisma } from './prisma'
import { assertPasswordChangeCompleted, assertSessionCurrent } from '../policies/authorization'

export function parseStrict<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (result.success) return result.data
  const fieldErrors: Record<string, string[]> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_root'
    ;(fieldErrors[key] ??= []).push(issue.message)
  }
  throw new DomainError('VALIDATION_FAILED', 'Request validation failed', fieldErrors)
}

export function getCorrelationId(event: H3Event<EventHandlerRequest>): string {
  const supplied = getHeader(event, 'x-correlation-id')?.trim()
  return supplied && /^[A-Za-z0-9._-]{8,100}$/.test(supplied) ? supplied : randomUUID()
}

export function toHttpError(error: unknown, correlationId: string): never {
  const domain = error instanceof DomainError
    ? error
    : new DomainError('BAD_REQUEST', 'The request could not be completed')
  const body: ApiErrorBody = {
    code: domain.code,
    message: domain.message,
    correlationId,
    ...(domain.fieldErrors ? { fieldErrors: domain.fieldErrors } : {}),
  }
  throw createError({ statusCode: domain.statusCode, statusMessage: domain.message, data: body })
}

export async function getSessionActor(event: H3Event<EventHandlerRequest>): Promise<SessionActor> {
  const session = await getUserSession(event)
  const actor = session.user as SessionActor | undefined
  if (!actor?.userId || !actor.active) throw new DomainError('UNAUTHENTICATED', 'Authentication is required')
  const current = await prisma.user.findUnique({ where: { id: actor.userId }, select: { role: true, status: true, sessionVersion: true, mustChangePassword: true } })
  try {
    assertSessionCurrent(actor, current)
  } catch (error) {
    await clearUserSession(event)
    throw error
  }
  assertPasswordChangeCompleted(Boolean(current?.mustChangePassword), event.path)
  return { ...actor, mustChangePassword: current?.mustChangePassword ?? actor.mustChangePassword }
}

export function requireIdempotencyKey(event: H3Event<EventHandlerRequest>): string {
  const key = getHeader(event, 'idempotency-key')?.trim()
  if (!key || key.length < 8 || key.length > 191) throw new DomainError('BAD_REQUEST', 'A valid Idempotency-Key header is required')
  return key
}
