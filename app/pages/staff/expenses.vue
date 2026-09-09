<script setup lang="ts">
import { BedDouble, Calculator, Fuel, History, Save, UsersRound, WalletCards } from '@lucide/vue'
import { supervisionLineExpenseInputSchema } from '#shared/expenses'
import type { SupervisionLineExpenseInput } from '#shared/expenses'
import { calculateSupervisionLineExpense } from '#shared/expense-calculation'

definePageMeta({ title: 'ค่าใช้จ่ายสายการนิเทศ', middleware: 'staff-prototype' })
useHead({ title: 'ค่าใช้จ่ายสายการนิเทศ' })

type InputKey = keyof SupervisionLineExpenseInput
const { cycleId, cycleOptions, round, roundModel, roundOptions } = useSupervisionContext()
const { groups, records, loadExpenses, saveExpense } = useSupervisionExpenses()
const { showToast } = useToast()
const selectedGroupId = ref('')
const saving = ref(false)
const form = reactive<Record<InputKey, string>>({ fuel: '', roomRate: '', nights: '1', allowanceRate: '', allowanceDays: '1', roomCapacity: '2' })
const errors = reactive<Partial<Record<InputKey | 'groupId', string>>>({})
const { status, error, refresh } = await useAsyncData(
  () => `staff-expenses-${cycleId.value}-${round.value}`,
  () => loadExpenses(cycleId.value, round.value),
  { watch: [cycleId, roundModel] },
)
const groupOptions = computed(() => groups.value.map(group => ({ value: group.id, label: `${group.name} · ${group.companyCount} สถานประกอบการ` })))
const selectedGroup = computed(() => groups.value.find(group => group.id === selectedGroupId.value) ?? null)
const selectedRecord = computed(() => records.value.find(record => record.groupId === selectedGroupId.value) ?? null)
const missingGender = computed(() => selectedGroup.value?.lecturers.filter(lecturer => lecturer.gender === null) ?? [])
const hasLecturers = computed(() => Boolean(selectedGroup.value?.lecturers.length))
const numericInput = computed<SupervisionLineExpenseInput>(() => ({
  fuel: Number(form.fuel), roomRate: Number(form.roomRate), nights: Number(form.nights),
  allowanceRate: Number(form.allowanceRate), allowanceDays: Number(form.allowanceDays), roomCapacity: Number(form.roomCapacity),
}))
const preview = computed(() => {
  if (!selectedGroup.value || missingGender.value.length) return null
  const parsed = supervisionLineExpenseInputSchema.safeParse(numericInput.value)
  return parsed.success ? calculateSupervisionLineExpense(parsed.data, selectedGroup.value.lecturers) : null
})
const inputFields = [
  { key: 'fuel' as const, label: 'ค่าน้ำมันต่อสาย (บาท)', icon: Fuel, step: '0.01', min: '0' },
  { key: 'roomRate' as const, label: 'ราคาห้องต่อคืน (บาท)', icon: BedDouble, step: '0.01', min: '0' },
  { key: 'nights' as const, label: 'จำนวนคืน', icon: BedDouble, step: '1', min: '0' },
  { key: 'roomCapacity' as const, label: 'จำนวนคนสูงสุดต่อห้อง', icon: UsersRound, step: '1', min: '1' },
  { key: 'allowanceRate' as const, label: 'เบี้ยเลี้ยงต่อคนต่อวัน (บาท)', icon: WalletCards, step: '0.01', min: '0' },
  { key: 'allowanceDays' as const, label: 'จำนวนวันเบี้ยเลี้ยง', icon: WalletCards, step: '1', min: '0' },
]
const money = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 }).format(value)
const dateTime = (value: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value))
const clearErrors = () => Object.assign(errors, {
  groupId: undefined, fuel: undefined, roomRate: undefined, nights: undefined,
  allowanceRate: undefined, allowanceDays: undefined, roomCapacity: undefined,
})

