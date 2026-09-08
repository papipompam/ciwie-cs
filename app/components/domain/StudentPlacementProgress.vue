<script setup lang="ts">
import { Check, FileCheck2 } from '@lucide/vue'
import type { CoopCycle } from '~/composables/useCoopCycles'
import type { PlacementStatus } from '~/composables/useStudentPlacements'

const props = defineProps<{
  cycle: CoopCycle
  status?: PlacementStatus
  requestId?: string
  companyName?: string
}>()

const steps = [
  'ยื่นคำร้องขอเอกสาร',
  'รอรับเอกสาร',
  'ยื่นหนังสือให้สถานประกอบการ',
  'รอหนังสือตอบรับ',
  'ส่งหนังสือตอบรับให้เจ้าหน้าที่',
  'ยืนยันสถานที่ฝึกงานแล้ว',
] as const

const statusStep: Record<PlacementStatus, number> = {
  draft: 0,
  submitted: 1,
  returned: 1,
  batched: 1,
  'letter-issued': 2,
  'response-uploaded': 4,
  'response-returned': 4,
  confirmed: 5,
  cancelled: 0,
}
const currentStep = computed(() => props.status ? statusStep[props.status] : 0)
const currentLabel = computed(() => steps[currentStep.value])
const semesterLabel = computed(() => props.cycle.semester.replace('ภาคเรียนที่ ', 'ภาคเรียน '))
const formatRange = (start: string, end: string) => {
  const formatter = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${formatter.format(new Date(`${start}T00:00:00+07:00`))} – ${formatter.format(new Date(`${end}T00:00:00+07:00`))}`
}
</script>

<template>
  <UiCard>
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex items-start gap-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-control bg-warning-soft text-warning">
          <FileCheck2 :size="20" aria-hidden="true" />
        </span>
        <div>
          <h3 class="font-semibold text-ink">สถานะการดำเนินการ</h3>
          <p class="mt-1 text-sm text-muted">
            <template v-if="requestId">{{ requestId }}<template v-if="companyName"> · {{ companyName }}</template></template>
            <template v-else>ยังไม่มีคำร้องในรอบนี้</template>
          </p>
        </div>
      </div>
      <UiBadge :tone="status === 'confirmed' ? 'success' : 'info'">{{ currentLabel }}</UiBadge>
    </div>

    <dl class="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
      <div>
        <dt class="text-xs text-muted">ปีการศึกษา</dt>
        <dd class="mt-1 font-semibold text-ink">{{ cycle.academicYear }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted">ภาคเรียน / รุ่น</dt>
        <dd class="mt-1 text-ink">{{ semesterLabel }} · {{ cycle.cohort }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted">ช่วงเปิดยื่นสถานประกอบการ</dt>
        <dd class="mt-1 text-ink">{{ formatRange(cycle.requestStart, cycle.requestEnd) }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted">ช่วงฝึกงาน</dt>
        <dd class="mt-1 text-ink">{{ formatRange(cycle.trainingStart, cycle.trainingEnd) }}</dd>
      </div>
    </dl>

    <div class="mt-6 overflow-x-auto pb-1">
      <ol class="grid min-w-[52rem] grid-cols-6" aria-label="ลำดับสถานะการดำเนินการ">
        <li
          v-for="(step, index) in steps"
          :key="step"
          class="relative flex flex-col items-center px-2 text-center"
          :aria-current="index === currentStep ? 'step' : undefined"
        >
          <span
            v-if="index < steps.length - 1"
            class="absolute top-3 left-1/2 h-0.5 w-full"
            :class="index < currentStep ? 'bg-primary' : 'bg-divider'"
            aria-hidden="true"
          />
          <span
            class="relative z-10 grid size-6 place-items-center rounded-full border-2 bg-canvas"
            :class="index <= currentStep ? 'border-primary bg-primary text-white' : 'border-divider text-transparent'"
            aria-hidden="true"
          >
            <Check v-if="index < currentStep" :size="14" :stroke-width="3" />
            <span v-else-if="index === currentStep" class="size-2 rounded-full bg-white" />
          </span>
          <span class="mt-3 text-xs font-medium leading-5" :class="index <= currentStep ? 'text-ink' : 'text-muted'">{{ step }}</span>
        </li>
      </ol>
    </div>
  </UiCard>
</template>
