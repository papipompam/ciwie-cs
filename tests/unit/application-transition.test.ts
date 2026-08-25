import { describe, expect, it } from 'vitest'
import { assertApplicationTransition } from '../../server/domain/application-transition'
import { DomainError } from '../../server/domain/errors'
import { allowedApplicationTransitions } from '../../server/services/application-service'

describe('application transition', () => {
  it('allows a live workflow transition', () => {
    expect(() => assertApplicationTransition('SUBMITTED', 'WAITING_RESPONSE')).not.toThrow()
  })

  it('rejects terminal-state and same-state changes', () => {
    expect(() => assertApplicationTransition('REJECTED', 'SUBMITTED')).toThrow(DomainError)
    expect(() => assertApplicationTransition('SUBMITTED', 'SUBMITTED')).toThrow('cannot transition')
  })

  it('returns actor-scoped capabilities without exposing another student or inactive-term lecturer mutation', () => {
    const application = { id: 'application-1', studentTermId: 'student-term-1', status: 'SUBMITTED' as const, version: 1, activeTerm: true }
    expect(allowedApplicationTransitions(application, { userId: 'student-1', role: 'STUDENT', active: true, sessionVersion: 1, studentTermId: 'student-term-1' }))
      .toEqual(['WAITING_RESPONSE', 'INTERVIEW_PENDING', 'PRELIMINARY_ACCEPTED', 'REJECTED', 'CANCELLED'])
    expect(allowedApplicationTransitions(application, { userId: 'student-2', role: 'STUDENT', active: true, sessionVersion: 1, studentTermId: 'student-term-2' })).toEqual([])
    expect(allowedApplicationTransitions({ ...application, activeTerm: false }, { userId: 'lecturer-1', role: 'LECTURER', active: true, sessionVersion: 1, lecturerId: 'lecturer-1' })).toEqual([])
  })
})
