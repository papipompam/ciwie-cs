import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../../server/domain/errors'
import { transitionApplication, type ApplicationRepository } from '../../server/services/application-service'
import { addDocumentBatchMember, type DocumentBatchRepository } from '../../server/services/document-batch-service'
import { submitEvaluation, type EvaluationRepository } from '../../server/services/evaluation-service'
import { confirmResponseAndPlacements, type ResponsePlacementRepository } from '../../server/services/response-placement-service'
import { calculateCoverage, scheduleVisit, type VisitRepository } from '../../server/services/visit-service'

const admin: SessionActor = { userId: 'admin-user', role: 'ADMIN', active: true, sessionVersion: 1 }
const lecturer: SessionActor = { userId: 'lecturer-user', role: 'LECTURER', active: true, sessionVersion: 1, lecturerId: 'lecturer-1' }
const student: SessionActor = { userId: 'student-user', role: 'STUDENT', active: true, sessionVersion: 1, studentTermId: 'student-term-1' }

function expectDomainCode(error: unknown, code: string): void {
  expect(error).toBeInstanceOf(DomainError)
  expect((error as DomainError).code).toBe(code)
}

describe('AC-003 document request and batch contracts', () => {
  function repository(overrides: Partial<DocumentBatchRepository> = {}): DocumentBatchRepository {
    const repo: DocumentBatchRepository = {
      transaction: work => work(repo),
      findBatchForUpdate: vi.fn().mockResolvedValue({ id: 'batch-1', coopTermId: 'term-1', workSiteId: 'site-1', status: 'DRAFT', version: 3, activeTerm: true }),
      findRequestForUpdate: vi.fn().mockResolvedValue({ id: 'request-1', studentTermId: 'student-term-1', coopTermId: 'term-1', workSiteId: 'site-1', status: 'READY_TO_SEND' }),
      createMember: vi.fn().mockResolvedValue({ id: 'member-1' }),
      reserveStudent: vi.fn(),
      incrementBatchVersion: vi.fn().mockResolvedValue(true),
      appendAudit: vi.fn(),
      ...overrides,
    }
    return repo
  }

  it('keeps the request identity and adds membership, reservation and audit atomically', async () => {
    const repo = repository()
    await expect(addDocumentBatchMember(repo, lecturer, { batchId: 'batch-1', requestId: 'request-1', expectedBatchVersion: 3 }))
      .resolves.toEqual({ batchMemberId: 'member-1' })
    expect(repo.createMember).toHaveBeenCalledWith(expect.objectContaining({ batchId: 'batch-1', request: expect.objectContaining({ id: 'request-1' }) }))
    expect(repo.reserveStudent).toHaveBeenCalledWith(expect.objectContaining({ batchMemberId: 'member-1' }))
    expect(repo.appendAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'DOCUMENT_BATCH_MEMBER_ADDED' }))
  })

  it('rejects a request from another term/site before any write', async () => {
    const repo = repository({
      findRequestForUpdate: vi.fn().mockResolvedValue({ id: 'request-2', studentTermId: 'student-term-2', coopTermId: 'term-2', workSiteId: 'site-2', status: 'READY_TO_SEND' }),
    })
    await addDocumentBatchMember(repo, lecturer, { batchId: 'batch-1', requestId: 'request-2', expectedBatchVersion: 3 })
      .then(() => expect.fail('expected validation failure'), error => expectDomainCode(error, 'VALIDATION_FAILED'))
    expect(repo.createMember).not.toHaveBeenCalled()
    expect(repo.appendAudit).not.toHaveBeenCalled()
  })

  it('maps an active-batch reservation race to conflict', async () => {
    const committed: string[] = []
    const repo = repository()
    repo.transaction = async (work) => {
      const staged: string[] = []
      const tx = repository({
        createMember: vi.fn().mockImplementation(async () => { staged.push('member'); return { id: 'member-1' } }),
        reserveStudent: vi.fn().mockRejectedValue({ code: 'P2002' }),
      })
      const result = await work(tx)
      committed.push(...staged)
      return result
    }
    await addDocumentBatchMember(repo, admin, { batchId: 'batch-1', requestId: 'request-1', expectedBatchVersion: 3 })
      .then(() => expect.fail('expected conflict'), error => expectDomainCode(error, 'CONFLICT'))
    expect(committed).toEqual([])
  })
})

