<script setup lang="ts">
import { History } from '@lucide/vue'

definePageMeta({ title: 'สรุปงบประมาณ', middleware: 'staff-prototype' })
useHead({ title: 'สรุปงบประมาณ' })

const { cycleId, cycleOptions, round, roundModel, roundOptions } = useSupervisionContext()
const { groups, records, loadExpenses } = useSupervisionExpenses()
const { status, error, refresh } = await useAsyncData(
  () => `staff-expenses-${cycleId.value}-${round.value}`,
  () => loadExpenses(cycleId.value, round.value),
  { watch: [cycleId, roundModel] },
)
const money = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 }).format(value)
const dateTime = (value: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value))
</script>

<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-semibold text-primary">เครื่องมือสำหรับเจ้าหน้าที่</p>
      <h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">สรุปงบประมาณ</h2>
      <p class="mt-2 text-sm leading-6 text-muted">เลือกสายที่ระบบจัดกลุ่มจากที่อยู่และพิกัด แล้วกรอกอัตราค่าใช้จ่าย ระบบคำนวณจำนวนห้องพักจากจำนวนอาจารย์ที่เลือก</p>
    </header>

    <div v-if="status === 'pending'" class="space-y-4"><UiSkeleton v-for="row in 4" :key="row" class="h-20" /></div>
    <AppErrorState v-else-if="error" title="โหลดข้อมูลสายการนิเทศไม่สำเร็จ" description="กรุณาลองโหลดข้อมูลอีกครั้ง" @retry="refresh" />
    <AppEmptyState v-else-if="!groups.length" title="ยังไม่มีสายการนิเทศ" description="ต้องจัดกลุ่มสถานประกอบการและเพิ่มอาจารย์เข้าสายก่อน จึงจะคำนวณค่าใช้จ่ายได้">
      <NuxtLink to="/staff/supervision/groups" class="inline-flex min-h-11 items-center rounded-control border border-divider px-4 font-semibold text-ink">ไปหน้าจัดกลุ่มนิเทศ</NuxtLink>
    </AppEmptyState>

    <template v-else>
      <div class="flex flex-wrap justify-end gap-3">
        <div class="w-full sm:w-52"><UiSelect v-model="cycleId" :options="cycleOptions" label="ปีการศึกษา / ภาคเรียน" /></div>
        <div class="w-full sm:w-40"><UiSelect v-model="roundModel" :options="roundOptions" label="ครั้งที่นิเทศ" /></div>
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
