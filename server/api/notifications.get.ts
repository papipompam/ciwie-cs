import { z } from 'zod'
import { requireUserSession } from '../utils/session'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

export default defineEventHandler(async (event) => {
  const user = await requireUserSession(event)
  const query = querySchema.safeParse(getQuery(event))
  if (!query.success) throw createError({ statusCode: 400, statusMessage: 'INVALID_PAGINATION' })
  const prisma = usePrisma()
  const where = { accountId: user.id }
  const [recipients, total] = await prisma.$transaction([
    prisma.notificationRecipient.findMany({
      where,
      include: { notification: true },
      orderBy: [{ deliveredAt: 'desc' }, { id: 'desc' }],
      skip: (query.data.page - 1) * query.data.pageSize,
      take: query.data.pageSize,
    }),
    prisma.notificationRecipient.count({ where }),
  ])
  setResponseHeaders(event, {
    'x-total-count': String(total),
    'x-page': String(query.data.page),
    'x-page-size': String(query.data.pageSize),
  })
  return recipients.map(({ notification, readAt }) => ({
    id: notification.id,
    role: user.role,
    title: notification.title,
    description: notification.body,
    createdAt: notification.createdAt.toISOString(),
    to: notification.deepLink ?? '/',
    tone: notification.severity === 'INFO' ? 'info' as const : 'warning' as const,
    readAt: readAt?.toISOString() ?? null,
  }))
})
