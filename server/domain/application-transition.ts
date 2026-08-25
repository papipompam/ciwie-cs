import type { ApplicationStatus } from '../../shared/constants/domain'
import { DomainError } from './errors'

const transitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  SUBMITTED: ['WAITING_RESPONSE', 'INTERVIEW_PENDING', 'PRELIMINARY_ACCEPTED', 'REJECTED', 'CANCELLED'],
  WAITING_RESPONSE: ['SUBMITTED', 'INTERVIEW_PENDING', 'PRELIMINARY_ACCEPTED', 'REJECTED', 'CANCELLED'],
  INTERVIEW_PENDING: ['SUBMITTED', 'WAITING_RESPONSE', 'PRELIMINARY_ACCEPTED', 'REJECTED', 'CANCELLED'],
  PRELIMINARY_ACCEPTED: ['SUBMITTED', 'WAITING_RESPONSE', 'INTERVIEW_PENDING', 'REJECTED', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
}

export function applicationTransitionsFrom(status: ApplicationStatus): readonly ApplicationStatus[] {
  return transitions[status]
}

export function assertApplicationTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  if (from === to || !transitions[from].includes(to)) {
    throw new DomainError('INVALID_STATE', `Application cannot transition from ${from} to ${to}`)
  }
}
