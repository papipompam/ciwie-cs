<script setup lang="ts">
import type { PageResult } from '~/types/ui'

interface DocumentSummary { id: string, requestNumber: string, studentName: string, workSiteName: string, status: string }
interface VisitSummary { id: string, visitDate: string, period: string, workSiteName: string, lecturers: string, status: string }

const { user } = useSession()
const { request } = useApiClient()
const metrics = ref<Record<string, number>>({})
const recentDocuments = ref<DocumentSummary[]>([])
const todayVisits = ref<VisitSummary[]>([])
const recentDocumentTotal = ref(0)
const activityLoading = ref(false)
const activityError = ref(false)

onMounted(async () => {
  try { metrics.value = await request<Record<string, number>>('/api/dashboard') } catch { metrics.value = {} }
  if (user.value?.role !== 'ADMIN') return
  activityLoading.value = true
  try {
    const [documents, visits] = await Promise.all([
      request<PageResult<DocumentSummary>>('/api/document-requests', { query: { page: 1, pageSize: 5 } }),
      request<PageResult<VisitSummary>>('/api/visits', { query: { page: 1, pageSize: 100 } })
    ])
    recentDocuments.value = documents.items
    recentDocumentTotal.value = documents.total
    const today = new Date().toISOString().slice(0, 10)
    todayVisits.value = visits.items.filter(item => String(item.visitDate).slice(0, 10) === today).slice(0, 5)
  } catch {
    activityError.value = true
  } finally {
    activityLoading.value = false
  }
})

const roleContent = computed(() => {
  if (user.value?.role === 'STUDENT') return {
    title: 'ภาพรวมการฝึกงานของฉัน', description: 'ตรวจสอบงานที่ต้องทำ เอกสาร สถานที่ฝึกงาน และกำหนดนิเทศ',
    cards: [{ label: 'ใบสมัครที่ดำเนินการ', value: metrics.value.applications ?? 0, icon: 'i-lucide-briefcase-business', to: '/applications', tone: 'primary' as const, helper: 'รายการที่ยังอยู่ในกระบวนการ' }, { label: 'เอกสารรอดำเนินการ', value: metrics.value.documents ?? 0, icon: 'i-lucide-files', to: '/documents', tone: 'warning' as const, helper: 'คำขอและเอกสารที่เกี่ยวข้อง' }, { label: 'นัดนิเทศที่กำลังจะถึง', value: metrics.value.upcomingVisits ?? 0, icon: 'i-lucide-calendar-days', to: '/visits', tone: 'success' as const, helper: 'รายการที่จัดตารางแล้ว' }]
  }
  if (user.value?.role === 'LECTURER') return {
    title: 'งานนิเทศของอาจารย์', description: 'ติดตามงานรอตรวจ ตารางนิเทศ และการประเมินที่ยังไม่สมบูรณ์',
    cards: [{ label: 'แบบตอบรับรอตรวจ', value: metrics.value.pendingResponses ?? 0, icon: 'i-lucide-mail-check', to: '/responses', tone: 'warning' as const, helper: 'รอการตรวจและยืนยันผล' }, { label: 'นัดนิเทศที่รับผิดชอบ', value: metrics.value.assignedVisits ?? 0, icon: 'i-lucide-calendar-days', to: '/visits', tone: 'primary' as const, helper: 'กำหนดการที่กำลังจะถึง' }, { label: 'การประเมินค้างส่ง', value: metrics.value.pendingEvaluations ?? 0, icon: 'i-lucide-clipboard-check', to: '/evaluations', tone: 'error' as const, helper: 'รายการที่ยังไม่สมบูรณ์' }]
  }
  return {
    title: 'หน้าแรก', description: 'ภาพรวมข้อมูลและงานที่ต้องดำเนินการในรอบสหกิจศึกษาปัจจุบัน',
    cards: [
      { label: 'นักศึกษาทั้งหมด', value: metrics.value.students ?? 0, icon: 'i-lucide-users', to: '/students', tone: 'primary' as const, helper: 'ในรอบสหกิจปัจจุบัน' },
      { label: 'สถานประกอบการ', value: metrics.value.organizations ?? 0, icon: 'i-lucide-building-2', to: '/organizations', tone: 'success' as const, helper: 'ที่เปิดใช้งานอยู่' },
      { label: 'การสมัครทั้งหมด', value: metrics.value.applications ?? 0, icon: 'i-lucide-clipboard-list', to: '/applications', tone: 'warning' as const, helper: 'ในรอบสหกิจปัจจุบัน' },
      { label: 'เอกสารทั้งหมด', value: metrics.value.documents ?? 0, icon: 'i-lucide-files', to: '/documents', tone: 'violet' as const, helper: 'คำขอเอกสารในระบบ' },
      { label: 'ยืนยันสถานที่ฝึกงานแล้ว', value: metrics.value.placements ?? 0, icon: 'i-lucide-circle-check-big', to: '/placements', tone: 'info' as const, helper: 'นักศึกษาที่มีสถานที่ฝึกงาน' },
      { label: 'ค่าใช้จ่ายรวม', value: Number(metrics.value.expenses ?? 0).toLocaleString('th-TH'), icon: 'i-lucide-badge-dollar-sign', to: '/expenses', tone: 'error' as const, helper: 'บาท' }
    ]
  }
})

