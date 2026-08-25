import { describe, expect, it, vi } from 'vitest'
import type { ResponsePlacementRepository } from '../../server/services/response-placement-service'
import { confirmResponseAndPlacements } from '../../server/services/response-placement-service'

function repositoryWith(overrides: Partial<ResponsePlacementRepository> = {}): ResponsePlacementRepository {
  const repository: ResponsePlacementRepository = {
    transaction: work => work(repository),
    findResponseForUpdate: vi.fn().mockResolvedValue({
      id: 'response-1', batchId: 'batch-1', status: 'PENDING_REVIEW', version: 2, activeTerm: true,
      members: [
        { batchMemberId: 'member-1', studentTermId: 'student-1', workSiteId: 'site-1', result: 'ACCEPTED', responseResultId: 'result-1' },
        { batchMemberId: 'member-2', studentTermId: 'student-2', workSiteId: 'site-1', result: 'DECLINED', responseResultId: 'result-2' },
      ],
    }),
    replaceDraftResults: vi.fn().mockResolvedValue(true),
    transitionResponse: vi.fn().mockResolvedValue(true),
    confirmResponse: vi.fn().mockResolvedValue(true),
    confirmMemberResult: vi.fn().mockImplementation((_responseId, memberId) => Promise.resolve(`result-${memberId}`)),
    createPlacement: vi.fn(),
    cancelOtherApplications: vi.fn(),
    appendAudit: vi.fn(),
    enqueueOutbox: vi.fn(),
    ...overrides,
  }
  return repository
}

const lecturer = { userId: 'lecturer-user', role: 'LECTURER' as const, active: true, sessionVersion: 1, lecturerId: 'lecturer-1' }

describe('response confirmation transaction contract', () => {
  it('confirms every member but creates a placement only for accepted members', async () => {
    const repository = repositoryWith()
    await expect(confirmResponseAndPlacements(repository, lecturer, { responseId: 'response-1', expectedVersion: 2 }))
      .resolves.toEqual({ responseId: 'response-1', placementCount: 1 })
    expect(repository.confirmMemberResult).toHaveBeenCalledTimes(2)
    expect(repository.createPlacement).toHaveBeenCalledTimes(1)
    expect(repository.confirmResponse).toHaveBeenCalledTimes(1)
    expect(repository.enqueueOutbox).toHaveBeenCalledTimes(1)
  })

  it('does not write anything when one member has no result', async () => {
    const repository = repositoryWith({
      findResponseForUpdate: vi.fn().mockResolvedValue({
        id: 'response-1', batchId: 'batch-1', status: 'PENDING_REVIEW', version: 2, activeTerm: true,
        members: [{ batchMemberId: 'member-1', studentTermId: 'student-1', workSiteId: 'site-1', result: null, responseResultId: null }],
      }),
    })
    await expect(confirmResponseAndPlacements(repository, lecturer, { responseId: 'response-1', expectedVersion: 2 })).rejects.toThrow('Every batch member')
    expect(repository.confirmMemberResult).not.toHaveBeenCalled()
    expect(repository.createPlacement).not.toHaveBeenCalled()
    expect(repository.confirmResponse).not.toHaveBeenCalled()
  })

  it('does not commit placement changes when atomic idempotency completion fails', async () => {
    let committed = false
    const staged = repositoryWith({ completeIdempotency: vi.fn().mockRejectedValue(new Error('claim lost')) })
    const repository = repositoryWith({
      transaction: async (work) => {
        const result = await work(staged)
        committed = true
        return result
      },
    })
    await expect(confirmResponseAndPlacements(repository, lecturer, {
      responseId: 'response-1',
      expectedVersion: 2,
      idempotency: { actorId: lecturer.userId, operation: 'RESPONSE_CONFIRM', key: 'response-key' },
    })).rejects.toThrow('claim lost')
    expect(staged.createPlacement).toHaveBeenCalledOnce()
    expect(staged.completeIdempotency).toHaveBeenCalledOnce()
    expect(committed).toBe(false)
  })
})
