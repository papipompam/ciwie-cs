import bcrypt from 'bcryptjs'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../domain/errors'

export interface AuthUserRecord {
  id: string
  normalizedEmail: string
  passwordHash: string
  role: 'STUDENT' | 'LECTURER' | 'ADMIN'
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED'
  sessionVersion: number
  studentTermId?: string
  lecturerId?: string
  mustChangePassword: boolean
}

export interface AuthRepository {
  findByEmail(normalizedEmail: string): Promise<AuthUserRecord | null>
  recordSuccessfulLogin(userId: string, at: Date): Promise<void>
}

export function normalizeEmail(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en-US')
}

export async function authenticate(
  repository: AuthRepository,
  email: string,
  password: string,
): Promise<SessionActor> {
  const user = await repository.findByEmail(normalizeEmail(email))
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : await bcrypt.compare(password, '$2b$12$C6UzMDM.H6dfI/f/IKcEe.ouZtS.T.I4NfDcWpqF4C0v2cY6rIY4a')
  if (!user || !valid || user.status !== 'ACTIVE') throw new DomainError('UNAUTHENTICATED', 'Invalid credentials')
  await repository.recordSuccessfulLogin(user.id, new Date())
  return {
    userId: user.id,
    role: user.role,
    active: true,
    sessionVersion: user.sessionVersion,
    ...(user.studentTermId ? { studentTermId: user.studentTermId } : {}),
    ...(user.lecturerId ? { lecturerId: user.lecturerId } : {}),
    mustChangePassword: user.mustChangePassword,
  }
}

interface AttemptBucket { count: number, resetAt: number }
const attempts = new Map<string, AttemptBucket>()

export function consumeLoginAttempt(key: string, now = Date.now()): void {
  const current = attempts.get(key)
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60_000 })
    return
  }
  if (current.count >= 5) throw new DomainError('RATE_LIMITED', 'Too many login attempts; try again later')
  current.count += 1
}

export function clearLoginAttempts(key: string): void {
  attempts.delete(key)
}