describe('AC-005/006 atomic shared-response confirmation and placement concurrency', () => {
  function transactionalRepository(failPlacementAt?: number): { repository: ResponsePlacementRepository, committed: string[] } {
    const committed: string[] = []
    const response = {
      id: 'response-1', batchId: 'batch-1', status: 'PENDING_REVIEW' as const, version: 2, activeTerm: true,
      members: [
        { batchMemberId: 'member-1', studentTermId: 'student-term-1', workSiteId: 'site-1', result: 'ACCEPTED' as const, responseResultId: 'result-1' },
        { batchMemberId: 'member-2', studentTermId: 'student-term-2', workSiteId: 'site-1', result: 'ACCEPTED' as const, responseResultId: 'result-2' },
      ],
    }
    let placementNumber = 0
    const repository = {} as ResponsePlacementRepository
    repository.transaction = async (work) => {
      const staged: string[] = []
      const tx: ResponsePlacementRepository = {
        transaction: nested => nested(tx),
        findResponseForUpdate: vi.fn().mockResolvedValue(response),
        replaceDraftResults: vi.fn().mockResolvedValue(true),
        transitionResponse: vi.fn().mockResolvedValue(true),
        confirmResponse: vi.fn().mockImplementation(async () => { staged.push('response'); return true }),
        confirmMemberResult: vi.fn().mockImplementation(async (_responseId, memberId) => { staged.push(`result:${memberId}`); return `result:${memberId}` }),
        createPlacement: vi.fn().mockImplementation(async () => {
          placementNumber += 1
          if (placementNumber === failPlacementAt) throw { code: 'P2002' }
          staged.push(`placement:${placementNumber}`)
        }),
        cancelOtherApplications: vi.fn().mockImplementation(async () => { staged.push('applications-cancelled') }),
        appendAudit: vi.fn().mockImplementation(async () => { staged.push('audit') }),
        enqueueOutbox: vi.fn().mockImplementation(async () => { staged.push('outbox') }),
      }
      const result = await work(tx)
      committed.push(...staged)
      return result
    }
    Object.assign(repository, {
      findResponseForUpdate: vi.fn(), replaceDraftResults: vi.fn(), transitionResponse: vi.fn(), confirmResponse: vi.fn(),
      confirmMemberResult: vi.fn(), createPlacement: vi.fn(), cancelOtherApplications: vi.fn(), appendAudit: vi.fn(), enqueueOutbox: vi.fn(),
    })
    return { repository, committed }
  }

  it('commits per-member results, placements, application cancellation, audit and outbox together', async () => {
    const { repository, committed } = transactionalRepository()
    await expect(confirmResponseAndPlacements(repository, lecturer, { responseId: 'response-1', expectedVersion: 2 }))
      .resolves.toEqual({ responseId: 'response-1', placementCount: 2 })
    expect(committed).toEqual(expect.arrayContaining(['result:member-1', 'result:member-2', 'placement:1', 'placement:2', 'response', 'audit', 'outbox']))
  })

  it('rolls back every staged write when a concurrent placement unique constraint loses', async () => {
    const { repository, committed } = transactionalRepository(2)
    await confirmResponseAndPlacements(repository, lecturer, { responseId: 'response-1', expectedVersion: 2 })
      .then(() => expect.fail('expected conflict'), error => expectDomainCode(error, 'CONFLICT'))
    expect(committed).toEqual([])
  })

  it('does not let a student confirm a response', async () => {
    const { repository, committed } = transactionalRepository()
    await confirmResponseAndPlacements(repository, student, { responseId: 'response-1', expectedVersion: 2 })
      .then(() => expect.fail('expected forbidden'), error => expectDomainCode(error, 'FORBIDDEN'))
    expect(committed).toEqual([])
  })
})

describe('AC-008 visit conflict transaction contract', () => {
  function repository(conflict = false): { repository: VisitRepository, committed: string[] } {
    const committed: string[] = []
    const repo = {} as VisitRepository
    repo.transaction = async (work) => {
      const staged: string[] = []
      const tx: VisitRepository = {
        transaction: nested => nested(tx),
        assertEligibleStudents: vi.fn(),
        createVisit: vi.fn().mockImplementation(async () => { staged.push('visit'); return { id: 'visit-1' } }),
        reserveStudentSlots: vi.fn().mockImplementation(async () => { staged.push('student-slots') }),
        reserveLecturerSlots: vi.fn().mockImplementation(async () => {
          if (conflict) throw { code: 'P2002' }
          staged.push('lecturer-slots')
        }),
        reserveWorkSiteSlot: vi.fn().mockImplementation(async () => { staged.push('site-slot') }),
        appendVisitHistory: vi.fn().mockImplementation(async () => { staged.push('history') }),
        enqueueOutbox: vi.fn().mockImplementation(async () => { staged.push('outbox') }),
      }
      const result = await work(tx)
      committed.push(...staged)
      return result
    }
    Object.assign(repo, {
      assertEligibleStudents: vi.fn(), createVisit: vi.fn(), reserveStudentSlots: vi.fn(), reserveLecturerSlots: vi.fn(),
      reserveWorkSiteSlot: vi.fn(), appendVisitHistory: vi.fn(), enqueueOutbox: vi.fn(),
    })
    return { repository: repo, committed }
  }

  const input = { coopTermId: 'term-1', workSiteId: 'site-1', round: 1, date: '2026-08-20', period: 'MORNING' as const, studentTermIds: ['student-term-1'], lecturerIds: ['lecturer-1'] }

  it('commits visit, every reservation, history and notification event together', async () => {
    const { repository: repo, committed } = repository()
    await expect(scheduleVisit(repo, lecturer, input)).resolves.toEqual({ id: 'visit-1' })
    expect(committed).toEqual(['visit', 'student-slots', 'lecturer-slots', 'site-slot', 'history', 'outbox'])
  })

  it('maps a slot race to 409 and rolls back the visit', async () => {
    const { repository: repo, committed } = repository(true)
    await scheduleVisit(repo, admin, input)
      .then(() => expect.fail('expected conflict'), error => expectDomainCode(error, 'CONFLICT'))
    expect(committed).toEqual([])
  })
})

