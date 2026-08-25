import type { Role } from '../../shared/constants/domain'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../domain/errors'

export function requireActiveActor(actor: SessionActor | null | undefined): asserts actor is SessionActor {
  if (!actor) throw new DomainError('UNAUTHENTICATED', 'Authentication is required')
  if (!actor.active) throw new DomainError('UNAUTHENTICATED', 'The user account is inactive')
}

export function requireRole(actor: SessionActor, ...roles: readonly Role[]): void {
  requireActiveActor(actor)
  if (!roles.includes(actor.role)) throw new DomainError('FORBIDDEN', 'You do not have permission for this action')
}

export function assertSessionCurrent(actor: SessionActor, current: { role: Role, status: string, sessionVersion: number } | null): void {
  if (!current || current.status !== 'ACTIVE' || current.sessionVersion !== actor.sessionVersion || current.role !== actor.role) {
    throw new DomainError('UNAUTHENTICATED', 'Session is no longer valid')
  }
}

export function assertPasswordChangeCompleted(mustChangePassword: boolean, path: string): void {
  if (!mustChangePassword) return
  const allowed = new Set(['/api/auth/session', '/api/auth/logout', '/api/profile/password'])
  if (!allowed.has(path)) throw new DomainError('FORBIDDEN', 'Password must be changed before using the application')
}

export function canReadStudentTerm(actor: SessionActor, studentTermId: string, activeTerm: boolean): boolean {
  if (actor.role === 'ADMIN') return true
  if (actor.role === 'STUDENT') return actor.studentTermId === studentTermId
  return actor.role === 'LECTURER' && activeTerm
}

export function assertCanEditAssignment(actor: SessionActor, assignedLecturerIds: readonly string[], overrideReason?: string): void {
  if (actor.role === 'LECTURER' && actor.lecturerId && assignedLecturerIds.includes(actor.lecturerId)) return
  if (actor.role === 'ADMIN' && overrideReason?.trim()) return
  throw new DomainError('FORBIDDEN', 'Only an assigned lecturer can edit; an admin override requires a reason')
}
