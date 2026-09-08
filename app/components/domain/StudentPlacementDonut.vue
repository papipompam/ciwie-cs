<script setup lang="ts">
import type { StudentPlacementSummary } from '~/utils/studentPlacementSummary'

const props = defineProps<{ summary: StudentPlacementSummary, cycleLabel: string }>()

const radius = 44
const circumference = 2 * Math.PI * radius
const items = computed(() => [
  { key: 'confirmed', label: 'ยืนยันแล้ว', value: props.summary.confirmed, colorClass: 'text-success', dotClass: 'bg-success' },
  { key: 'pending', label: 'รอยืนยัน', value: props.summary.pending, colorClass: 'text-primary', dotClass: 'bg-primary' },
  { key: 'not-started', label: 'ยังไม่ดำเนินการ', value: props.summary.notStarted, colorClass: 'text-divider', dotClass: 'bg-divider' },
])

const percent = (value: number) => props.summary.total
  ? Math.round(value / props.summary.total * 100)
  : 0

const segments = computed(() => {
  let offset = 0
  return items.value.map((item) => {
    const length = props.summary.total ? item.value / props.summary.total * circumference : 0
    const segment = { ...item, length, offset }
    offset += length
    return segment
  })
})

const summaryLabel = computed(() => [
  `${props.cycleLabel} นักศึกษาทั้งหมด ${props.summary.total} คน`,
  ...items.value.map(item => `${item.label} ${item.value} คน`),
].join(' '))
</script>

<template>
  <UiCard aria-labelledby="student-placement-summary-title">
    <div class="flex items-center justify-between gap-4">
      <h3 id="student-placement-summary-title" class="text-lg font-bold text-ink">สถานะการยืนยันสถานประกอบการ</h3>
    </div>

    <template v-if="summary.total">
      <div class="mt-5 grid items-center gap-6 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <div class="relative mx-auto size-44" role="img" :aria-label="summaryLabel">
          <svg class="size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" :r="radius" fill="none" stroke="currentColor" stroke-width="12" class="text-surface" />
            <circle
              v-for="segment in segments"
              :key="segment.key"
              cx="50"
              cy="50"
              :r="radius"
              fill="none"
              stroke="currentColor"
              stroke-width="12"
              :stroke-dasharray="`${segment.length} ${circumference - segment.length}`"
              :stroke-dashoffset="-segment.offset"
              :class="segment.colorClass"
            />
          </svg>
          <div class="absolute inset-0 grid place-content-center text-center">
            <strong class="text-3xl font-bold text-ink">{{ summary.total }}</strong>
            <span class="mt-0.5 text-xs text-muted">นักศึกษา</span>
          </div>
        </div>

        <dl class="divide-y divide-divider">
          <div v-for="item in items" :key="item.key" class="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span class="size-2.5 shrink-0 rounded-full" :class="item.dotClass" aria-hidden="true" />
            <dt class="min-w-0 flex-1 text-sm text-muted">{{ item.label }}</dt>
            <dd class="flex items-baseline gap-2 text-right">
              <strong class="text-lg font-bold text-ink">{{ item.value }}</strong>
              <span class="w-10 text-xs text-muted">{{ percent(item.value) }}%</span>
            </dd>
          </div>
        </dl>
      </div>
    </template>

    <AppEmptyState v-else title="ยังไม่มีนักศึกษาในรอบนี้" />
  </UiCard>
</template>