describe('AC-009 evaluation snapshot and AC-011 audit contract', () => {
  function repository(): { repository: EvaluationRepository, submitted: unknown[], versions: unknown[], audits: unknown[] } {
    const submitted: unknown[] = []
    const versions: unknown[] = []
    const audits: unknown[] = []
    const repo: EvaluationRepository = {
      transaction: work => work(repo),
      findForUpdate: vi.fn().mockResolvedValue({ id: 'evaluation-1', status: 'DRAFT', version: 4, templateVersionId: 'template-version-1', assignedLecturerIds: ['lecturer-1'], activeTerm: true }),
      getPublishedTemplateItems: vi.fn().mockResolvedValue([{ id: 'item-1', code: 'COMMUNICATION', answerType: 'SCORE', required: true, maxScore: 5, weight: 2 }]),
      submit: vi.fn().mockImplementation(async input => { submitted.push(input); return true }),
      appendVersion: vi.fn().mockImplementation(async input => { versions.push(input) }),
      appendAudit: vi.fn().mockImplementation(async input => { audits.push(input) }),
    }
    return { repository: repo, submitted, versions, audits }
  }

  it('submits the immutable item snapshot and appends version plus actor audit', async () => {
    const state = repository()
    await expect(submitEvaluation(state.repository, lecturer, { evaluationId: 'evaluation-1', expectedVersion: 4, answers: [{ itemId: 'item-1', score: 4 }] }))
      .resolves.toEqual({ id: 'evaluation-1', version: 5 })
    expect(state.submitted[0]).toEqual(expect.objectContaining({ actorId: 'lecturer-user', answers: [expect.objectContaining({ itemCode: 'COMMUNICATION', maxScore: 5, weight: 2, score: 4 })] }))
    expect(state.versions[0]).toEqual(expect.objectContaining({ evaluationId: 'evaluation-1', version: 5, actorId: 'lecturer-user' }))
    expect(state.audits[0]).toEqual(expect.objectContaining({ action: 'EVALUATION_SUBMITTED', actorId: 'lecturer-user' }))
  })

  it('rejects stale evaluation submission before version/audit writes', async () => {
    const state = repository()
    await submitEvaluation(state.repository, lecturer, { evaluationId: 'evaluation-1', expectedVersion: 3, answers: [{ itemId: 'item-1', score: 4 }] })
      .then(() => expect.fail('expected conflict'), error => expectDomainCode(error, 'CONFLICT'))
    expect(state.submitted).toEqual([])
    expect(state.versions).toEqual([])
    expect(state.audits).toEqual([])
  })

  it('rejects assigned-lecturer submission outside the active term', async () => {
    const state = repository()
    vi.mocked(state.repository.findForUpdate).mockResolvedValue({ id: 'evaluation-1', status: 'DRAFT', version: 4, templateVersionId: 'template-version-1', assignedLecturerIds: ['lecturer-1'], activeTerm: false })
    await submitEvaluation(state.repository, lecturer, { evaluationId: 'evaluation-1', expectedVersion: 4, answers: [{ itemId: 'item-1', score: 4 }] })
      .then(() => expect.fail('expected active-term denial'), error => expectDomainCode(error, 'FORBIDDEN'))
    expect(state.submitted).toEqual([])
  })

  it('rejects non-lecturer evaluation submission', async () => {
    const state = repository()
    await submitEvaluation(state.repository, admin, { evaluationId: 'evaluation-1', expectedVersion: 4, answers: [{ itemId: 'item-1', score: 4 }] })
      .then(() => expect.fail('expected forbidden'), error => expectDomainCode(error, 'FORBIDDEN'))
    expect(state.submitted).toEqual([])
  })
})

