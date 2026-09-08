<script setup lang="ts">
import { CalendarRange } from "@lucide/vue";
import type { CoopCycle } from "~/composables/useCoopCycles";

const props = defineProps<{ cycle: CoopCycle }>();
const orderedStatuses = [
  "draft",
  "open",
  "closed_to_requests",
  "training",
  "closed",
] as const;
const currentIndex = computed(() => orderedStatuses.indexOf(props.cycle.status));
const formatRange = (start: string, end: string) => {
  const formatter = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${formatter.format(new Date(`${start}T00:00:00+07:00`))} – ${formatter.format(new Date(`${end}T00:00:00+07:00`))}`;
};
</script>

<template>
  <UiCard>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="flex items-start gap-3">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-control bg-warning-soft text-warning"
        >
          <CalendarRange :size="20" aria-hidden="true" />
        </span>
        <div>
          <h3 class="font-semibold text-ink">บริบทรอบสหกิจศึกษา</h3>
          <p class="mt-1 text-sm text-muted">{{ cycle.label }} · {{ cycle.cohort }}</p>
        </div>
      </div>
      <UiBadge :tone="cycleStatusMeta[cycle.status].tone">
        {{ cycleStatusMeta[cycle.status].label }}
      </UiBadge>
    </div>

    <dl class="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
      <div>
        <dt class="text-xs text-muted">ปีการศึกษา</dt>
        <dd class="mt-1 font-semibold text-ink">{{ cycle.academicYear }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted">ภาคเรียน / รุ่น</dt>
        <dd class="mt-1 text-ink">{{ cycle.semester }} · {{ cycle.cohort }}</dd>
      </div>
      <div>
        <dt class="text-xs text-muted">ช่วงเปิดยื่นสถานประกอบการ</dt>
        <dd class="mt-1 text-ink">
          {{ formatRange(cycle.requestStart, cycle.requestEnd) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs text-muted">ช่วงฝึกงาน</dt>
        <dd class="mt-1 text-ink">
          {{ formatRange(cycle.trainingStart, cycle.trainingEnd) }}
        </dd>
      </div>
    </dl>

    <div class="mt-5 overflow-x-auto pb-1">
      <ol
        class="grid min-w-[42rem] grid-cols-5"
        aria-label="ลำดับสถานะรอบสหกิจศึกษา"
      >
      <li
        v-for="(status, index) in orderedStatuses"
        :key="status"
        class="relative flex flex-col items-center text-center"
        :aria-current="index === currentIndex ? 'step' : undefined"
      >
        <span
          v-if="index < orderedStatuses.length - 1"
          class="absolute top-2 left-1/2 h-0.5 w-full"
          :class="index < currentIndex ? 'bg-primary' : 'bg-divider'"
          aria-hidden="true"
        />
        <span
          class="relative z-10 size-4 rounded-full border-2 bg-canvas"
          :class="
            index === currentIndex
              ? 'border-primary bg-primary'
              : index < currentIndex
                ? 'border-primary bg-primary'
                : 'border-divider'
          "
          aria-hidden="true"
        />
        <span
          class="mt-2 text-xs font-medium"
          :class="index <= currentIndex ? 'text-ink' : 'text-muted'"
        >
          {{ cycleStatusMeta[status].label }}
        </span>
      </li>
      </ol>
    </div>
  </UiCard>
</template>
