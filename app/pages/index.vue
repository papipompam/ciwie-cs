<script setup lang="ts">
const { user } = useSession()
const { request } = useApiClient()
const metrics = ref<Record<string, number>>({})

onMounted(async () => {
  try { metrics.value = await request<Record<string, number>>('/api/dashboard') } catch { metrics.value = {} }
})

const roleContent = computed(() => {
  if (user.value?.role === 'STUDENT') return {
    title: 'ภาพรวมการฝึกงานของฉัน', description: 'ตรวจสอบงานที่ต้องทำ เอกสาร สถานที่ฝึกงาน และกำหนดนิเทศ',
    cards: [{ label: 'ใบสมัครที่ดำเนินการ', value: metrics.value.applications ?? 0, icon: 'i-lucide-briefcase-business', to: '/applications' }, { label: 'เอกสารรอดำเนินการ', value: metrics.value.documents ?? 0, icon: 'i-lucide-files', to: '/documents' }, { label: 'นัดนิเทศที่กำลังจะถึง', value: metrics.value.upcomingVisits ?? 0, icon: 'i-lucide-calendar-days', to: '/visits' }]
  }
  if (user.value?.role === 'LECTURER') return {
    title: 'งานนิเทศของอาจารย์', description: 'ติดตามงานรอตรวจ ตารางนิเทศ และการประเมินที่ยังไม่สมบูรณ์',
    cards: [{ label: 'แบบตอบรับรอตรวจ', value: metrics.value.pendingResponses ?? 0, icon: 'i-lucide-mail-check', to: '/responses' }, { label: 'นัดนิเทศที่รับผิดชอบ', value: metrics.value.assignedVisits ?? 0, icon: 'i-lucide-calendar-days', to: '/visits' }, { label: 'การประเมินค้างส่ง', value: metrics.value.pendingEvaluations ?? 0, icon: 'i-lucide-clipboard-check', to: '/evaluations' }]
  }
  return {
    title: 'ภาพรวมการดำเนินงาน', description: 'ติดตามความคืบหน้าของนักศึกษา เอกสาร การนิเทศ และรายการที่ต้องดำเนินการ',
    cards: [{ label: 'นักศึกษาในภาคปัจจุบัน', value: metrics.value.students ?? 0, icon: 'i-lucide-users', to: '/students' }, { label: 'ยังไม่ได้จัดตาราง', value: metrics.value.unscheduled ?? 0, icon: 'i-lucide-calendar-x', to: '/visits?coverage=UNSCHEDULED' }, { label: 'แบบตอบรับรอยืนยัน', value: metrics.value.pendingResponses ?? 0, icon: 'i-lucide-mail-check', to: '/responses?status=PENDING_REVIEW' }, { label: 'กิจกรรม 24 ชม.', value: metrics.value.recentAudit ?? 0, icon: 'i-lucide-history', to: '/audit' }]
  }
})
</script>

<template>
  <div>
    <PageHeader :title="roleContent.title" :description="roleContent.description" icon="i-lucide-layout-dashboard" />
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="ข้อมูลสรุป">
      <NuxtLink v-for="card in roleContent.cards" :key="card.label" :to="card.to" class="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700">
        <div class="flex items-center justify-between"><span class="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"><UIcon :name="card.icon" class="size-5" /></span><UIcon name="i-lucide-arrow-up-right" class="size-4 text-slate-400 transition group-hover:text-teal-600" /></div>
        <p class="mt-5 text-2xl font-semibold">{{ card.value }}</p><p class="mt-1 text-sm text-slate-500">{{ card.label }}</p>
      </NuxtLink>
    </section>
    <section class="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 class="font-semibold">สิ่งที่ควรทำต่อ</h2>
      <p class="mt-2 text-sm text-slate-500">ข้อมูลจากระบบจะปรากฏที่นี่ตามสิทธิ์และงานที่ได้รับมอบหมาย โดยจะไม่แสดงข้อมูลที่อยู่นอกขอบเขตของคุณ</p>
    </section>
  </div>
</template>