describe('AC-011 application history/audit and object authorization', () => {
  function repository(studentTermId = 'student-term-1'): ApplicationRepository {
    const repo: ApplicationRepository = {
      transaction: work => work(repo),
      findForUpdate: vi.fn().mockResolvedValue({ id: 'application-1', studentTermId, status: 'SUBMITTED', version: 1, activeTerm: true }),
      transition: vi.fn().mockResolvedValue(true),
      findCleanOwnedFileVersionIds: vi.fn().mockResolvedValue([]),
      attachEvidence: vi.fn(),
      appendHistory: vi.fn(),
      appendAudit: vi.fn(),
    }
    return repo
  }

  it('writes status history and an actor/before/after audit for a valid command', async () => {
    const repo = repository()
    await transitionApplication(repo, student, { applicationId: 'application-1', to: 'WAITING_RESPONSE', expectedVersion: 1 })
    expect(repo.appendHistory).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'student-user', from: 'SUBMITTED', to: 'WAITING_RESPONSE' }))
    expect(repo.appendAudit).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'student-user', before: expect.objectContaining({ version: 1 }), after: expect.objectContaining({ version: 2 }) }))
  })

  it('hides another student application and performs no mutation', async () => {
    const repo = repository('student-term-other')
    await transitionApplication(repo, student, { applicationId: 'application-1', to: 'WAITING_RESPONSE', expectedVersion: 1 })
      .then(() => expect.fail('expected hidden resource'), error => expectDomainCode(error, 'NOT_FOUND'))
    expect(repo.transition).not.toHaveBeenCalled()
    expect(repo.appendHistory).not.toHaveBeenCalled()
    expect(repo.appendAudit).not.toHaveBeenCalled()
  })

  it('lets a lecturer transition only an active-term application and requires a correction reason', async () => {
    const repo = repository()
    await transitionApplication(repo, lecturer, { applicationId: 'application-1', to: 'WAITING_RESPONSE', expectedVersion: 1 })
      .then(() => expect.fail('expected reason validation'), error => expectDomainCode(error, 'VALIDATION_FAILED'))
    expect(repo.transition).not.toHaveBeenCalled()

    repo.findForUpdate = vi.fn().mockResolvedValue({ id: 'application-1', studentTermId: 'student-term-1', status: 'SUBMITTED', version: 1, activeTerm: false })
    await transitionApplication(repo, lecturer, { applicationId: 'application-1', to: 'WAITING_RESPONSE', expectedVersion: 1, reason: 'Correcting status' })
      .then(() => expect.fail('expected inactive-term denial'), error => expectDomainCode(error, 'FORBIDDEN'))
    expect(repo.transition).not.toHaveBeenCalled()
  })

  it('stores result date, note and actor-owned evidence in the same transition contract', async () => {
    const repo = repository()
    repo.findCleanOwnedFileVersionIds = vi.fn().mockResolvedValue(['file-version-1'])
    await transitionApplication(repo, student, { applicationId: 'application-1', to: 'WAITING_RESPONSE', expectedVersion: 1, occurredAt: '2026-08-20', note: 'Company acknowledged receipt', evidenceFileVersionIds: ['file-version-1'] })
    expect(repo.attachEvidence).toHaveBeenCalledWith('application-1', ['file-version-1'])
    expect(repo.appendHistory).toHaveBeenCalledWith(expect.objectContaining({ snapshot: { occurredAt: '2026-08-20', note: 'Company acknowledged receipt', evidenceFileVersionIds: ['file-version-1'] } }))
  })

  it('rejects non-clean or foreign evidence before changing application state', async () => {
    const repo = repository()
    repo.findCleanOwnedFileVersionIds = vi.fn().mockResolvedValue([])
    await transitionApplication(repo, student, { applicationId: 'application-1', to: 'WAITING_RESPONSE', expectedVersion: 1, evidenceFileVersionIds: ['foreign-file'] })
      .then(() => expect.fail('expected evidence validation'), error => expectDomainCode(error, 'VALIDATION_FAILED'))
    expect(repo.transition).not.toHaveBeenCalled()
    expect(repo.attachEvidence).not.toHaveBeenCalled()
  })
})

describe('AC-004/007/010 schema and route availability contracts', () => {
  const schema = readFileSync(resolve('prisma/schema.prisma'), 'utf8')

  it('requires new document/file revisions instead of overwriting the sent file identity', () => {
    expect(schema).toContain('model DocumentVersion')
    expect(schema).toContain('@@unique([batchId, kind, revision])')
    expect(schema).toContain('model FileVersion')
    expect(schema).toContain('@@unique([fileId, revision])')
  })

  it('has no placeholder visit state for unscheduled coverage', () => {
    expect(schema).not.toMatch(/enum VisitStatus\s*{[^}]*UNSCHEDULED/s)
    expect(calculateCoverage({ studentTermId: 'student-term-1', round: 1 }, '2026-08-18')).toBe('UNSCHEDULED')
  })
})
