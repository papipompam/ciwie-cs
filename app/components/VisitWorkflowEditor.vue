<script setup lang="ts">
const props = defineProps<{ record: Record<string, unknown> }>()
const emit = defineEmits<{ reload: [] }>()
const { request } = useApiClient()
const { run } = useUiAction()
const toast = useToast()
const form = reactive({ date: String(props.record.date || props.record.visitDate || ''), period: String(props.record.period || 'MORNING'), reason: '' })
const busy = ref(false)
const mode = ref<'reschedule' | 'postpone' | 'cancel' | null>(null)
const version = computed(() => Number(props.record.version ?? props.record.lockVersion ?? 0))

async function submit() {
  const command = mode.value
  await run({ allowed: Boolean(command) && !busy.value, reason: 'กรุณาเลือกคำสั่งก่อน' }, async () => {
    if (form.reason.trim().length < 3) { toast.add({ title: 'กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร', color: 'warning' }); return }
    if (command === 'reschedule' && !form.date) { toast.add({ title: 'กรุณาเลือกวันที่ใหม่', color: 'warning' }); return }
    busy.value = true
    try {
      const body = command === 'reschedule'
        ? { expectedVersion: version.value, date: form.date, period: form.period, reason: form.reason.trim() }
        : { expectedVersion: version.value, reason: form.reason.trim() }
      await request(`/api/visits/${props.record.id}/${command}`, { method: 'POST', body })
      toast.add({ title: command === 'reschedule' ? 'เลื่อนนัดแล้ว' : command === 'postpone' ? 'พักกำหนดนัดแล้ว' : 'ยกเลิกนัดแล้ว', color: 'primary' })
      mode.value = null; form.reason = ''; emit('reload')
    } finally { busy.value = false }
  })
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 class="font-semibold">จัดการกำหนดนิเทศ</h2><p class="mt-1 text-sm text-slate-500">การเลื่อน พัก หรือยกเลิกต้องมีเหตุผลและถูกเก็บในประวัติ</p>
    <div class="mt-4 flex flex-wrap gap-2"><UButton color="neutral" variant="outline" icon="i-lucide-calendar-clock" label="เลื่อนนัด" @click="mode = 'reschedule'" /><UButton color="warning" variant="outline" icon="i-lucide-pause" label="พักกำหนดนัด" @click="mode = 'postpone'" /><UButton color="error" variant="outline" icon="i-lucide-ban" label="ยกเลิกนัด" @click="mode = 'cancel'" /></div>
    <form v-if="mode" class="mt-5 grid gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-950 sm:grid-cols-2" @submit.prevent="submit">
      <label v-if="mode === 'reschedule'" class="block"><span class="mb-1 block text-sm font-medium">วันที่ใหม่</span><input v-model="form.date" required type="date" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700" ></label>
      <label v-if="mode === 'reschedule'" class="block"><span class="mb-1 block text-sm font-medium">ช่วงเวลา</span><select v-model="form.period" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><option value="MORNING">ช่วงเช้า</option><option value="AFTERNOON">ช่วงบ่าย</option></select></label>
      <label class="block sm:col-span-2"><span class="mb-1 block text-sm font-medium">เหตุผล</span><textarea v-model="form.reason" required minlength="3" rows="3" class="w-full rounded-lg border border-slate-300 bg-transparent p-3 dark:border-slate-700" /></label>
      <div class="flex gap-2 sm:col-span-2 sm:justify-end"><UButton color="neutral" variant="outline" label="ยกเลิก" @click="mode = null" /><UButton type="submit" label="ยืนยันรายการ" /></div>
    </form>
  </section>
</template>

