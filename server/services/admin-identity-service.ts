import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { Prisma, type PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { ProfileUpdateInput } from '../../shared/schemas/admin-identity'
import type { SessionActor } from '../../shared/types/api'
import { DomainError } from '../domain/errors'
import { requireRole } from '../policies/authorization'
import { normalizeEmail } from './auth-service'

const json = (value: unknown) => value as Prisma.InputJsonValue
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

async function audit(tx: Prisma.TransactionClient, actorId: string, action: string, entityId: string, before: unknown, after: unknown, reason?: string): Promise<void> {
  await tx.auditLog.create({ data: { actorId, action, entityType: 'User', entityId, requestId: randomUUID(), reason, beforeData: before == null ? Prisma.JsonNull : json(before), afterData: json(after) } })
}

export async function createLecturerAccount(db: PrismaClient, actor: SessionActor, input: { email: string, employeeCode?: string, firstNameTh: string, lastNameTh: string, phone?: string }, now = new Date()): Promise<{ id: string, activationCode: string, expiresAt: string }> {
  requireRole(actor, 'ADMIN')
  const activationCode = randomBytes(32).toString('base64url')
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60_000)
  const passwordHash = await bcrypt.hash(randomBytes(32).toString('base64url'), 12)
  try {
    return await db.$transaction(async (tx) => {
      const email = normalizeEmail(input.email)
      const user = await tx.user.create({ data: {
        identifier: email,
        normalizedIdentifier: email,
        email,
        normalizedEmail: email,
        passwordHash,
        role: 'LECTURER',
        status: 'PENDING',
        lecturerProfile: { create: { employeeCode: input.employeeCode, firstNameTh: input.firstNameTh, lastNameTh: input.lastNameTh, phone: input.phone } },
      }, select: { id: true } })
      await tx.activationCode.create({ data: { userId: user.id, tokenHash: hashToken(activationCode), expiresAt } })
      await audit(tx, actor.userId, 'LECTURER_ACCOUNT_CREATED', user.id, null, { role: 'LECTURER', status: 'PENDING', email, expiresAt })
      return { id: user.id, activationCode, expiresAt: expiresAt.toISOString() }
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new DomainError('CONFLICT', 'Email or employee code already exists')
    throw error
  }
}

export async function createActivationCode(db: PrismaClient, actor: SessionActor, userId: string, reason: string, now = new Date()): Promise<{ code: string, expiresAt: string }> {
  requireRole(actor, 'ADMIN')
  const code = randomBytes(32).toString('base64url')
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60_000)
  return await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, status: true } })
    if (!user) throw new DomainError('NOT_FOUND', 'User was not found')
    if (user.status !== 'PENDING') throw new DomainError('INVALID_STATE', 'Activation codes are available only for pending users')
    await tx.activationCode.updateMany({ where: { userId, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: now } })
    await tx.activationCode.create({ data: { userId, tokenHash: hashToken(code), expiresAt } })
    await audit(tx, actor.userId, 'USER_ACTIVATION_CODE_CREATED', userId, user, { status: user.status, expiresAt }, reason)
    return { code, expiresAt: expiresAt.toISOString() }
  })
}

export async function changeUserStatus(db: PrismaClient, actor: SessionActor, userId: string, action: 'SUSPEND' | 'REACTIVATE', reason: string): Promise<{ id: string, status: 'ACTIVE' | 'SUSPENDED' }> {
  requireRole(actor, 'ADMIN')
  if (actor.userId === userId && action === 'SUSPEND') throw new DomainError('VALIDATION_FAILED', 'You cannot suspend your own account')
  return await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, status: true, sessionVersion: true } })
    if (!user) throw new DomainError('NOT_FOUND', 'User was not found')
    const expected = action === 'SUSPEND' ? 'ACTIVE' : 'SUSPENDED'
    const status = action === 'SUSPEND' ? 'SUSPENDED' : 'ACTIVE'
    if (user.status !== expected) throw new DomainError('INVALID_STATE', `User must be ${expected.toLowerCase()} for this action`)
    const changed = await tx.user.updateMany({ where: { id: userId, status: expected, sessionVersion: user.sessionVersion }, data: { status, sessionVersion: { increment: 1 } } })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'User changed; reload and try again')
    await tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
    await audit(tx, actor.userId, action === 'SUSPEND' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', userId, user, { status, sessionVersion: user.sessionVersion + 1 }, reason)
    return { id: userId, status }
  })
}

export async function createPasswordReset(db: PrismaClient, actor: SessionActor, userId: string, reason: string, now = new Date()): Promise<{ token: string, expiresAt: string }> {
  requireRole(actor, 'ADMIN')
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(now.getTime() + 30 * 60_000)
  return await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, status: true, sessionVersion: true } })
    if (!user) throw new DomainError('NOT_FOUND', 'User was not found')
    if (user.status === 'PENDING') throw new DomainError('INVALID_STATE', 'Pending users must activate their account instead')
    await tx.passwordResetToken.updateMany({ where: { userId, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: now } })
    await tx.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt } })
    await tx.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } })
    await tx.userSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } })
    await audit(tx, actor.userId, 'PASSWORD_RESET_CREATED', userId, user, { expiresAt, sessionVersion: user.sessionVersion + 1 }, reason)
    return { token, expiresAt: expiresAt.toISOString() }
  })
}

