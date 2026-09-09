import { z } from 'zod'
import type { UserRole } from '@prisma/client'
import { setUserSession, type AuthenticatedUser, type SessionRole } from '../../utils/session'

const bodySchema = z.object({ role: z.enum(['staff', 'lecturer', 'student']) }).strict()
const roleToPrisma: Record<SessionRole, UserRole> = {
  staff: 'STAFF',
  lecturer: 'LECTURER',
  student: 'STUDENT',
}

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: 'NOT_FOUND' })
  const body = bodySchema.safeParse(await readBody(event))
  if (!body.success) throw createError({ statusCode: 400, statusMessage: 'INVALID_ROLE' })

  const account = await usePrisma().user.findFirst({
    where: { role: roleToPrisma[body.data.role], status: 'ACTIVE', recordStatus: 'ACTIVE' },
    select: {
      id: true, username: true, namePrefix: true, firstName: true, lastName: true, sessionVersion: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  if (!account) throw createError({ statusCode: 404, statusMessage: 'PROTOTYPE_ACCOUNT_NOT_FOUND' })

  const user: AuthenticatedUser = {
    id: account.id,
    username: account.username,
    role: body.data.role,
    name: [account.namePrefix, account.firstName, account.lastName].filter(Boolean).join(' '),
    status: 'active',
    sessionVersion: account.sessionVersion,
  }
  await setUserSession(event, user)
  return { account: user }
})
