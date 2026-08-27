<script setup lang="ts">
import type { PageResult } from '~/types/ui'
const { request } = useApiClient()
const notifications = ref<Array<Record<string, unknown>>>([])
const loading = ref(true)
const error = ref('')
const toast = useToast()

async function load() {
  loading.value = true
  error.value = ''
  try {
    notifications.value = (await request<PageResult<Record<string, unknown>>>('/api/notifications', { query: { page: 1, pageSize: 100 } })).items
  } catch (cause) {
    notifications.value = []
    error.value = cause instanceof Error ? cause.message : 'โหลดการแจ้งเตือนไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

async function openExport(item: Record<string, unknown>) {
  const exportId = String(item.entityId || '')
  if (!exportId) {
    toast.add({ title: 'ไม่พบไฟล์ส่งออก', description: 'การแจ้งเตือนไม่มีรหัสอ้างอิง', color: 'warning' })
    return
  }
  try {
    const job = await request<{ status: string, failureReason?: string }>(`/api/exports/${exportId}`)
    if (job.status === 'FAILED') {
      toast.add({ title: 'ส่งออกข้อมูลไม่สำเร็จ', description: job.failureReason || 'กรุณาส่งออกใหม่', color: 'error' })
      return
    }
    if (job.status !== 'COMPLETED') {
      toast.add({ title: 'ไฟล์ยังไม่พร้อม', description: 'ระบบยังจัดเตรียมไฟล์อยู่ กรุณาลองตรวจอีกครั้ง', color: 'warning' })
      return
    }
    const download = await request<{ url: string }>(`/api/exports/${exportId}/download`)
    window.open(download.url, '_blank', 'noopener,noreferrer')
  } catch (cause) {
    toast.add({ title: 'ดาวน์โหลดไม่สำเร็จ', description: cause instanceof Error ? cause.message : 'โปรดลองอีกครั้ง', color: 'error' })
  }
}
onMounted(load)
</script>
<template>
  <div><PageHeader title="การแจ้งเตือน" description="ติดตามข่าวสาร งานที่ต้องดำเนินการ และเหตุการณ์สำคัญจากระบบ" icon="i-lucide-bell" />
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div v-if="loading" class="space-y-3 p-5"><div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
      <div v-else-if="error" class="grid min-h-64 place-items-center p-5 text-center text-rose-700"><div><p>{{ error }}</p><UButton class="mt-4" icon="i-lucide-refresh-cw" label="ลองอีกครั้ง" @click="load" /></div></div>
      <div v-else-if="!notifications.length" class="grid min-h-64 place-items-center text-center text-slate-500"><div><UIcon name="i-lucide-bell-off" class="mx-auto mb-3 size-10" />ยังไม่มีการแจ้งเตือน</div></div>
      <article v-for="(item, i) in notifications" :key="String(item.id || i)" class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 last:border-0 dark:border-slate-800"><div><p class="font-medium">{{ item.title }}</p><p class="mt-1 text-sm text-slate-500">{{ item.body }}</p></div><UButton v-if="item.entityType === 'ExportJob'" color="neutral" variant="outline" icon="i-lucide-download" label="ตรวจสถานะและดาวน์โหลด" @click="openExport(item)" /></article>
    </section>
  </div>
</template>
