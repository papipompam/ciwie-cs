export type NotificationRole = 'staff' | 'lecturer' | 'student'
export type NotificationTone = 'info' | 'warning' | 'success'

export interface AppNotification {
  id: string
  role: NotificationRole
  title: string
  description: string
  createdAt: string
  to: string
  tone: NotificationTone
  readAt: string | null
}

const notificationRefreshers = new Set<() => Promise<unknown>>()
let notificationPollingTimer: ReturnType<typeof setInterval> | undefined
const startNotificationPolling = (refresh: () => Promise<unknown>) => {
  notificationRefreshers.add(refresh)
  if (!notificationPollingTimer) {
    notificationPollingTimer = setInterval(() => {
      for (const refreshNotifications of notificationRefreshers) void refreshNotifications().catch(() => undefined)
    }, 15_000)
  }
}
const stopNotificationPolling = (refresh: () => Promise<unknown>) => {
  notificationRefreshers.delete(refresh)
  if (!notificationRefreshers.size && notificationPollingTimer) {
    clearInterval(notificationPollingTimer)
    notificationPollingTimer = undefined
  }
}

export const useNotifications = () => {
  const { currentAccount } = useAuthPrototype()
  const notifications = useState<AppNotification[]>('app-notifications-v1', () => [])
  const { data, status, error, refresh } = useFetch<AppNotification[]>('/api/notifications', { key: 'account-notifications' })
  watch(data, (items) => { if (items) notifications.value = items }, { immediate: true })
  watch(error, (value) => { if (value) notifications.value = [] }, { immediate: true })
  watch(() => currentAccount.value?.id, (accountId, previousAccountId) => {
    if (accountId === previousAccountId) return
    notifications.value = []
    if (accountId) void refresh()
  })
  const refreshWhenVisible = () => {
    if (document.visibilityState === 'visible') void refresh()
  }
  onMounted(() => {
    startNotificationPolling(refresh)
    void refresh()
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
  })
  onBeforeUnmount(() => {
    stopNotificationPolling(refresh)
    window.removeEventListener('focus', refreshWhenVisible)
    document.removeEventListener('visibilitychange', refreshWhenVisible)
  })
  const roleNotifications = computed(() => notifications.value
    .filter(item => item.role === currentAccount.value?.role)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)))
  const unreadCount = computed(() => roleNotifications.value.filter(item => !item.readAt).length)

  const markAsRead = async (id: string) => {
    const notification = notifications.value.find(item => item.id === id && item.role === currentAccount.value?.role)
    if (!notification || notification.readAt) return
    const result = await $fetch<{ readAt: string }>(`/api/notifications/${id}/read`, { method: 'PATCH' })
    notification.readAt = result.readAt
  }
  const markAllAsRead = async () => {
    const unread = roleNotifications.value.filter(item => !item.readAt)
    if (!unread.length) return
    const { readAt } = await $fetch<{ readAt: string }>('/api/notifications/read-all', { method: 'PATCH' })
    unread.forEach((item) => { item.readAt = readAt })
  }
  const openNotification = async (notification: AppNotification) => {
    await markAsRead(notification.id)
    await navigateTo(notification.to)
  }

  return { notifications, roleNotifications, unreadCount, fetchStatus: status, fetchError: error, refreshNotifications: refresh, markAsRead, markAllAsRead, openNotification }
}