const fillForm = () => {
  const record = selectedRecord.value
  Object.assign(form, record
    ? { fuel: String(record.fuel), roomRate: String(record.roomRate), nights: String(record.nights), allowanceRate: String(record.allowanceRate), allowanceDays: String(record.allowanceDays), roomCapacity: String(record.roomCapacity) }
    : { fuel: '', roomRate: '', nights: '1', allowanceRate: '', allowanceDays: '1', roomCapacity: '2' })
  clearErrors()
}
watch(groups, (items) => {
  if (!items.some(group => group.id === selectedGroupId.value)) selectedGroupId.value = items[0]?.id ?? ''
}, { immediate: true })
watch(selectedGroupId, fillForm)

const submit = async () => {
  clearErrors()
  if (!selectedGroup.value) { errors.groupId = 'กรุณาเลือกสายการนิเทศ'; return }
  if (!hasLecturers.value) {
    showToast({ title: 'ยังบันทึกไม่ได้', description: 'กรุณาเพิ่มอาจารย์เข้าสายการนิเทศก่อน' })
    return
  }
  if (missingGender.value.length) {
    showToast({ title: 'ยังบันทึกไม่ได้', description: 'กรุณาระบุเพศของอาจารย์ในสายให้ครบก่อนคำนวณค่าที่พัก' })
    return
  }
  const parsed = supervisionLineExpenseInputSchema.safeParse(numericInput.value)
  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => { errors[issue.path[0] as InputKey] ??= issue.message })
    return
  }
  saving.value = true
  try {
    const saved = await saveExpense(selectedGroup.value.id, parsed.data)
    showToast({ title: 'บันทึกค่าใช้จ่ายแล้ว', description: `${saved.groupName} · ${money(saved.total)}` })
  }
  catch (cause) { showToast({ title: 'บันทึกไม่สำเร็จ', description: cause instanceof Error ? cause.message : 'กรุณาลองใหม่' }) }
  finally { saving.value = false }
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-semibold text-primary">เครื่องมือสำหรับเจ้าหน้าที่</p>
      <h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">ค่าใช้จ่ายสายการนิเทศ</h2>
      <p class="mt-2 text-sm leading-6 text-muted">เลือกสายที่ระบบจัดกลุ่มจากที่อยู่และพิกัด แล้วกรอกอัตราค่าใช้จ่าย ระบบจะแยกห้องพักอาจารย์ชายและหญิงอัตโนมัติ</p>
    </header>

    <div v-if="status === 'pending'" class="space-y-4"><UiSkeleton v-for="row in 4" :key="row" class="h-20" /></div>
    <AppErrorState v-else-if="error" title="โหลดข้อมูลสายการนิเทศไม่สำเร็จ" description="กรุณาลองโหลดข้อมูลอีกครั้ง" @retry="refresh" />
    <AppEmptyState v-else-if="!groups.length" title="ยังไม่มีสายการนิเทศ" description="ต้องจัดกลุ่มสถานประกอบการและเพิ่มอาจารย์เข้าสายก่อน จึงจะคำนวณค่าใช้จ่ายได้">
      <NuxtLink to="/staff/supervision/groups" class="inline-flex min-h-11 items-center rounded-control border border-divider px-4 font-semibold text-ink">ไปหน้าจัดกลุ่มนิเทศ</NuxtLink>
    </AppEmptyState>

    <template v-else>
      <UiCard><div class="grid gap-4 md:grid-cols-3"><UiSelect v-model="cycleId" :options="cycleOptions" label="ปีการศึกษา / ภาคเรียน" /><UiSelect v-model="roundModel" :options="roundOptions" label="ครั้งที่นิเทศ" /><UiSelect v-model="selectedGroupId" :options="groupOptions" label="สายการนิเทศที่จัดโดย AI" :error="errors.groupId" /></div></UiCard>

      <div v-if="selectedGroup" class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div class="space-y-6">
          <UiCard>
            <div class="flex flex-wrap items-start justify-between gap-3"><div><h3 class="text-lg font-bold text-ink">{{ selectedGroup.name }}</h3><p class="mt-1 text-sm text-muted">{{ selectedGroup.companyCount }} สถานประกอบการ · {{ selectedGroup.lecturers.length }} อาจารย์</p></div><UiBadge tone="info">นิเทศครั้งที่ {{ selectedGroup.round }}</UiBadge></div>
            <div class="mt-5 grid gap-3 sm:grid-cols-2"><div v-for="lecturer in selectedGroup.lecturers" :key="lecturer.id" class="flex items-center justify-between gap-3 rounded-control border border-divider p-3"><span class="min-w-0 truncate text-sm font-semibold text-ink">{{ lecturer.name }}</span><UiBadge :tone="lecturer.gender ? 'neutral' : 'danger'">{{ lecturer.gender === 'male' ? 'ชาย' : lecturer.gender === 'female' ? 'หญิง' : 'ยังไม่ระบุเพศ' }}</UiBadge></div></div>
            <UiAlert v-if="!hasLecturers" class="mt-4" tone="warning" title="ยังไม่มีอาจารย์ในสาย">กรุณากลับไปเพิ่มอาจารย์ในกลุ่มนิเทศก่อนคำนวณค่าใช้จ่าย</UiAlert>
            <UiAlert v-else-if="missingGender.length" class="mt-4" tone="danger" title="ข้อมูลเพศอาจารย์ไม่ครบ">กรุณาแก้ข้อมูลอาจารย์ {{ missingGender.map(item => item.name).join(', ') }} ก่อนบันทึก ระบบจะไม่เดาเพศจากคำนำหน้า</UiAlert>
          </UiCard>

          <UiCard>
            <form novalidate @submit.prevent="submit">
              <h3 class="text-lg font-bold text-ink">อัตราและจำนวนวัน</h3>
              <div class="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><div v-for="field in inputFields" :key="field.key" class="rounded-panel border border-divider p-4"><div class="mb-3 flex items-center gap-2"><component :is="field.icon" :size="18" class="text-muted" aria-hidden="true" /><span class="text-sm font-semibold text-ink">{{ field.label }}</span></div><UiInput v-model="form[field.key]" type="number" :label="field.label" :label-visible="false" :min="field.min" :step="field.step" :error="errors[field.key]" input-class="text-right tabular-nums" /></div></div>
              <div class="mt-6 flex justify-end border-t border-divider pt-5"><UiButton type="submit" :icon="Save" :loading="saving" :disabled="!hasLecturers || missingGender.length > 0">{{ selectedRecord ? 'อัปเดตค่าใช้จ่าย' : 'บันทึกค่าใช้จ่าย' }}</UiButton></div>
            </form>
          </UiCard>
        </div>

        <UiCard class="xl:sticky xl:top-24" aria-live="polite">
          <div class="flex items-center gap-3"><span class="grid size-11 place-items-center rounded-control bg-primary text-ink"><Calculator :size="21" /></span><div><h3 class="font-bold text-ink">สรุปค่าใช้จ่าย</h3><p class="text-xs text-muted">คำนวณจากอาจารย์ในสาย</p></div></div>
          <dl v-if="preview" class="mt-5 space-y-3 text-sm"><div class="flex justify-between gap-4"><dt class="text-muted">ห้องอาจารย์ชาย</dt><dd class="font-semibold">{{ preview.maleRoomCount }} ห้อง / {{ preview.maleLecturerCount }} คน</dd></div><div class="flex justify-between gap-4"><dt class="text-muted">ห้องอาจารย์หญิง</dt><dd class="font-semibold">{{ preview.femaleRoomCount }} ห้อง / {{ preview.femaleLecturerCount }} คน</dd></div><div class="flex justify-between gap-4"><dt class="text-muted">ค่าน้ำมัน</dt><dd>{{ money(preview.amounts.fuel) }}</dd></div><div class="flex justify-between gap-4"><dt class="text-muted">ค่าที่พัก</dt><dd>{{ money(preview.amounts.accommodation) }}</dd></div><div class="flex justify-between gap-4"><dt class="text-muted">เบี้ยเลี้ยง</dt><dd>{{ money(preview.amounts.allowance) }}</dd></div><div class="flex items-end justify-between gap-4 border-t-2 border-ink pt-4"><dt class="font-semibold">รวมทั้งสิ้น</dt><dd class="text-2xl font-bold tabular-nums">{{ money(preview.total) }}</dd></div></dl>
          <p v-else class="mt-5 rounded-control bg-info-soft p-3 text-sm leading-6 text-info">กรอกข้อมูลให้ครบเพื่อดูยอดประมาณการ</p>
          <p class="mt-4 text-xs leading-5 text-muted">จำนวนห้อง = ห้องชาย + ห้องหญิง โดยไม่มีการรวมอาจารย์ต่างเพศไว้ห้องเดียวกัน</p>
        </UiCard>
      </div>

      <UiCard :padded="false">
        <div class="flex items-center justify-between gap-4 border-b border-divider p-5 sm:p-6"><div class="flex items-center gap-3"><History :size="20" class="text-muted" /><div><h3 class="font-bold text-ink">ประวัติค่าใช้จ่าย</h3><p class="mt-1 text-sm text-muted">หนึ่งรายการล่าสุดต่อสายการนิเทศ</p></div></div><UiBadge tone="info">{{ records.length }} รายการ</UiBadge></div>
        <AppEmptyState v-if="!records.length" class="m-6" title="ยังไม่มีรายการค่าใช้จ่าย" description="เลือกสายและบันทึกข้อมูล ค่าใช้จ่ายจะเก็บในฐานข้อมูล" />
        <div v-else class="hidden overflow-x-auto md:block"><table class="w-full min-w-[900px] text-left text-sm"><caption class="sr-only">ประวัติค่าใช้จ่ายแยกตามสายการนิเทศ</caption><thead class="bg-surface text-xs text-muted"><tr><th class="px-6 py-3">สายการนิเทศ</th><th class="px-4 py-3 text-right">ห้องชาย / หญิง</th><th class="px-4 py-3 text-right">ค่าน้ำมัน</th><th class="px-4 py-3 text-right">ค่าที่พัก</th><th class="px-4 py-3 text-right">เบี้ยเลี้ยง</th><th class="px-4 py-3 text-right">รวม</th><th class="px-4 py-3">อัปเดต</th></tr></thead><tbody class="divide-y divide-divider"><tr v-for="record in records" :key="record.id" class="hover:bg-surface/70"><td class="px-6 py-4"><p class="font-semibold text-ink">{{ record.groupName }}</p><p class="mt-1 text-xs text-muted">{{ record.companyCount }} บริษัท · {{ record.lecturerCount }} อาจารย์</p></td><td class="px-4 py-4 text-right tabular-nums">{{ record.maleRoomCount }} / {{ record.femaleRoomCount }}</td><td class="px-4 py-4 text-right tabular-nums">{{ money(record.amounts.fuel) }}</td><td class="px-4 py-4 text-right tabular-nums">{{ money(record.amounts.accommodation) }}</td><td class="px-4 py-4 text-right tabular-nums">{{ money(record.amounts.allowance) }}</td><td class="px-4 py-4 text-right font-bold tabular-nums">{{ money(record.total) }}</td><td class="whitespace-nowrap px-4 py-4 text-muted">{{ dateTime(record.updatedAt) }}<p class="mt-1 text-xs">{{ record.createdBy }}</p></td></tr></tbody></table></div>
        <div v-if="records.length" class="divide-y divide-divider md:hidden"><article v-for="record in records" :key="record.id" class="space-y-3 p-5"><div class="flex items-start justify-between gap-3"><div><h4 class="font-semibold text-ink">{{ record.groupName }}</h4><p class="mt-1 text-xs text-muted">{{ record.companyCount }} บริษัท · {{ record.lecturerCount }} อาจารย์</p></div><p class="whitespace-nowrap font-bold tabular-nums">{{ money(record.total) }}</p></div><dl class="grid grid-cols-2 gap-3 border-t border-divider pt-3 text-sm"><div><dt class="text-xs text-muted">ห้องชาย / หญิง</dt><dd class="mt-1">{{ record.maleRoomCount }} / {{ record.femaleRoomCount }}</dd></div><div><dt class="text-xs text-muted">ค่าที่พัก</dt><dd class="mt-1 tabular-nums">{{ money(record.amounts.accommodation) }}</dd></div><div><dt class="text-xs text-muted">ค่าน้ำมัน</dt><dd class="mt-1 tabular-nums">{{ money(record.amounts.fuel) }}</dd></div><div><dt class="text-xs text-muted">เบี้ยเลี้ยง</dt><dd class="mt-1 tabular-nums">{{ money(record.amounts.allowance) }}</dd></div></dl><p class="border-t border-divider pt-3 text-xs text-muted">{{ dateTime(record.updatedAt) }} · {{ record.createdBy }}</p></article></div>
      </UiCard>
    </template>
  </div>
</template>
