import { z } from 'zod'
import { hashPassword, verifyPassword } from '../../utils/password'
import { requireUserSession, setUserSession } from '../../utils/session'

const passwordSchema = z.object({
  currentPassword: z.string().max(255).optional(),
  newPassword: z.string().min(8).max(255),
}).strict()

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event, undefined, true)
  const body = passwordSchema.safeParse(await readBody(event))
  if (!body.success) throw createError({ statusCode: 400, statusMessage: 'INVALID_PASSWORD_DATA', data: body.error.flatten().fieldErrors })

  const prisma = usePrisma()
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, status: true } })
  if (!account) throw createError({ statusCode: 401, statusMessage: 'AUTHENTICATION_REQUIRED' })
  if (account.status !== 'FIRST_LOGIN' && (!body.data.currentPassword || !await verifyPassword(body.data.currentPassword, account.passwordHash))) {
    throw createError({ statusCode: 400, statusMessage: 'CURRENT_PASSWORD_INVALID' })
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.data.newPassword), status: 'ACTIVE', passwordChangedAt: new Date(), sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  })
  await setUserSession(event, { ...user, status: 'active', sessionVersion: updated.sessionVersion })
  return { status: 'success' }
})
