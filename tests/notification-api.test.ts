import { describe, expect, it, vi } from 'vitest'

const request = { id: '' }
vi.mock('../server/utils/session', () => ({
  requireUserSession: vi.fn(async () => ({ id: 'staff-001', username: 'staff001', role: 'staff', status: 'active', sessionVersion: 1 })),
}))
vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
vi.stubGlobal('getRouterParam', () => request.id)
vi.stubGlobal('getQuery', () => ({}))
vi.stubGlobal('setResponseHeaders', vi.fn())
vi.stubGlobal('createError', (details: { statusCode: number, statusMessage: string }) => Object.assign(new Error(details.statusMessage), details))

const deliveredAt = new Date('2026-09-09T03:00:00.000Z')
const recipient = {
  notificationId: 'NOTIFICATION-001', accountId: 'staff-001', deliveredAt, readAt: null as Date | null,
  notification: { id: 'NOTIFICATION-001', title: 'มีคำร้องใหม่', body: 'นักศึกษาทดสอบ · บริษัททดสอบ', deepLink: '/staff/requests', severity: 'INFO', createdAt: deliveredAt },
}
const prisma = {
  notificationRecipient: {
    findMany: vi.fn(async () => [recipient]),
    count: vi.fn(async () => 1),
    updateMany: vi.fn(async ({ where, data }: { where: { notificationId?: string, accountId: string, readAt: null }, data: { readAt: Date } }) => {
      if (where.notificationId && where.notificationId !== recipient.notificationId) return { count: 0 }
      recipient.readAt = data.readAt
      return { count: 1 }
    }),
    findUnique: vi.fn(async ({ where }: { where: { notificationId_accountId: { notificationId: string, accountId: string } } }) =>
      where.notificationId_accountId.notificationId === recipient.notificationId ? recipient : null),
  },
  $transaction: vi.fn(async (items: Promise<unknown>[]) => Promise.all(items)),
}
vi.stubGlobal('usePrisma', () => prisma)

const { default: listNotifications } = await import('../server/api/notifications.get')
const { default: readNotification } = await import('../server/api/notifications/[id]/read.patch')

describe('notification API', () => {
  it('lists only notifications delivered to the authenticated account', async () => {
    const result = await listNotifications({} as Parameters<typeof listNotifications>[0])
    expect(result).toEqual([{
      id: 'NOTIFICATION-001', role: 'staff', title: 'มีคำร้องใหม่', description: 'นักศึกษาทดสอบ · บริษัททดสอบ',
      createdAt: deliveredAt.toISOString(), to: '/staff/requests', tone: 'info', readAt: null,
    }])
  })

  it('marks only the authenticated account recipient as read', async () => {
    request.id = 'NOTIFICATION-001'
    await expect(readNotification({} as Parameters<typeof readNotification>[0])).resolves.toMatchObject({ status: 'success' })
    expect(prisma.notificationRecipient.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { notificationId: 'NOTIFICATION-001', accountId: 'staff-001', readAt: null },
    }))
  })
})
