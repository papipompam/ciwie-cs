<script setup lang="ts">
import { ArrowLeft, CalendarRange } from '@lucide/vue'

const route = useRoute()
const {
  cycleId,
  roundModel,
  cycleOptions,
  roundOptions,
  selectedCycleLabel,
} = useSupervisionContext()
const {
  studentCohort,
  studentCohortOptions,
  studentSection,
  studentSectionOptions,
  studentSemester,
  studentSemesterOptions,
  ensureAvailableStudentFilters,
  selectedStudentCohortLabel,
  selectedStudentSectionLabel,
  selectedStudentSemesterLabel,
} = useStudentCohortContext()
const showsSupervisionRound = computed(() => route.path.startsWith('/lecturer/supervision')
  || route.path.startsWith('/lecturer/evaluations')
  || route.path.startsWith('/staff/supervision'))
const showsLecturerSupervisionBack = computed(() => /^\/lecturer\/supervision\/[^/]+$/.test(route.path))
const showsStudentCohort = computed(() => route.path.startsWith('/lecturer/students')
  || route.path.startsWith('/lecturer/applications')
  || route.path.startsWith('/staff/applications'))
const toolbarGridClass = computed(() => showsStudentCohort.value
    ? 'sm:grid-cols-[11rem_9rem_12rem]'
  : showsSupervisionRound.value
    ? 'sm:grid-cols-[17rem_12rem]'
  : 'sm:w-[17rem]')
const contextLabel = computed(() => {
  if (route.path.startsWith('/lecturer/placements')) return 'บริบทการตรวจคำร้อง'
  if (route.path.startsWith('/lecturer/students')) return 'บริบทข้อมูลนักศึกษา'
  if (route.path.startsWith('/lecturer/applications')) return 'บริบทการสมัครสหกิจ'
  if (route.path.startsWith('/staff/applications')) return 'บริบทการสมัครสหกิจ'
  if (route.path.startsWith('/lecturer/evaluations')) return 'บริบทการประเมิน'
  if (route.path.startsWith('/lecturer/supervision')) return 'บริบทตารางนิเทศ'
  if (route.path === '/staff/supervision') return 'บริบทตารางนิเทศ'
  return 'บริบทการจัดกลุ่มนิเทศ'
})
watchEffect(() => {
  if (showsStudentCohort.value) ensureAvailableStudentFilters()
})
</script>

<template>
  <aside class="sticky top-16 z-20 border-b border-divider bg-canvas/95 backdrop-blur" :aria-label="contextLabel">
    <div class="mx-auto flex min-h-16 w-full max-w-[1480px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-8">
      <div class="flex min-w-0 items-center gap-3 sm:mr-auto">
        <span class="grid size-9 shrink-0 place-items-center rounded-control bg-warning-soft text-warning">
          <CalendarRange :size="18" aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <p class="text-xs font-medium text-muted">{{ contextLabel }}</p>
          <p class="truncate text-sm font-semibold text-ink">
            <template v-if="showsStudentCohort">{{ selectedStudentCohortLabel }} · {{ selectedStudentSectionLabel }} · {{ selectedStudentSemesterLabel }}</template><template v-else>{{ selectedCycleLabel }}<template v-if="showsSupervisionRound"> · {{ roundOptions.find(option => option.value === roundModel)?.label }}</template></template>
          </p>
        </div>
      </div>

      <NuxtLink
        v-if="showsLecturerSupervisionBack"
        to="/lecturer/supervision"
        class="inline-flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-control border border-divider bg-canvas px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <ArrowLeft :size="17" aria-hidden="true" />
        กลับไปตารางนิเทศ
      </NuxtLink>

      <div class="grid w-full grid-cols-1 gap-2 sm:w-auto" :class="toolbarGridClass">
        <UiSelect
          v-if="showsStudentCohort"
          v-model="studentCohort"
          :options="studentCohortOptions"
          :placeholder="selectedStudentCohortLabel"
          label="รุ่นนักศึกษา"
          :label-visible="false"
        />
        <UiSelect
          v-if="showsStudentCohort"
          v-model="studentSection"
          :options="studentSectionOptions"
          :placeholder="selectedStudentSectionLabel"
          label="หมู่เรียน"
          :label-visible="false"
        />
        <UiSelect
          v-if="showsStudentCohort"
          v-model="studentSemester"
          :options="studentSemesterOptions"
          :placeholder="selectedStudentSemesterLabel"
          label="ภาคเรียน"
          :label-visible="false"
        />
        <UiSelect
          v-if="!showsStudentCohort"
          v-model="cycleId"
          :options="cycleOptions"
          :placeholder="selectedCycleLabel"
          label="รอบสหกิจศึกษา"
          :label-visible="false"
        />
        <UiSelect
          v-if="showsSupervisionRound"
          v-model="roundModel"
          :options="roundOptions"
          :placeholder="roundOptions.find(option => option.value === roundModel)?.label"
          label="ครั้งที่นิเทศ"
          :label-visible="false"
        />
      </div>
    </div>
  </aside>
</template>
