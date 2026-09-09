import { requireUserSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event)
  const readAt = new Date()
  const result = await usePrisma().notificationRecipient.updateMany({
    where: { accountId: user.id, readAt: null },
    data: { readAt },
  })
  return { status: 'success', count: result.count, readAt: readAt.toISOString() }
})
