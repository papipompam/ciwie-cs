<script setup lang="ts">
import { ArrowLeft, Ban, Building2, CalendarDays, Edit3, FileText, MapPin, UserRound } from '@lucide/vue'

definePageMeta({ title: 'รายละเอียดคำร้อง', middleware: 'student-prototype' })
useHead({ title: 'รายละเอียดคำร้อง' })

const route = useRoute()
const { scenario, recordEvent } = useScenario()
const { findRequest, findCompany, cancelRequest } = useStudentPlacements()
const { showToast } = useToast()
const requestId = computed(() => String(route.params.id))
const request = computed(() => findRequest(requestId.value))
const company = computed(() => request.value ? findCompany(request.value.companyId) : undefined)
const canEdit = computed(() => request.value && ['draft', 'submitted', 'returned'].includes(request.value.status))
const canCancel = computed(() => request.value && ['draft', 'submitted', 'returned'].includes(request.value.status))
const isLocked = computed(() => request.value && ['batched', 'letter-issued', 'response-uploaded', 'response-returned'].includes(request.value.status))
const effectiveViewState = computed(() => scenario.value.forceError ? 'error' : scenario.value.viewState)

const formatDate = (date: string, includeTime = false) => new Intl.DateTimeFormat('th-TH', includeTime
  ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
  : { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date.includes('T') ? date : `${date}T00:00:00+07:00`))
