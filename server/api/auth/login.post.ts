import { z } from 'zod'
import { Prisma, type AccountStatus, type UserRole } from '@prisma/client'
import { verifyPassword } from '../../utils/password'
import { setUserSession, type AuthenticatedUser, type SessionRole } from '../../utils/session'

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(255),
}).strict()

const roleMap: Record<UserRole, SessionRole> = {
  STAFF: 'staff',
  LECTURER: 'lecturer',
  STUDENT: 'student',
}

const statusMap: Partial<Record<AccountStatus, AuthenticatedUser['status']>> = {
  ACTIVE: 'active',
  FIRST_LOGIN: 'first-login',
}

export default defineEventHandler(async (event) => {
  const body = loginSchema.safeParse(await readBody(event))
  if (!body.success) throw createError({ statusCode: 400, statusMessage: 'INVALID_CREDENTIALS' })

  const prisma = usePrisma()
  const account = await prisma.user.findUnique({
    where: { username: body.data.username },
    select: {
      id: true, username: true, passwordHash: true, role: true, status: true, recordStatus: true,
      namePrefix: true, firstName: true, lastName: true, failedLoginCount: true, failedWindowAt: true, lockedUntil: true,
      sessionVersion: true,
    },
  })
  if (account?.lockedUntil && account.lockedUntil > new Date()) {
    throw createError({ statusCode: 423, statusMessage: 'ACCOUNT_LOCKED' })
  }
  if (!account || account.recordStatus !== 'ACTIVE' || !await verifyPassword(body.data.password, account.passwordHash)) {
    if (account) {
      const failedLoginCount = await prisma.$transaction(async (transaction) => {
        const latest = await transaction.user.findUniqueOrThrow({
          where: { id: account.id },
          select: { failedLoginCount: true, failedWindowAt: true },
        })
        const now = new Date()
        const insideFailureWindow = latest.failedWindowAt && now.getTime() - latest.failedWindowAt.getTime() < 60_000
        const nextCount = insideFailureWindow ? latest.failedLoginCount + 1 : 1
        await transaction.user.update({
          where: { id: account.id },
          data: nextCount >= 3
            ? { failedLoginCount: 0, failedWindowAt: now, lockedUntil: new Date(now.getTime() + 60_000) }
            : { failedLoginCount: nextCount, failedWindowAt: now },
        })
        return nextCount
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      if (failedLoginCount >= 3) throw createError({ statusCode: 423, statusMessage: 'ACCOUNT_LOCKED' })
    }
    throw createError({ statusCode: 401, statusMessage: 'INVALID_CREDENTIALS' })
  }
  if (account.status === 'SUSPENDED') throw createError({ statusCode: 403, statusMessage: 'ACCOUNT_SUSPENDED' })
  if (account.status === 'TERMINATED') throw createError({ statusCode: 403, statusMessage: 'ACCOUNT_TERMINATED' })

  const status = statusMap[account.status]
  if (!status) throw createError({ statusCode: 403, statusMessage: 'ACCOUNT_UNAVAILABLE' })
  const user: AuthenticatedUser = {
    id: account.id,
    username: account.username,
    role: roleMap[account.role],
    name: [account.namePrefix, account.firstName, account.lastName].filter(Boolean).join(' '),
    status,
    sessionVersion: account.sessionVersion,
  }
  await Promise.all([
    setUserSession(event, user),
    prisma.user.update({ where: { id: account.id }, data: { lastLoginAt: new Date(), failedLoginCount: 0, failedWindowAt: null, lockedUntil: null } }),
  ])
  return { account: user, requiresPasswordChange: status === 'first-login' }
})
