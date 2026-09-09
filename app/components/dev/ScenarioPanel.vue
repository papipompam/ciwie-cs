<script setup lang="ts">
import { RotateCcw, SlidersHorizontal, X } from '@lucide/vue'
import { PopoverClose, PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

const { scenario, events, resetScenario } = useScenario()
const { cycles } = useCoopCycles()
const { resetPlacementData } = useStudentPlacements()
const { switchPrototypeRole } = useAuthPrototype()
const roleOptions = [
  { value: 'staff', label: 'เจ้าหน้าที่' },
  { value: 'lecturer', label: 'อาจารย์' },
  { value: 'student', label: 'นักศึกษา' },
]
const cycleOptions = cycles.map(cycle => ({ value: cycle.label, label: cycle.label }))
const selectedCycle = computed({
  get: () => cycleOptions.some(option => option.value === scenario.value.cycle) ? scenario.value.cycle : cycleOptions[0]!.value,
  set: (value: string) => { scenario.value.cycle = value },
})
const dataSetOptions = [
  { value: 'normal', label: 'ข้อมูลปกติ' },
  { value: 'long', label: 'ข้อความยาว' },
  { value: 'edge', label: 'ข้อมูลขอบเขต' },
]
const delayOptions = [
  { value: 'none', label: 'ไม่หน่วงเวลา' },
  { value: 'slow', label: 'เครือข่ายช้า (1.5 วินาที)' },
]
const viewStateOptions = [
  { value: 'data', label: 'มีข้อมูล' },
  { value: 'loading', label: 'กำลังโหลด' },
  { value: 'empty', label: 'ไม่มีข้อมูล' },
  { value: 'error', label: 'ผิดพลาด' },
]

const selectedRole = computed({
  get: () => scenario.value.role,
  set: (value: string) => {
    if (value === 'staff' || value === 'lecturer' || value === 'student') void switchPrototypeRole(value)
  },
})
const selectedDataSet = computed({
  get: () => scenario.value.dataSet,
  set: (value: string) => {
    if (value === 'normal' || value === 'long' || value === 'edge') scenario.value.dataSet = value
  },
})
const selectedDelay = computed({
  get: () => scenario.value.networkDelay,
  set: (value: string) => {
    if (value === 'none' || value === 'slow') scenario.value.networkDelay = value
  },
})
const selectedViewState = computed({
  get: () => scenario.value.viewState,
  set: (value: string) => {
    if (value === 'data' || value === 'loading' || value === 'empty' || value === 'error') scenario.value.viewState = value
  },
})

const resetAllMockData = () => {
  resetScenario()
  resetPlacementData()
  void switchPrototypeRole('staff')
}
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger class="fixed right-4 bottom-4 z-40 flex min-h-12 items-center gap-2 rounded-full bg-sidebar px-5 text-sm font-semibold text-white shadow-xl hover:bg-black">
      <SlidersHorizontal :size="17" aria-hidden="true" />
      <span class="hidden sm:inline">จำลองสถานการณ์</span>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent :side-offset="10" align="end" class="z-[70] w-[calc(100vw-2rem)] max-w-sm rounded-panel border border-divider bg-canvas p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-bold text-ink">Developer Scenario</p>
            <p class="mt-0.5 text-xs text-muted">ข้อมูลจำลองจะรีเซ็ตเมื่อโหลดหน้าใหม่</p>
          </div>
          <PopoverClose class="grid size-11 place-items-center rounded-md text-muted hover:bg-surface" aria-label="ปิดแผงจำลองสถานการณ์">
            <X :size="17" aria-hidden="true" />
          </PopoverClose>
        </div>

        <div class="mt-5 space-y-4">
          <UiSelect v-model="selectedRole" :options="roleOptions" label="บทบาท" />
          <div><UiInput v-model="scenario.userName" label="ผู้ใช้งาน" /></div>
          <UiSelect v-model="selectedCycle" :options="cycleOptions" label="รอบสหกิจศึกษา" />
          <UiSelect v-model="selectedDataSet" :options="dataSetOptions" label="ชุดข้อมูล" />
          <UiSelect v-model="selectedDelay" :options="delayOptions" label="ความเร็วเครือข่ายจำลอง" />
          <UiRadioGroup v-model="selectedViewState" label="สถานะข้อมูล" :options="viewStateOptions" />
          <div class="flex items-center gap-2 text-sm font-medium text-ink">
            <UiCheckbox v-model="scenario.forceError" label="บังคับให้เกิดข้อผิดพลาด" />
            บังคับให้เกิดข้อผิดพลาด
          </div>
          <div>
            <p class="text-sm font-semibold text-ink">เหตุการณ์จำลองล่าสุด</p>
            <div v-if="events.length" class="mt-2 max-h-32 space-y-2 overflow-y-auto rounded-control bg-surface p-3">
              <div v-for="event in events" :key="event.id" class="text-xs leading-5 text-ink">
                <p>{{ event.title }}</p>
                <time class="text-muted">{{ event.createdAt }} น.</time>
              </div>
            </div>
            <p v-else class="mt-2 rounded-control bg-surface p-3 text-xs text-muted">ยังไม่มีเหตุการณ์จาก Mock action</p>
          </div>
          <UiButton class="w-full" variant="secondary" :icon="RotateCcw" @click="resetAllMockData">คืนค่าเริ่มต้น</UiButton>
        </div>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
