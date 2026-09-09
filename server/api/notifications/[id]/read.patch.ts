import { requireUserSession } from '../../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event)
  const notificationId = getRouterParam(event, 'id')
  if (!notificationId) throw createError({ statusCode: 400, statusMessage: 'NOTIFICATION_ID_REQUIRED' })
  const readAt = new Date()
  const updated = await usePrisma().notificationRecipient.updateMany({
    where: { notificationId, accountId: user.id, readAt: null },
    data: { readAt },
  })
  if (updated.count === 0) {
    const existing = await usePrisma().notificationRecipient.findUnique({
      where: { notificationId_accountId: { notificationId, accountId: user.id } },
      select: { readAt: true },
    })
    if (!existing) throw createError({ statusCode: 404, statusMessage: 'NOTIFICATION_NOT_FOUND' })
    return { status: 'success', readAt: existing.readAt?.toISOString() ?? readAt.toISOString() }
  }
  return { status: 'success', readAt: readAt.toISOString() }
})
