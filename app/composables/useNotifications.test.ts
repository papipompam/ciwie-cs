import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, ref, watch } from 'vue'
import { type AppNotification, useNotifications } from './useNotifications'

describe('useNotifications', () => {
  const currentAccount = ref<{ id: string, role: 'staff' | 'lecturer' | 'student' }>({ id: 'staff-1', role: 'staff' })
  const data = ref<AppNotification[]>([{
    id: 'notification-1', role: 'staff' as const, title: 'รายการสำหรับเจ้าหน้าที่', description: '', createdAt: '2026-09-13T00:00:00.000Z', to: '/', tone: 'info' as const, readAt: null,
  }])
  const refresh = vi.fn(async () => {
    data.value = [{
      id: 'notification-2', role: currentAccount.value.role, title: 'รายการสำหรับบัญชีปัจจุบัน', description: '', createdAt: '2026-09-13T00:00:00.000Z', to: '/', tone: 'info', readAt: null,
    }]
  })

  beforeEach(() => {
    const state = new Map<string, ReturnType<typeof ref>>()
    vi.stubGlobal('useState', (key: string, init: () => unknown) => {
      if (!state.has(key)) state.set(key, ref(init()))
      return state.get(key)
    })
    vi.stubGlobal('useAuthPrototype', () => ({ currentAccount }))
    vi.stubGlobal('useFetch', () => ({ data, status: ref('success'), error: ref(null), refresh }))
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('onMounted', () => undefined)
    vi.stubGlobal('onBeforeUnmount', () => undefined)
    vi.stubGlobal('navigateTo', vi.fn())
    currentAccount.value = { id: 'staff-1', role: 'staff' }
    data.value = [{ id: 'notification-1', role: 'staff', title: 'รายการสำหรับเจ้าหน้าที่', description: '', createdAt: '2026-09-13T00:00:00.000Z', to: '/', tone: 'info', readAt: null }]
    refresh.mockClear()
  })

  afterEach(() => vi.unstubAllGlobals())

  it('refreshes notifications when the signed-in account changes', async () => {
    const notifications = useNotifications()
    currentAccount.value = { id: 'lecturer-1', role: 'lecturer' }
    await nextTick()

    expect(refresh).toHaveBeenCalledOnce()
    expect(notifications.roleNotifications.value).toMatchObject([{ id: 'notification-2', role: 'lecturer' }])
  })
})
