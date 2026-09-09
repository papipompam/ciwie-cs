import type { H3Event } from 'h3'
import { clearSession, useSession } from 'h3'

export type SessionRole = 'staff' | 'lecturer' | 'student'

export interface AuthenticatedUser {
  id: string
  username: string
  role: SessionRole
  name: string
  status: 'active' | 'first-login'
  sessionVersion: number
}

interface CwieSessionData {
  user?: AuthenticatedUser
}

const sessionConfig = (event: H3Event) => {
  const password = useRuntimeConfig(event).sessionPassword
  if (typeof password !== 'string' || password.length < 32) {
    throw createError({ statusCode: 500, statusMessage: 'SESSION_PASSWORD_NOT_CONFIGURED' })
  }
  return {
    name: 'cwie-session',
    password,
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
  }
}

export const getUserSession = async (event: H3Event) => {
  const session = await useSession<CwieSessionData>(event, sessionConfig(event))
  const user = session.data.user
  if (!user) return null

  const account = await usePrisma().user.findUnique({
    where: { id: user.id },
    select: { role: true, status: true, recordStatus: true, sessionVersion: true },
  })
  const roleMap = { STAFF: 'staff', LECTURER: 'lecturer', STUDENT: 'student' } as const
  const statusMap = { ACTIVE: 'active', FIRST_LOGIN: 'first-login' } as const
  const accountIsValid = account
    && account.recordStatus === 'ACTIVE'
    && (account.status === 'ACTIVE' || account.status === 'FIRST_LOGIN')
    && roleMap[account.role] === user.role
    && statusMap[account.status] === user.status
    && account.sessionVersion === user.sessionVersion
  if (!accountIsValid) {
    await session.clear()
    return null
  }
  return user
}

export const requireUserSession = async (event: H3Event, roles?: readonly SessionRole[], allowFirstLogin = false) => {
  const user = await getUserSession(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'AUTHENTICATION_REQUIRED' })
  if (user.status === 'first-login' && !allowFirstLogin) {
    throw createError({ statusCode: 403, statusMessage: 'PASSWORD_CHANGE_REQUIRED' })
  }
  if (roles && !roles.includes(user.role)) throw createError({ statusCode: 403, statusMessage: 'FORBIDDEN' })
  return user
}

export const setUserSession = async (event: H3Event, user: AuthenticatedUser) => {
  const session = await useSession<CwieSessionData>(event, sessionConfig(event))
  await session.update({ user })
}

export const clearUserSession = (event: H3Event) => clearSession(event, sessionConfig(event))
