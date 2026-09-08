<script setup lang="ts">
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Plus } from '@lucide/vue'
import { z } from 'zod'
import type { CalendarEventType, RoleCalendarEventInput } from '~/composables/useRoleCalendar'

definePageMeta({ title: 'ปฏิทินงาน' })
useHead({ title: 'ปฏิทินงาน' })

const { scenario } = useScenario()
const { events, addEvent } = useRoleCalendar()
const { showToast } = useToast()

const toBangkokDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const valueByPart = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${valueByPart.year}-${valueByPart.month}-${valueByPart.day}`
}
const calendarToday = useState('calendar-today', () => toBangkokDateKey(new Date()))
const today = calendarToday.value
const viewMonthKey = ref(today.slice(0, 7))
const viewMonth = computed(() => new Date(`${viewMonthKey.value}-01T00:00:00`))
const selectedDate = ref(today)
const selectedType = ref<CalendarEventType | 'all'>('all')
const addDialogOpen = ref(false)
const isSubmitting = ref(false)
const form = reactive<RoleCalendarEventInput>({ title: '', description: '', date: today, type: 'general' })
const fieldErrors = reactive({ title: '', date: '', type: '' })

const eventTypeOptions = [
  { value: 'all', label: 'กิจกรรมทุกประเภท' },
  ...Object.entries(calendarEventTypeMeta).map(([value, meta]) => ({ value, label: meta.label })),
]
const addEventTypeOptions = Object.entries(calendarEventTypeMeta).map(([value, meta]) => ({ value, label: meta.label }))
const weekDays = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']
const monthLabel = computed(() => new Intl.DateTimeFormat('th-TH', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Bangkok',
}).format(new Date(`${viewMonthKey.value}-01T00:00:00+07:00`)))
const visibleEvents = computed(() => selectedType.value === 'all'
  ? events.value
  : events.value.filter(event => event.type === selectedType.value))
const calendarDays = computed(() => eachDayOfInterval({
  start: startOfWeek(startOfMonth(viewMonth.value), { weekStartsOn: 1 }),
  end: endOfWeek(endOfMonth(viewMonth.value), { weekStartsOn: 1 }),
}))
const monthEvents = computed(() => events.value.filter(event => event.date.startsWith(viewMonthKey.value)))
const filteredMonthEvents = computed(() => visibleEvents.value.filter(event => event.date.startsWith(viewMonthKey.value)))
const monthSupervisionCount = computed(() => monthEvents.value.filter(event => event.type === 'supervision').length)
const monthDeadlineCount = computed(() => monthEvents.value.filter(event => event.type === 'deadline').length)
const hasNoFilteredMonthEvents = computed(() => selectedType.value !== 'all' && filteredMonthEvents.value.length === 0)
const selectedTypeLabel = computed(() => eventTypeOptions.find(option => option.value === selectedType.value)?.label ?? '')
const eventsByDate = computed(() => {
  const grouped = new Map<string, typeof visibleEvents.value>()
  for (const event of visibleEvents.value) {
    const dateEvents = grouped.get(event.date) ?? []
    dateEvents.push(event)
    grouped.set(event.date, dateEvents)
  }
  return grouped
})
const selectedDateEvents = computed(() => eventsByDate.value.get(selectedDate.value) ?? [])
const effectiveViewState = computed(() => scenario.value.forceError ? 'error' : scenario.value.viewState)

const eventsForDate = (date: Date) => eventsByDate.value.get(format(date, 'yyyy-MM-dd')) ?? []
const formatFullDate = (date: string) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'full',
  timeZone: 'Asia/Bangkok',
})
  .format(new Date(`${date}T00:00:00+07:00`))
const goToMonth = (offset: number) => {
  viewMonthKey.value = format(addMonths(viewMonth.value, offset), 'yyyy-MM')
  selectedDate.value = format(startOfMonth(viewMonth.value), 'yyyy-MM-dd')
}
const goToCurrentMonth = () => {
  viewMonthKey.value = today.slice(0, 7)
  selectedDate.value = today
}
const selectDay = (date: Date) => {
  selectedDate.value = format(date, 'yyyy-MM-dd')
  if (!isSameMonth(date, viewMonth.value)) viewMonthKey.value = format(date, 'yyyy-MM')
}
const openAddDialog = (date = selectedDate.value) => {
  Object.assign(form, { title: '', description: '', date, type: 'general' as CalendarEventType })
  Object.assign(fieldErrors, { title: '', date: '', type: '' })
  addDialogOpen.value = true
}
const retry = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
}
const eventToneClass = (type: CalendarEventType) => ({
  danger: 'bg-danger-soft',
  warning: 'bg-warning-soft',
  info: 'bg-info-soft',
  interview: 'bg-interview-soft',
  success: 'bg-success-soft',
  neutral: 'bg-surface',
})[calendarEventTypeMeta[type].tone]
const eventSchema = z.object({
  title: z.string().trim().min(1, 'กรุณากรอกชื่อกิจกรรม'),
  description: z.string().trim(),
  date: z.string().min(1, 'กรุณาเลือกวันที่'),
  type: z.enum(['supervision', 'document', 'deadline', 'evaluation', 'general']),
})
const submitEvent = async () => {
  Object.assign(fieldErrors, { title: '', date: '', type: '' })
  const parsed = eventSchema.safeParse(form)
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors
    fieldErrors.title = errors.title?.[0] ?? ''
    fieldErrors.date = errors.date?.[0] ?? ''
    fieldErrors.type = errors.type?.[0] ?? ''
    return
  }

  isSubmitting.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 250))
    addEvent(parsed.data)
    selectedDate.value = parsed.data.date
    viewMonthKey.value = parsed.data.date.slice(0, 7)
    addDialogOpen.value = false
    showToast({ title: 'เพิ่มกิจกรรมแล้ว', description: parsed.data.title })
  }
  catch {
    showToast({ title: 'เพิ่มกิจกรรมไม่สำเร็จ', description: 'กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง' })
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="effectiveViewState === 'loading'" class="space-y-5" aria-label="กำลังโหลดปฏิทินงาน">
      <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <UiSkeleton class="h-[38rem]" />
        <UiSkeleton class="h-80" />
      </div>
    </div>
    <AppErrorState
      v-else-if="effectiveViewState === 'error'"
      title="โหลดปฏิทินงานไม่สำเร็จ"
      description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง"
      @retry="retry"
    />
    <UiCard v-else-if="effectiveViewState === 'empty'">
      <AppEmptyState title="ยังไม่มีกิจกรรมในปฏิทิน" description="กิจกรรมและนัดหมายจะแสดงที่นี่เมื่อมีข้อมูล">
        <UiButton :icon="Plus" @click="openAddDialog()">เพิ่มกิจกรรม</UiButton>
      </AppEmptyState>
    </UiCard>

    <div v-else class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <UiCard :padded="false" class="min-w-0 overflow-hidden">
        <div class="relative flex flex-col gap-4 border-b border-divider p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="grid size-11 shrink-0 place-items-center rounded-control border border-divider text-muted transition-colors hover:bg-surface hover:text-ink"
              aria-label="เดือนก่อนหน้า"
              @click="goToMonth(-1)"
            >
              <ChevronLeft :size="18" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="min-h-11 rounded-control border border-divider px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface"
              @click="goToCurrentMonth"
            >
              เดือนนี้
            </button>
            <button
              type="button"
              class="grid size-11 shrink-0 place-items-center rounded-control border border-divider text-muted transition-colors hover:bg-surface hover:text-ink"
              aria-label="เดือนถัดไป"
              @click="goToMonth(1)"
            >
              <ChevronRight :size="18" aria-hidden="true" />
            </button>
          </div>

          <h3 class="text-lg font-bold text-ink lg:text-center">{{ monthLabel }}</h3>
          <div class="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 lg:w-auto lg:grid-cols-[13rem_auto]">
            <UiSelect v-model="selectedType" :options="eventTypeOptions" label="กรองประเภทกิจกรรม" :label-visible="false" />
            <UiButton :icon="Plus" @click="openAddDialog()">เพิ่มกิจกรรม</UiButton>
          </div>
        </div>

        <dl class="grid grid-cols-3 divide-x divide-divider border-b border-divider bg-surface/60">
          <div class="px-3 py-3 text-center sm:px-5 sm:text-left">
            <dt class="text-xs text-muted sm:text-sm">กิจกรรมทั้งหมด</dt>
            <dd class="mt-1 text-xl font-bold text-ink">{{ monthEvents.length }}</dd>
          </div>
          <div class="px-3 py-3 text-center sm:px-5 sm:text-left">
            <dt class="text-xs text-muted sm:text-sm">นัดนิเทศ</dt>
            <dd class="mt-1 text-xl font-bold text-ink">{{ monthSupervisionCount }}</dd>
          </div>
          <div class="px-3 py-3 text-center sm:px-5 sm:text-left">
            <dt class="text-xs text-muted sm:text-sm">กำหนดส่ง</dt>
            <dd class="mt-1 text-xl font-bold text-ink">{{ monthDeadlineCount }}</dd>
          </div>
        </dl>

        <div v-if="hasNoFilteredMonthEvents" class="border-b border-divider p-4 sm:p-5">
          <UiAlert title="ไม่พบกิจกรรมประเภทนี้ในเดือนที่เลือก">
            <p>{{ selectedTypeLabel }}ยังไม่มีรายการใน{{ monthLabel }}</p>
            <button type="button" class="mt-2 min-h-9 font-semibold underline underline-offset-2" @click="selectedType = 'all'">
              แสดงกิจกรรมทุกประเภท
            </button>
          </UiAlert>
        </div>

        <div class="grid grid-cols-7 border-b border-divider bg-canvas text-center text-xs font-semibold text-muted">
          <div v-for="day in weekDays" :key="day" class="px-1 py-3">{{ day }}</div>
        </div>

        <div class="grid grid-cols-7 md:hidden">
          <button
            v-for="day in calendarDays"
            :key="format(day, 'yyyy-MM-dd')"
            type="button"
            class="relative flex min-h-14 flex-col items-center border-r border-b border-divider px-1 py-2 text-center transition-colors hover:bg-surface focus-visible:z-10"
            :class="selectedDate === format(day, 'yyyy-MM-dd') ? 'bg-warning-soft ring-2 ring-inset ring-primary' : ''"
            :aria-label="`${formatFullDate(format(day, 'yyyy-MM-dd'))} มี ${eventsForDate(day).length} กิจกรรม`"
            :aria-pressed="selectedDate === format(day, 'yyyy-MM-dd')"
            @click="selectDay(day)"
          >
            <span
              class="grid size-7 place-items-center rounded-full text-sm font-semibold"
              :class="[
                isSameMonth(day, viewMonth) ? 'text-ink' : 'text-muted/45',
                today === format(day, 'yyyy-MM-dd') && 'bg-ink text-white',
              ]"
            >{{ format(day, 'd') }}</span>
            <span v-if="eventsForDate(day).length" class="mt-1 flex max-w-full items-center justify-center gap-0.5" aria-hidden="true">
              <span
                v-for="event in eventsForDate(day).slice(0, 3)"
                :key="event.id"
                class="size-1.5 rounded-full"
                :class="calendarEventTypeMeta[event.type].dotClass"
              />
            </span>
          </button>
        </div>

        <div class="hidden grid-cols-7 md:grid">
          <button
            v-for="day in calendarDays"
            :key="format(day, 'yyyy-MM-dd')"
            type="button"
            class="min-h-28 border-r border-b border-divider p-2 text-left align-top transition-colors hover:bg-surface/70 focus-visible:relative focus-visible:z-10 xl:min-h-32"
            :class="selectedDate === format(day, 'yyyy-MM-dd') ? 'bg-warning-soft/55 ring-2 ring-inset ring-primary' : ''"
            :aria-label="`${formatFullDate(format(day, 'yyyy-MM-dd'))} มี ${eventsForDate(day).length} กิจกรรม`"
            :aria-pressed="selectedDate === format(day, 'yyyy-MM-dd')"
            @click="selectDay(day)"
          >
            <span
              class="grid size-7 place-items-center rounded-full text-sm font-semibold"
              :class="[
                isSameMonth(day, viewMonth) ? 'text-ink' : 'text-muted/45',
                today === format(day, 'yyyy-MM-dd') && 'bg-ink text-white',
              ]"
            >{{ format(day, 'd') }}</span>
            <span class="mt-1 block space-y-1">
              <span
                v-for="event in eventsForDate(day).slice(0, 2)"
                :key="event.id"
                class="flex min-w-0 items-center gap-1.5 rounded px-1.5 py-1 text-xs text-ink"
                :class="eventToneClass(event.type)"
              >
                <span class="size-1.5 shrink-0 rounded-full" :class="calendarEventTypeMeta[event.type].dotClass" aria-hidden="true" />
                <span class="truncate">{{ event.title }}</span>
              </span>
              <span v-if="eventsForDate(day).length > 2" class="block px-1.5 text-xs font-medium text-muted">
                อีก {{ eventsForDate(day).length - 2 }} รายการ
              </span>
            </span>
          </button>
        </div>
      </UiCard>

      <aside class="xl:sticky xl:top-24 xl:self-start">
        <UiCard>
          <div class="flex items-start justify-between gap-3 border-b border-divider pb-4">
            <div class="min-w-0">
              <p class="text-xs font-medium text-muted">วันที่เลือก</p>
              <h3 class="mt-1 text-base font-bold leading-6 text-ink">{{ formatFullDate(selectedDate) }}</h3>
              <p class="mt-1 text-sm text-muted">{{ selectedDateEvents.length }} กิจกรรม</p>
            </div>
            <button
              type="button"
              class="grid size-10 shrink-0 place-items-center rounded-control border border-divider text-muted transition-colors hover:bg-surface hover:text-ink"
              aria-label="เพิ่มกิจกรรมในวันที่เลือก"
              title="เพิ่มกิจกรรม"
              @click="openAddDialog(selectedDate)"
            >
              <Plus :size="18" aria-hidden="true" />
            </button>
          </div>

          <div v-if="selectedDateEvents.length" class="mt-4 space-y-3">
            <article v-for="event in selectedDateEvents" :key="event.id" class="rounded-control border border-divider p-3.5">
              <div class="flex flex-wrap items-center gap-2">
                <UiBadge :tone="calendarEventTypeMeta[event.type].tone">{{ calendarEventTypeMeta[event.type].label }}</UiBadge>
                <span v-if="event.source === 'system'" class="text-xs text-muted">จากระบบ</span>
              </div>
              <h4 class="mt-2 font-semibold leading-6 text-ink">{{ event.title }}</h4>
              <p v-if="event.description" class="mt-1 text-sm leading-6 text-muted">{{ event.description }}</p>
              <NuxtLink
                v-if="event.href"
                :to="event.href"
                class="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-info hover:underline"
              >
                เปิดรายการ
                <ArrowRight :size="16" aria-hidden="true" />
              </NuxtLink>
            </article>
          </div>
          <div v-else class="flex min-h-48 flex-col items-center justify-center text-center">
            <div class="grid size-11 place-items-center rounded-full bg-surface text-muted">
              <CalendarDays :size="20" aria-hidden="true" />
            </div>
            <p class="mt-3 text-sm font-semibold text-ink">ไม่มีกิจกรรมในวันนี้</p>
            <button type="button" class="mt-1 min-h-10 text-sm font-semibold text-info hover:underline" @click="openAddDialog(selectedDate)">
              เพิ่มกิจกรรม
            </button>
          </div>
        </UiCard>
      </aside>
    </div>

    <UiDialog v-model:open="addDialogOpen" title="เพิ่มกิจกรรม" :close-on-confirm="false">
      <form id="calendar-event-form" class="space-y-5" novalidate @submit.prevent="submitEvent">
        <div>
          <UiInput v-model="form.title" label="ชื่อกิจกรรม" placeholder="เช่น ประชุมเตรียมการนิเทศ" :error="fieldErrors.title" required />
        </div>
        <div class="grid gap-5 sm:grid-cols-2">
          <div>
            <UiInput v-model="form.date" type="date" label="วันที่" :error="fieldErrors.date" required />
          </div>
          <div>
            <UiSelect v-model="form.type" :options="addEventTypeOptions" label="ประเภทกิจกรรม" :error="fieldErrors.type" required />
          </div>
        </div>
        <div>
          <UiTextarea v-model="form.description" label="รายละเอียด" placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)" />
        </div>
      </form>
      <template #cancel><UiButton variant="secondary">ยกเลิก</UiButton></template>
      <template #confirm><UiButton type="submit" form="calendar-event-form" :loading="isSubmitting">บันทึก</UiButton></template>
    </UiDialog>
  </div>
</template>
