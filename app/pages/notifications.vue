<script setup lang="ts">
import { Bell, BellRing, CheckCheck } from '@lucide/vue'

definePageMeta({ title: 'การแจ้งเตือน' })
useHead({ title: 'การแจ้งเตือน' })

const { scenario } = useScenario()
const { roleNotifications, unreadCount, markAllAsRead, openNotification } = useNotifications()
const effectiveViewState = computed(() => scenario.value.forceError ? 'error' : scenario.value.viewState)
const retry = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
}
const formatDateTime = (value: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
</script>

<template>
  <div>
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p class="text-sm font-semibold text-primary">ศูนย์การแจ้งเตือน</p><h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">การแจ้งเตือน</h2><p class="mt-1 text-sm leading-6 text-muted">ติดตามการเปลี่ยนแปลงและเปิดไปยังรายการที่ต้องดำเนินการ</p></div>
      <UiButton v-if="unreadCount" variant="secondary" :icon="CheckCheck" @click="markAllAsRead">อ่านทั้งหมด {{ unreadCount }} รายการ</UiButton>
    </header>

    <UiCard :padded="false">
      <div v-if="effectiveViewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดการแจ้งเตือน"><UiSkeleton v-for="index in 4" :key="index" class="h-24" /></div>
      <div v-else-if="effectiveViewState === 'error'" class="p-5 sm:p-6"><AppErrorState title="โหลดการแจ้งเตือนไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง" @retry="retry" /></div>
      <div v-else-if="effectiveViewState === 'empty' || !roleNotifications.length" class="p-5 sm:p-6"><AppEmptyState title="ยังไม่มีการแจ้งเตือน" description="เมื่อมีงานใหม่หรือข้อมูลเปลี่ยนแปลง การแจ้งเตือนจะแสดงที่นี่"><template #default><Bell :size="24" aria-hidden="true" /></template></AppEmptyState></div>
      <div v-else class="divide-y divide-divider">
        <button v-for="notification in roleNotifications" :key="notification.id" type="button" class="flex w-full items-start gap-4 p-5 text-left transition-colors hover:bg-surface sm:p-6" :class="notification.readAt ? '' : 'bg-info-soft/50'" @click="openNotification(notification)">
          <span class="grid size-10 shrink-0 place-items-center rounded-control" :class="notification.readAt ? 'bg-surface text-muted' : 'bg-info-soft text-info'"><BellRing :size="19" aria-hidden="true" /></span>
          <span class="min-w-0 flex-1"><span class="flex flex-wrap items-center gap-2"><span class="font-semibold text-ink">{{ notification.title }}</span><UiBadge v-if="!notification.readAt" tone="info">ใหม่</UiBadge></span><span class="mt-1 block text-sm leading-6 text-muted">{{ notification.description }}</span><span class="mt-2 block text-xs text-muted">{{ formatDateTime(notification.createdAt) }}</span></span>
        </button>
      </div>
    </UiCard>
  </div>
</template>
