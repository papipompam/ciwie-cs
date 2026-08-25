<script setup lang="ts">
definePageMeta({ roles: ['LECTURER', 'ADMIN'] })
const { request } = useApiClient()
const toast = useToast()
const busy = ref(false)
const form = reactive({ coopTermId: '', workSiteId: '', round: 1, date: '', period: 'MORNING', studentTermIds: [] as string[], lecturerIds: [] as string[] })
async function submit() {
  const studentTermIds = [...new Set(form.studentTermIds)]; const lecturerIds = [...new Set(form.lecturerIds)]
  if (!studentTermIds.length || !lecturerIds.length) { toast.add({ title: 'ข้อมูลสมาชิกไม่ครบ', description: 'ต้องมีนักศึกษาและอาจารย์อย่างน้อยหนึ่งคน', color: 'warning' }); return }
  busy.value = true
  try { await request('/api/visits', { method: 'POST', body: { coopTermId: form.coopTermId.trim(), workSiteId: form.workSiteId.trim(), round: Number(form.round), date: form.date, period: form.period, studentTermIds, lecturerIds } }); toast.add({ title: 'จัดตารางนิเทศสำเร็จ', color: 'primary' }); await navigateTo('/visits') } catch (cause) { toast.add({ title: 'จัดตารางไม่สำเร็จ', description: cause instanceof Error ? cause.message : 'โปรดลองอีกครั้ง', color: 'error' }) } finally { busy.value = false }
}
</script>
<template>
  <div class="max-w-4xl"><PageHeader title="จัดตารางนิเทศ" description="ระบบจะตรวจเวลาชนของนักศึกษา อาจารย์ และสถานประกอบการก่อนบันทึก" icon="i-lucide-calendar-plus" />
    <form class="grid gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2" @submit.prevent="submit">
      <LookupSelect v-model="form.coopTermId" resource="COOP_TERMS" label="ภาคสหกิจ" required /><LookupSelect v-model="form.workSiteId" resource="WORK_SITES" label="สถานที่ปฏิบัติงาน" :context="{ coopTermId: form.coopTermId || undefined }" required />
      <label><span class="mb-1 block text-sm font-medium">รอบ *</span><select v-model.number="form.round" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><option :value="1">รอบ 1</option><option :value="2">รอบ 2</option></select></label><label><span class="mb-1 block text-sm font-medium">วันที่ *</span><input v-model="form.date" required type="date" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700" ></label>
      <label><span class="mb-1 block text-sm font-medium">ช่วงเวลา *</span><select v-model="form.period" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><option value="MORNING">ช่วงเช้า</option><option value="AFTERNOON">ช่วงบ่าย</option></select></label><div />
      <LookupSelect v-model="form.studentTermIds" class="sm:col-span-2" resource="STUDENT_TERMS" label="นักศึกษาที่มี Placement ณ สถานที่นี้" :context="{ coopTermId: form.coopTermId || undefined, workSiteId: form.workSiteId || undefined }" multiple required /><LookupSelect v-model="form.lecturerIds" class="sm:col-span-2" resource="LECTURERS" label="อาจารย์นิเทศ" :context="{ coopTermId: form.coopTermId || undefined }" multiple required />
      <div class="flex justify-end gap-2 sm:col-span-2"><UButton color="neutral" variant="outline" to="/visits" label="ยกเลิก" /><UButton type="submit" :loading="busy" icon="i-lucide-save" label="บันทึกตาราง" /></div>
    </form>
  </div>
</template>
