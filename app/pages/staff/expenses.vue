<script setup lang="ts">
import { BedDouble, Calculator, Fuel, History, ReceiptText, RotateCcw, Save, WalletCards } from '@lucide/vue'

definePageMeta({ title: 'คำนวณค่าใช้จ่าย', middleware: 'staff-prototype' })
useHead({ title: 'คำนวณค่าใช้จ่าย' })

const {
  amounts,
  errors,
  calculatedExpense,
  displayedAmounts,
  displayedTotal,
  hasInput,
  clearFieldError,
  calculateExpenses,
  invalidateCalculation,
  resetExpenses,
} = useExpenseCalculator()
const { cycleId, cycleOptions, round, roundModel, roundOptions, selectedCycleLabel } = useSupervisionContext()
const { cycleCatalog } = useCoopCycles()
const { records, saveExpense } = useExpenseRecords()
const { currentAccount } = useAuthPrototype()
const { scenario } = useScenario()
const { showToast } = useToast()

const expenseItems = [
  { key: 'fuel' as const, label: 'ค่าน้ำมัน', icon: Fuel },
  { key: 'accommodation' as const, label: 'ค่าที่พัก', icon: BedDouble },
  { key: 'allowance' as const, label: 'เบี้ยเลี้ยง', icon: WalletCards },
]

const formatCurrency = (value: number) => new Intl.NumberFormat('th-TH', {
  style: 'currency', currency: 'THB', minimumFractionDigits: 2,
}).format(value)
const formatDateTime = (value: string) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok',
}).format(new Date(value))
const cycleLabelFor = (savedCycleId: string) => cycleCatalog.find(cycle => cycle.id === savedCycleId)?.label ?? savedCycleId
const effectiveHistoryState = computed(() => scenario.value.forceError ? 'error' : scenario.value.viewState)

const calculate = () => {
  const result = calculateExpenses({ cycleId: cycleId.value, round: round.value })
  if (result === null) return
  showToast({ title: 'คำนวณค่าใช้จ่ายแล้ว', description: `ยอดรวม ${formatCurrency(result.total)}` })
}

const save = () => {
  const calculation = calculateExpenses({ cycleId: cycleId.value, round: round.value })
  if (calculation === null) return
  const record = saveExpense(calculation, currentAccount.value?.name ?? 'เจ้าหน้าที่')
  resetExpenses()
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
  showToast({ title: 'บันทึกค่าใช้จ่ายแล้ว', description: `${selectedCycleLabel.value} · นิเทศครั้งที่ ${record.reference.round} · ${formatCurrency(record.total)}` })
}

const reset = () => {
  resetExpenses()
  showToast({ title: 'ล้างข้อมูลแล้ว', description: 'ช่องกรอกค่าใช้จ่ายกลับเป็นค่าเริ่มต้น' })
}
const retryHistory = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
}

watch([cycleId, roundModel], invalidateCalculation)
</script>