export async function activateAccount(db: PrismaClient, code: string, newPassword: string, now = new Date()): Promise<{ activated: true }> {
  const tokenHash = hashToken(code)
  const preflight = await db.activationCode.findUnique({ where: { tokenHash }, include: { user: true } })
  if (!preflight || preflight.status !== 'ACTIVE' || preflight.expiresAt <= now || preflight.user.status !== 'PENDING') {
    throw new DomainError('UNAUTHENTICATED', 'Activation code is invalid or expired')
  }
  const passwordHash = await bcrypt.hash(newPassword, 12)
  return await db.$transaction(async (tx) => {
    const claimed = await tx.activationCode.updateMany({ where: { id: preflight.id, status: 'ACTIVE', expiresAt: { gt: now } }, data: { status: 'USED', usedAt: now } })
    if (claimed.count !== 1) throw new DomainError('CONFLICT', 'Activation code was already used')
    const activated = await tx.user.updateMany({ where: { id: preflight.userId, status: 'PENDING' }, data: { status: 'ACTIVE', passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } } })
    if (activated.count !== 1) throw new DomainError('CONFLICT', 'Account changed before activation')
    await audit(tx, preflight.userId, 'USER_ACTIVATED', preflight.userId, { status: 'PENDING' }, { status: 'ACTIVE' })
    return { activated: true }
  })
}

export async function completePasswordReset(db: PrismaClient, token: string, newPassword: string, now = new Date()): Promise<{ reset: true }> {
  const tokenHash = hashToken(token)
  const preflight = await db.passwordResetToken.findUnique({ where: { tokenHash }, include: { user: true } })
  if (!preflight || preflight.status !== 'ACTIVE' || preflight.expiresAt <= now || preflight.user.status === 'PENDING') {
    throw new DomainError('UNAUTHENTICATED', 'Password reset token is invalid or expired')
  }
  const passwordHash = await bcrypt.hash(newPassword, 12)
  return await db.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({ where: { id: preflight.id, status: 'ACTIVE', expiresAt: { gt: now } }, data: { status: 'USED', usedAt: now } })
    if (claimed.count !== 1) throw new DomainError('CONFLICT', 'Password reset token was already used')
    const changed = await tx.user.updateMany({ where: { id: preflight.userId, status: { in: ['ACTIVE', 'SUSPENDED'] }, sessionVersion: preflight.user.sessionVersion }, data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } } })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'Account changed before password reset')
    await tx.userSession.updateMany({ where: { userId: preflight.userId, revokedAt: null }, data: { revokedAt: now } })
    await audit(tx, preflight.userId, 'PASSWORD_RESET_COMPLETED', preflight.userId, { sessionVersion: preflight.user.sessionVersion }, { sessionVersion: preflight.user.sessionVersion + 1 })
    return { reset: true }
  })
}

export async function changeOwnPassword(db: PrismaClient, actor: SessionActor, currentPassword: string, newPassword: string): Promise<void> {
  requireRole(actor, 'STUDENT', 'LECTURER', 'ADMIN')
  const user = await db.user.findUnique({ where: { id: actor.userId }, select: { id: true, passwordHash: true, sessionVersion: true } })
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new DomainError('UNAUTHENTICATED', 'Current password is incorrect')
  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.$transaction(async (tx) => {
    const changed = await tx.user.updateMany({ where: { id: user.id, sessionVersion: user.sessionVersion }, data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } } })
    if (changed.count !== 1) throw new DomainError('CONFLICT', 'Account changed; retry password change')
    await tx.userSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } })
    await audit(tx, actor.userId, 'PASSWORD_CHANGED', user.id, { sessionVersion: user.sessionVersion }, { sessionVersion: user.sessionVersion + 1 })
  })
}

export async function updateOwnProfile(db: PrismaClient, actor: SessionActor, input: ProfileUpdateInput): Promise<{ email: string, phone: string | null }> {
  requireRole(actor, 'STUDENT', 'LECTURER', 'ADMIN')
  return await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: actor.userId }, include: { studentProfile: true, lecturerProfile: true } })
    if (!user) throw new DomainError('NOT_FOUND', 'User was not found')
    if (input.phone !== undefined && actor.role === 'ADMIN') throw new DomainError('VALIDATION_FAILED', 'Admin accounts do not have a phone profile')
    const nextEmail = input.email === undefined ? user.email : normalizeEmail(input.email)
    if (input.email !== undefined) {
      await tx.user.update({ where: { id: user.id }, data: { identifier: nextEmail, normalizedIdentifier: nextEmail, email: nextEmail, normalizedEmail: nextEmail } })
    }
    if (input.phone !== undefined && user.studentProfile) await tx.studentProfile.update({ where: { id: user.studentProfile.id }, data: { phone: input.phone } })
    if (input.phone !== undefined && user.lecturerProfile) await tx.lecturerProfile.update({ where: { id: user.lecturerProfile.id }, data: { phone: input.phone } })
    const previousPhone = user.studentProfile?.phone ?? user.lecturerProfile?.phone ?? null
    const next = { email: nextEmail, phone: input.phone === undefined ? previousPhone : input.phone }
    await audit(tx, actor.userId, 'PROFILE_UPDATED', user.id, { email: user.email, phone: previousPhone }, next)
    return next
  })
}
