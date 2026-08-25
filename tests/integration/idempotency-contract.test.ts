import { Prisma } from '@prisma/client'
import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DomainError } from '../../server/domain/errors'
import { runIdempotent } from '../../server/services/idempotency-service'

const prismaFake = vi.hoisted(() => ({
  idempotencyRecord: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('../../server/utils/prisma', () => ({ prisma: prismaFake }))

function uniqueError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.19.0',
    meta: { target: ['actor_id', 'operation', 'idempotency_key'] },
  })
}

function hashRequest(request: unknown): string {
  return createHash('sha256').update(JSON.stringify(request)).digest('hex')
}

function expectConflict(error: unknown): void {
  expect(error).toBeInstanceOf(DomainError)
  expect((error as DomainError).code).toBe('CONFLICT')
}

describe('idempotent command contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaFake.idempotencyRecord.create.mockResolvedValue({ id: 'record-1' })
    prismaFake.idempotencyRecord.update.mockResolvedValue({ id: 'record-1' })
    prismaFake.idempotencyRecord.updateMany.mockResolvedValue({ count: 1 })
    prismaFake.idempotencyRecord.deleteMany.mockResolvedValue({ count: 1 })
  })

  it('executes a new command once and stores its response', async () => {
    const work = vi.fn().mockResolvedValue({ id: 'resource-1' })
    await expect(runIdempotent({ actorId: 'actor-1', operation: 'CREATE', key: 'request-key-1', request: { value: 1 }, work }))
      .resolves.toEqual({ id: 'resource-1' })
    expect(work).toHaveBeenCalledTimes(1)
    expect(prismaFake.idempotencyRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SUCCEEDED', responseStatus: 200, responseBody: { id: 'resource-1' } }),
    }))
  })

  it('returns the stored response for an identical successful retry without running work', async () => {
    prismaFake.idempotencyRecord.create.mockRejectedValue(uniqueError())
    const request = { value: 1 }
    prismaFake.idempotencyRecord.findUnique.mockResolvedValue({ requestHash: hashRequest(request), status: 'SUCCEEDED', responseBody: { id: 'resource-1' } })
    const work = vi.fn()
    await expect(runIdempotent({ actorId: 'actor-1', operation: 'CREATE', key: 'request-key-1', request, work }))
      .resolves.toEqual({ id: 'resource-1' })
    expect(work).not.toHaveBeenCalled()
  })

  it('rejects a reused key whose request hash differs', async () => {
    prismaFake.idempotencyRecord.create.mockRejectedValue(uniqueError())
    prismaFake.idempotencyRecord.findUnique.mockResolvedValue({ requestHash: '0'.repeat(64), status: 'SUCCEEDED', responseBody: { id: 'old' } })
    const work = vi.fn()
    await runIdempotent({ actorId: 'actor-1', operation: 'CREATE', key: 'request-key-1', request: { value: 2 }, work })
      .then(() => expect.fail('expected conflict'), expectConflict)
    expect(work).not.toHaveBeenCalled()
  })

  it('rejects an identical request that is still in progress', async () => {
    prismaFake.idempotencyRecord.create.mockRejectedValue(uniqueError())
    const request = { value: 1 }
    prismaFake.idempotencyRecord.findUnique.mockResolvedValue({ requestHash: hashRequest(request), status: 'IN_PROGRESS', responseBody: null })
    await runIdempotent({ actorId: 'actor-1', operation: 'CREATE', key: 'request-key-1', request, work: vi.fn() })
      .then(() => expect.fail('expected conflict'), expectConflict)
  })

  it('claims an expired in-progress key with a conditional update before retrying work', async () => {
    prismaFake.idempotencyRecord.create.mockRejectedValue(uniqueError())
    const request = { value: 1 }
    prismaFake.idempotencyRecord.findUnique.mockResolvedValue({
      id: 'record-1', requestHash: hashRequest(request), status: 'IN_PROGRESS', responseBody: null, expiresAt: new Date(0),
    })
    const work = vi.fn().mockResolvedValue({ id: 'resource-2' })
    await expect(runIdempotent({ actorId: 'actor-1', operation: 'CREATE', key: 'request-key-1', request, work }))
      .resolves.toEqual({ id: 'resource-2' })
    expect(prismaFake.idempotencyRecord.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'record-1', expiresAt: { lte: expect.any(Date) } },
      data: expect.objectContaining({ status: 'IN_PROGRESS' }),
    }))
    expect(work).toHaveBeenCalledTimes(1)
  })

  it('removes only its in-progress claim when business work rolls back', async () => {
    const failure = new Error('business transaction failed')
    await runIdempotent({ actorId: 'actor-1', operation: 'CREATE', key: 'request-key-1', request: { value: 1 }, work: vi.fn().mockRejectedValue(failure) })
      .then(() => expect.fail('expected failure'), error => expect(error).toBe(failure))
    expect(prismaFake.idempotencyRecord.deleteMany).toHaveBeenCalledWith({ where: {
      actorId: 'actor-1', operation: 'CREATE', idempotencyKey: 'request-key-1', status: 'IN_PROGRESS',
    } })
  })
})