const retry = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
}
const confirmCancel = () => {
  if (!cancelRequest(requestId.value)) return
  recordEvent(`ยกเลิกคำร้อง ${requestId.value}`)
  showToast({ title: 'ยกเลิกคำร้องแล้ว', description: 'ประวัติคำร้องยังคงอยู่ในระบบ' })
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <button type="button" class="mb-4 inline-flex min-h-10 items-center gap-2 rounded-control text-sm font-medium text-muted hover:text-ink" @click="navigateTo('/student/applications')">
      <ArrowLeft :size="18" aria-hidden="true" /> กลับไปหน้าสมัครและยืนยันที่ฝึกงาน
    </button>

    <template v-if="effectiveViewState === 'loading'">
      <UiCard><UiSkeleton class="h-8 w-64" /><UiSkeleton class="mt-4 h-20 w-full" /></UiCard>
      <div class="mt-5 grid gap-5 lg:grid-cols-3"><UiCard v-for="index in 3" :key="index"><UiSkeleton class="h-56 w-full" /></UiCard></div>
    </template>
    <AppErrorState v-else-if="effectiveViewState === 'error'" @retry="retry" />
    <AppEmptyState v-else-if="!request || !company" title="ไม่พบคำร้อง" description="คำร้องนี้อาจไม่มีอยู่หรือไม่ใช่คำร้องของคุณ">
      <UiButton variant="secondary" @click="navigateTo('/student/applications')">กลับไปหน้าสมัครและยืนยันที่ฝึกงาน</UiButton>
    </AppEmptyState>

    <template v-else>
      <div class="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div class="flex flex-wrap items-center gap-2"><p class="text-sm font-medium text-warning">{{ request.id }}</p><UiBadge :tone="placementStatusMeta[request.status].tone">{{ placementStatusMeta[request.status].label }}</UiBadge></div>
          <h2 class="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ company.name }}</h2>
          <p class="mt-1 text-sm text-muted">{{ company.branch }} · {{ request.position }}</p>
        </div>
        <div v-if="canEdit || canCancel" class="flex flex-wrap gap-2">
          <UiDialog v-if="canCancel" title="ยืนยันการยกเลิกคำร้อง" description="คำร้องจะเปลี่ยนเป็นยกเลิกและไม่ถูกดำเนินการต่อ แต่ประวัติจะยังคงอยู่ในระบบ">
            <template #trigger><UiButton variant="secondary" :icon="Ban">ยกเลิกคำร้อง</UiButton></template>
            <template #cancel><UiButton variant="secondary">กลับ</UiButton></template>
            <template #confirm><UiButton variant="danger" @click="confirmCancel">ยืนยันยกเลิก</UiButton></template>
          </UiDialog>
          <UiButton v-if="canEdit" :icon="Edit3" @click="navigateTo(`/student/placements/new?edit=${request.id}`)">แก้ไขคำร้อง</UiButton>
        </div>
      </div>

      <UiAlert v-if="request.returnReason" class="mb-5" tone="warning" title="ต้องแก้ไขก่อนดำเนินการต่อ">{{ request.returnReason }}</UiAlert>
      <UiAlert v-else-if="isLocked" class="mb-5" tone="info" title="คำร้องถูกล็อกแล้ว">
        คำร้องนี้ถูกรวมในชุดหนังสือ จึงไม่สามารถแก้ไขเองได้ หากต้องการแก้ไขให้ติดต่ออาจารย์เพื่อส่งกลับคำร้องก่อน
      </UiAlert>
      <UiAlert v-else class="mb-5" :tone="request.status === 'cancelled' ? 'warning' : 'success'" :title="placementStatusMeta[request.status].label">
        ขั้นตอนถัดไป: {{ placementStatusMeta[request.status].nextStep }}
      </UiAlert>

      <div class="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div class="space-y-5">
          <UiCard>
            <div class="flex items-center gap-3"><div class="grid size-10 place-items-center rounded-control bg-warning-soft text-warning"><Building2 :size="20" aria-hidden="true" /></div><h3 class="font-semibold text-ink">สถานประกอบการ</h3></div>
            <dl class="mt-5 grid gap-4 sm:grid-cols-2">
              <div><dt class="text-xs font-medium text-muted">ชื่อและสาขา</dt><dd class="mt-1 text-sm text-ink">{{ company.name }} · {{ company.branch }}</dd></div>
              <div><dt class="text-xs font-medium text-muted">สถานะข้อมูลหลัก</dt><dd class="mt-1"><UiBadge :tone="companyStatusMeta[company.status].tone">{{ companyStatusMeta[company.status].label }}</UiBadge></dd></div>
              <div class="sm:col-span-2"><dt class="flex items-center gap-1.5 text-xs font-medium text-muted"><MapPin :size="14" aria-hidden="true" /> ที่อยู่</dt><dd class="mt-1 text-sm leading-6 text-ink">{{ company.address }} จังหวัด{{ company.province }}</dd></div>
            </dl>
          </UiCard>

          <UiCard>
            <div class="flex items-center gap-3"><div class="grid size-10 place-items-center rounded-control bg-info-soft text-info"><FileText :size="20" aria-hidden="true" /></div><h3 class="font-semibold text-ink">ข้อมูลการสมัคร</h3></div>
            <dl class="mt-5 grid gap-4 sm:grid-cols-2">
              <div><dt class="text-xs font-medium text-muted">ตำแหน่งฝึกงาน</dt><dd class="mt-1 text-sm text-ink">{{ request.position }}</dd></div>
              <div><dt class="flex items-center gap-1.5 text-xs font-medium text-muted"><CalendarDays :size="14" aria-hidden="true" /> วันที่สมัคร</dt><dd class="mt-1 text-sm text-ink">{{ formatDate(request.appliedAt) }}</dd></div>
              <div class="sm:col-span-2"><dt class="text-xs font-medium text-muted">รายละเอียดงานหรือข้อมูลประกอบ</dt><dd class="mt-1 whitespace-pre-line text-sm leading-6 text-ink">{{ request.details || 'ไม่ได้ระบุ' }}</dd></div>
            </dl>
          </UiCard>

          <UiCard>
            <div class="flex items-center gap-3"><div class="grid size-10 place-items-center rounded-control bg-success-soft text-success"><UserRound :size="20" aria-hidden="true" /></div><div><h3 class="font-semibold text-ink">ข้อมูลสำหรับออกหนังสือ</h3><p class="mt-0.5 text-xs text-muted">ข้อมูลเฉพาะคำร้องนี้ ไม่ใช่ข้อมูลหลักของสถานประกอบการ</p></div></div>
            <dl class="mt-5 grid gap-4 sm:grid-cols-2">
              <div><dt class="text-xs font-medium text-muted">เรียน / ผู้รับหนังสือ</dt><dd class="mt-1 text-sm text-ink">{{ request.recipientName }}</dd></div>
              <div><dt class="text-xs font-medium text-muted">ตำแหน่งหรือหน่วยงาน</dt><dd class="mt-1 text-sm text-ink">{{ request.recipientRole }}</dd></div>
              <div class="sm:col-span-2"><dt class="text-xs font-medium text-muted">ที่อยู่สำหรับออกหนังสือ</dt><dd class="mt-1 text-sm leading-6 text-ink">{{ request.letterAddress }}</dd></div>
            </dl>
          </UiCard>
        </div>

        <UiCard class="self-start">
          <h3 class="font-semibold text-ink">ประวัติคำร้อง</h3>
          <ol class="mt-5 space-y-0">
            <li v-for="(item, index) in request.timeline" :key="item.id" class="relative flex gap-3 pb-6 last:pb-0">
              <span v-if="index < request.timeline.length - 1" class="absolute top-3 left-[5px] h-full w-px bg-divider" aria-hidden="true" />
              <span class="relative mt-1.5 size-3 shrink-0 rounded-full border-2 border-canvas bg-primary ring-2 ring-primary/25" aria-hidden="true" />
              <div><p class="text-sm font-semibold text-ink">{{ item.title }}</p><p class="mt-1 text-xs leading-5 text-muted">{{ item.description }}</p><time class="mt-1.5 block text-xs text-muted">{{ formatDate(item.createdAt, true) }} น.</time></div>
            </li>
          </ol>
        </UiCard>
      </div>
    </template>
  </div>
</template>