<template>
  <div>
    <header class="mb-6">
      <p class="text-sm font-semibold text-primary">เครื่องมือสำหรับเจ้าหน้าที่</p>
      <h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">คำนวณค่าใช้จ่าย</h2>
    </header>

    <div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <UiCard :padded="false">
        <div class="flex flex-col gap-4 border-b border-divider p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="flex items-center gap-3">
            <span class="grid size-11 shrink-0 place-items-center rounded-control bg-warning-soft text-warning"><ReceiptText :size="21" aria-hidden="true" /></span>
            <h3 class="font-bold text-ink">รายการค่าใช้จ่าย</h3>
          </div>
          <div class="grid gap-3 sm:grid-cols-2 lg:w-[29rem]" role="group" aria-label="ตัวกรองการนิเทศ">
            <UiSelect v-model="cycleId" :options="cycleOptions" label="ปีการศึกษา / ภาคเรียน" />
            <UiSelect v-model="roundModel" :options="roundOptions" label="ครั้งที่นิเทศ" />
          </div>
        </div>

        <form class="p-5 sm:p-6" novalidate @submit.prevent="calculate">
          <div class="grid gap-5 lg:grid-cols-3">
            <div v-for="item in expenseItems" :key="item.key" class="rounded-panel border border-divider p-4">
              <div class="mb-4 flex items-center gap-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-control bg-surface text-muted"><component :is="item.icon" :size="19" aria-hidden="true" /></span>
                <p class="min-w-0 font-semibold text-ink">{{ item.label }}</p>
              </div>
              <UiInput v-model="amounts[item.key]" type="number" :label="`${item.label} (บาท)`" placeholder="0.00" :error="errors[item.key]" input-class="text-right tabular-nums" @update:model-value="clearFieldError(item.key)" />
            </div>
          </div>

          <div class="mt-6 flex flex-col-reverse gap-2 border-t border-divider pt-5 sm:flex-row sm:items-center sm:justify-between">
            <UiDialog title="ยืนยันการล้างข้อมูล" description="จำนวนเงินที่กรอกไว้ทั้งหมดจะถูกล้างและไม่สามารถกู้คืนได้">
              <template #trigger><UiButton type="button" variant="ghost" :icon="RotateCcw" :disabled="!hasInput">ล้างข้อมูล</UiButton></template>
              <template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template>
              <template #confirm><UiButton variant="danger" @click="reset">ยืนยันล้างข้อมูล</UiButton></template>
            </UiDialog>
            <div class="flex flex-col gap-2 sm:flex-row">
              <UiButton type="submit" variant="secondary" :icon="Calculator">คำนวณค่าใช้จ่าย</UiButton>
              <UiButton type="button" :icon="Save" :disabled="!hasInput" @click="save">บันทึกค่าใช้จ่าย</UiButton>
            </div>
          </div>
        </form>
      </UiCard>

      <UiCard class="xl:sticky xl:top-24" aria-live="polite">
        <div class="flex items-center gap-3">
          <span class="grid size-11 shrink-0 place-items-center rounded-control bg-primary text-ink"><Calculator :size="21" aria-hidden="true" /></span>
          <div><h3 class="font-bold text-ink">สรุปค่าใช้จ่าย</h3><p class="mt-0.5 text-xs text-muted">ยอดประมาณการจากข้อมูลที่กรอก</p></div>
        </div>
        <dl class="mt-5 space-y-3 text-sm">
          <div v-for="item in expenseItems" :key="item.key" class="flex items-center justify-between gap-4"><dt class="text-muted">{{ item.label }}</dt><dd class="font-medium text-ink tabular-nums">{{ formatCurrency(displayedAmounts[item.key]) }}</dd></div>
        </dl>
        <div class="mt-5 border-t-2 border-ink pt-4"><div class="flex items-end justify-between gap-4"><p class="font-semibold text-ink">รวมทั้งสิ้น</p><p class="text-2xl font-bold text-ink tabular-nums">{{ formatCurrency(displayedTotal) }}</p></div></div>
        <div class="mt-5 rounded-control bg-info-soft p-3 text-xs leading-5 text-info">{{ calculatedExpense ? 'คำนวณยอดล่าสุดแล้ว' : 'ยอดจะเปลี่ยนตามจำนวนเงินที่เจ้าหน้าที่กรอก' }} และยังไม่ถูกบันทึกลงระบบ</div>
      </UiCard>
    </div>

    <UiCard class="mt-5" :padded="false">
      <div class="flex items-start justify-between gap-4 border-b border-divider p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <span class="grid size-11 shrink-0 place-items-center rounded-control bg-success-soft text-success"><History :size="21" aria-hidden="true" /></span>
          <div><h3 class="font-bold text-ink">ประวัติค่าใช้จ่าย</h3><p class="mt-1 text-sm leading-6 text-muted">รายการที่บันทึกใน session ปัจจุบัน ข้อมูลจะรีเซ็ตเมื่อรีเฟรชแอป</p></div>
        </div>
        <UiBadge v-if="effectiveHistoryState === 'data'" tone="info">{{ records.length }} รายการ</UiBadge>
      </div>

      <div v-if="effectiveHistoryState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดประวัติค่าใช้จ่าย"><UiSkeleton v-for="row in 4" :key="row" class="h-14" /></div>
      <div v-else-if="effectiveHistoryState === 'error'" class="p-5 sm:p-6"><AppErrorState title="โหลดประวัติค่าใช้จ่ายไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง" @retry="retryHistory" /></div>
      <div v-else-if="effectiveHistoryState === 'empty' || !records.length" class="p-5 sm:p-6"><AppEmptyState title="ยังไม่มีรายการค่าใช้จ่าย" description="กรอกจำนวนเงิน เลือกรอบการนิเทศ แล้วกดบันทึกค่าใช้จ่าย รายการจะแสดงในตารางนี้" /></div>

      <template v-else>
        <div class="hidden overflow-x-auto md:block">
          <table class="w-full min-w-[1080px] border-collapse text-left text-sm">
            <caption class="sr-only">ประวัติรายการค่าใช้จ่ายจากการนิเทศ</caption>
            <thead class="bg-surface text-xs font-semibold tracking-wide text-muted"><tr><th scope="col" class="px-6 py-3">รอบการนิเทศ</th><th scope="col" class="px-4 py-3 text-right">ค่าน้ำมัน</th><th scope="col" class="px-4 py-3 text-right">ค่าที่พัก</th><th scope="col" class="px-4 py-3 text-right">เบี้ยเลี้ยง</th><th scope="col" class="px-4 py-3 text-right">รวม</th><th scope="col" class="px-4 py-3">บันทึกเมื่อ</th><th scope="col" class="px-4 py-3">ผู้บันทึก</th></tr></thead>
            <tbody class="divide-y divide-divider">
              <tr v-for="record in records" :key="record.id" class="hover:bg-surface/70">
                <td class="px-6 py-4"><p class="font-semibold text-ink">{{ cycleLabelFor(record.reference.cycleId) }}</p><p class="mt-1 text-xs text-muted">นิเทศครั้งที่ {{ record.reference.round }}</p></td>
                <td class="whitespace-nowrap px-4 py-4 text-right tabular-nums">{{ formatCurrency(record.amounts.fuel) }}</td><td class="whitespace-nowrap px-4 py-4 text-right tabular-nums">{{ formatCurrency(record.amounts.accommodation) }}</td><td class="whitespace-nowrap px-4 py-4 text-right tabular-nums">{{ formatCurrency(record.amounts.allowance) }}</td><td class="whitespace-nowrap px-4 py-4 text-right font-bold tabular-nums">{{ formatCurrency(record.total) }}</td><td class="whitespace-nowrap px-4 py-4 text-muted">{{ formatDateTime(record.createdAt) }} น.</td><td class="px-4 py-4">{{ record.createdBy }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mobile-card-list md:hidden">
          <article v-for="record in records" :key="record.id" class="p-5">
            <div class="flex items-start justify-between gap-3"><div><h4 class="font-semibold text-ink">{{ cycleLabelFor(record.reference.cycleId) }}</h4><p class="mt-1 text-xs text-muted">นิเทศครั้งที่ {{ record.reference.round }}</p></div><p class="whitespace-nowrap font-bold tabular-nums">{{ formatCurrency(record.total) }}</p></div>
            <dl class="mt-4 grid grid-cols-3 gap-3 border-t border-divider pt-3 text-sm"><div><dt class="text-xs text-muted">ค่าน้ำมัน</dt><dd class="mt-1 tabular-nums">{{ formatCurrency(record.amounts.fuel) }}</dd></div><div><dt class="text-xs text-muted">ค่าที่พัก</dt><dd class="mt-1 tabular-nums">{{ formatCurrency(record.amounts.accommodation) }}</dd></div><div><dt class="text-xs text-muted">เบี้ยเลี้ยง</dt><dd class="mt-1 tabular-nums">{{ formatCurrency(record.amounts.allowance) }}</dd></div></dl>
            <p class="mt-4 border-t border-divider pt-3 text-xs text-muted">{{ formatDateTime(record.createdAt) }} น. · {{ record.createdBy }}</p>
          </article>
        </div>
      </template>
    </UiCard>
  </div>
</template>
