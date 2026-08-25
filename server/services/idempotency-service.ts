import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { DomainError } from '../domain/errors'
import { prisma } from '../utils/prisma'

const CLAIM_TTL_MS = 5 * 60_000

function requestHash(input: unknown): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

export function resolveExistingIdempotency<T>(existing: { requestHash: string, status: string, responseBody: unknown, expiresAt: Date }, hash: string, now = new Date()): { replay?: T, replace: boolean } {
  if (existing.requestHash !== hash) throw new DomainError('CONFLICT', 'Idempotency key was already used for a different request')
  if (existing.status === 'SUCCEEDED' && existing.responseBody !== null) return { replay: existing.responseBody as T, replace: false }
  if (existing.expiresAt <= now) return { replace: true }
  throw new DomainError('CONFLICT', 'An identical request is already being processed')
}

export async function runIdempotent<T>(input: {
  actorId: string
  operation: string
  key: string
  request: unknown
  work: () => Promise<T>
}): Promise<T> {
  const hash = requestHash(input.request)
  try {
    await prisma.idempotencyRecord.create({ data: {
      actorId: input.actorId,
      operation: input.operation,
      idempotencyKey: input.key,
      requestHash: hash,
      expiresAt: new Date(Date.now() + CLAIM_TTL_MS),
    } })
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
    const existing = await prisma.idempotencyRecord.findUnique({ where: {
      actorId_operation_idempotencyKey: { actorId: input.actorId, operation: input.operation, idempotencyKey: input.key },
    } })
    if (!existing) throw new DomainError('CONFLICT', 'Idempotency state could not be loaded')
    const resolution = resolveExistingIdempotency<T>(existing, hash)
    if ('replay' in resolution) return resolution.replay as T
    const replaced = await prisma.idempotencyRecord.updateMany({
      where: { id: existing.id, expiresAt: { lte: new Date() } },
      data: { requestHash: hash, status: 'IN_PROGRESS', responseStatus: null, responseBody: Prisma.JsonNull, expiresAt: new Date(Date.now() + CLAIM_TTL_MS) },
    })
    if (replaced.count !== 1) throw new DomainError('CONFLICT', 'An identical request is already being processed')
  }
  try {
    const result = await input.work()
    await prisma.idempotencyRecord.update({
      where: { actorId_operation_idempotencyKey: { actorId: input.actorId, operation: input.operation, idempotencyKey: input.key } },
      data: { status: 'SUCCEEDED', responseStatus: 200, responseBody: result as Prisma.InputJsonValue },
    })
    return result
  } catch (error) {
    await prisma.idempotencyRecord.deleteMany({ where: { actorId: input.actorId, operation: input.operation, idempotencyKey: input.key, status: 'IN_PROGRESS' } })
    throw error
  }
}
