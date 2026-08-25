import { describe, expect, it } from 'vitest'
import { assertSameOriginMutation } from '../../server/middleware/security'
import { resolveExistingIdempotency } from '../../server/services/idempotency-service'
import { assertCanEditAssignment, assertPasswordChangeCompleted, assertSessionCurrent } from '../../server/policies/authorization'

describe('cookie mutation origin policy', () => {
  it('rejects missing and cross-origin mutation origins', () => {
    expect(() => assertSameOriginMutation('POST', '/api/visits', undefined, 'https://coop.example')).toThrow('same-origin')
    expect(() => assertSameOriginMutation('POST', '/api/visits', 'https://evil.example', 'https://coop.example')).toThrow('same-origin')
    expect(() => assertSameOriginMutation('POST', '/api/visits', 'https://coop.example', 'https://coop.example')).not.toThrow()
  })

  it('allows safe requests without Origin', () => {
    expect(() => assertSameOriginMutation('GET', '/api/visits', undefined, 'https://coop.example')).not.toThrow()
  })
})

describe('idempotency recovery policy', () => {
  it('replays succeeded requests and replaces only expired unfinished claims', () => {
    const now = new Date('2026-08-18T00:00:00Z')
    expect(resolveExistingIdempotency({ requestHash: 'hash', status: 'SUCCEEDED', responseBody: { id: 1 }, expiresAt: now }, 'hash', now)).toEqual({ replay: { id: 1 }, replace: false })
    expect(resolveExistingIdempotency({ requestHash: 'hash', status: 'IN_PROGRESS', responseBody: null, expiresAt: new Date('2026-08-17T00:00:00Z') }, 'hash', now)).toEqual({ replace: true })
    expect(() => resolveExistingIdempotency({ requestHash: 'hash', status: 'IN_PROGRESS', responseBody: null, expiresAt: new Date('2026-08-19T00:00:00Z') }, 'hash', now)).toThrow('already being processed')
  })
})

describe('session revalidation', () => {
  const actor = { userId: 'u1', role: 'LECTURER' as const, active: true, sessionVersion: 4 }

  it('rejects suspended users and revoked session versions', () => {
    expect(() => assertSessionCurrent(actor, { role: 'LECTURER', status: 'SUSPENDED', sessionVersion: 4 })).toThrow('no longer valid')
    expect(() => assertSessionCurrent(actor, { role: 'LECTURER', status: 'ACTIVE', sessionVersion: 5 })).toThrow('no longer valid')
    expect(() => assertSessionCurrent(actor, { role: 'LECTURER', status: 'ACTIVE', sessionVersion: 4 })).not.toThrow()
  })

  it('restricts bootstrap users until they change their password', () => {
    expect(() => assertPasswordChangeCompleted(true, '/api/visits')).toThrow('Password must be changed')
    expect(() => assertPasswordChangeCompleted(true, '/api/profile/password')).not.toThrow()
    expect(() => assertPasswordChangeCompleted(false, '/api/visits')).not.toThrow()
  })
})

describe('lecturer assignment policy', () => {
  it('denies an unassigned lecturer and requires an admin override reason', () => {
    const lecturer = { userId: 'u1', role: 'LECTURER' as const, active: true, sessionVersion: 1, lecturerId: 'l1' }
    const admin = { userId: 'a1', role: 'ADMIN' as const, active: true, sessionVersion: 1 }
    expect(() => assertCanEditAssignment(lecturer, ['l2'])).toThrow('assigned lecturer')
    expect(() => assertCanEditAssignment(admin, [], undefined)).toThrow('override requires')
    expect(() => assertCanEditAssignment(admin, [], 'Correction approved')).not.toThrow()
  })
})