const statusLabel = (status: string) => ({ REQUESTED: 'รับคำขอแล้ว', IN_PROGRESS: 'กำลังดำเนินการ', READY_TO_SEND: 'พร้อมส่ง', SCHEDULED: 'รอดำเนินการ', COMPLETED: 'ดำเนินการแล้ว', POSTPONED: 'เลื่อนนัด', CANCELLED: 'ยกเลิก' })[status] || status
const statusClass = (status: string) => status === 'COMPLETED' || status === 'READY_TO_SEND' ? 'bg-emerald-50 text-emerald-700' : status === 'CANCELLED' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'
const visitPeriod = (period: string) => ({ MORNING: '09:00–12:00', AFTERNOON: '13:00–16:00' })[period] || period
</script>

<template>
  <div>
    <PageHeader :title="roleContent.title" :description="roleContent.description" icon="i-lucide-layout-dashboard" />
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="ข้อมูลสรุป">
      <MetricCard v-for="card in roleContent.cards" :key="card.label" v-bind="card" />
    </section>
    <div v-if="user?.role === 'ADMIN'" class="mt-5 grid gap-5 xl:grid-cols-2">
      <section class="app-panel overflow-hidden" aria-labelledby="recent-documents-title">
        <div class="flex items-center justify-between gap-3 px-5 py-4"><h2 id="recent-documents-title" class="text-lg font-bold text-slate-950 dark:text-white">คำขอเอกสารล่าสุด</h2><NuxtLink to="/documents" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">ดูทั้งหมด</NuxtLink></div>
        <div v-if="activityLoading" class="space-y-3 px-5 pb-5"><div v-for="i in 4" :key="i" class="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
        <p v-else-if="activityError" class="px-5 pb-6 text-sm text-rose-600">โหลดข้อมูลล่าสุดไม่สำเร็จ</p>
        <div v-else class="overflow-x-auto px-3 pb-4">
          <table class="w-full min-w-[34rem] text-left text-sm"><thead class="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800"><tr><th class="px-3 py-3">รหัสคำขอ</th><th class="px-3 py-3">นักศึกษา</th><th class="px-3 py-3">สถานประกอบการ</th><th class="px-3 py-3">สถานะ</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="item in recentDocuments" :key="item.id"><td class="px-3 py-3 font-medium text-indigo-600">{{ item.requestNumber }}</td><td class="px-3 py-3">{{ item.studentName }}</td><td class="px-3 py-3">{{ item.workSiteName }}</td><td class="px-3 py-3"><span class="inline-flex rounded-md px-2 py-1 text-xs font-medium" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span></td></tr></tbody></table>
          <p v-if="!recentDocuments.length" class="py-10 text-center text-sm text-slate-500">ยังไม่มีคำขอเอกสาร</p>
          <p v-else class="px-3 pt-4 text-xs text-slate-500">แสดง {{ recentDocuments.length }} จาก {{ recentDocumentTotal }} รายการ</p>
        </div>
      </section>
      <section class="app-panel overflow-hidden" aria-labelledby="today-visits-title">
        <div class="flex items-center justify-between gap-3 px-5 py-4"><h2 id="today-visits-title" class="text-lg font-bold text-slate-950 dark:text-white">กำหนดการนิเทศวันนี้</h2><NuxtLink to="/visits" class="text-sm font-semibold text-indigo-600 hover:text-indigo-700">ดูทั้งหมด</NuxtLink></div>
        <div v-if="activityLoading" class="space-y-3 px-5 pb-5"><div v-for="i in 3" :key="i" class="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" /></div>
        <p v-else-if="activityError" class="px-5 pb-6 text-sm text-rose-600">โหลดกำหนดการไม่สำเร็จ</p>
        <div v-else class="overflow-x-auto px-3 pb-4">
          <table class="w-full min-w-[34rem] text-left text-sm"><thead class="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800"><tr><th class="px-3 py-3">เวลา</th><th class="px-3 py-3">สถานประกอบการ</th><th class="px-3 py-3">อาจารย์นิเทศ</th><th class="px-3 py-3">สถานะ</th></tr></thead><tbody class="divide-y divide-slate-100 dark:divide-slate-800"><tr v-for="item in todayVisits" :key="item.id"><td class="px-3 py-3 tabular-nums">{{ visitPeriod(item.period) }}</td><td class="px-3 py-3">{{ item.workSiteName }}</td><td class="px-3 py-3">{{ item.lecturers || '—' }}</td><td class="px-3 py-3"><span class="inline-flex rounded-md px-2 py-1 text-xs font-medium" :class="statusClass(item.status)">{{ statusLabel(item.status) }}</span></td></tr></tbody></table>
          <p v-if="!todayVisits.length" class="py-10 text-center text-sm text-slate-500">วันนี้ไม่มีกำหนดการนิเทศ</p>
          <p v-else class="px-3 pt-4 text-xs text-slate-500">แสดง {{ todayVisits.length }} รายการ</p>
        </div>
      </section>
    </div>
  </div>
</template>
