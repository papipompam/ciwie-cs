import type { Prisma } from '@prisma/client'
import { DomainError } from '../domain/errors'

export interface IdempotencyIdentity {
  actorId: string
  operation: string
  key: string
}

export async function completeIdempotency(
  tx: Prisma.TransactionClient,
  identity: IdempotencyIdentity,
  response: unknown,
): Promise<void> {
  const changed = await tx.idempotencyRecord.updateMany({
    where: {
      actorId: identity.actorId,
      operation: identity.operation,
      idempotencyKey: identity.key,
      status: 'IN_PROGRESS',
    },
    data: { status: 'SUCCEEDED', responseStatus: 200, responseBody: response as Prisma.InputJsonValue },
  })
  if (changed.count !== 1) throw new DomainError('CONFLICT', 'Idempotency claim is no longer active')
}
