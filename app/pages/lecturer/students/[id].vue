<script setup lang="ts">
import { ArrowLeft, Pencil, Save } from '@lucide/vue'
import { z } from 'zod'

definePageMeta({ title: 'รายละเอียดนักศึกษา', middleware: 'lecturer-prototype' })
useHead({ title: 'รายละเอียดนักศึกษา' })

const route = useRoute()
const { showToast } = useToast()
const { findPerson, getStudentApplicationHistory, updatePerson } = usePeopleDirectory()
const student = computed(() => findPerson('student', String(route.params.id)))
if (!student.value) throw createError({ statusCode: 404, statusMessage: 'ไม่พบข้อมูลนักศึกษา' })
const applications = computed(() => getStudentApplicationHistory(String(route.params.id)))
const isEditing = ref(false)
const isSaving = ref(false)
const form = reactive({ prefix: 'นาย', firstName: '', lastName: '' })
const errors = reactive<{ prefix?: string, firstName?: string, lastName?: string }>({})
const schema = z.object({ prefix: z.enum(personPrefixValues, { error: 'กรุณาเลือกคำนำหน้า' }), firstName: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(100), lastName: z.string().trim().min(1, 'กรุณากรอกนามสกุล').max(100) })
const startEditing = () => { if (!student.value) return; form.prefix = student.value.prefix; form.firstName = student.value.firstName; form.lastName = student.value.lastName; errors.prefix = undefined; errors.firstName = undefined; errors.lastName = undefined; isEditing.value = true }
const save = async () => {
  errors.prefix = undefined; errors.firstName = undefined; errors.lastName = undefined
  const result = schema.safeParse(form)
  if (!result.success) { result.error.issues.forEach(issue => { errors[issue.path[0] as keyof typeof errors] = issue.message }); return }
  if (!student.value) return
  isSaving.value = true
  try {
    updatePerson(student.value, { id: student.value.id, cycle: student.value.cycle, ...result.data })
    isEditing.value = false
    showToast({ title: 'แก้ไขชื่อ–นามสกุลแล้ว', description: 'ระบบบันทึกผู้ดำเนินการ ค่าเดิม และค่าใหม่ในประวัติ' })
  } catch {
    showToast({ title: 'บันทึกข้อมูลไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' })
  } finally { isSaving.value = false }
}
const formatDate = (date: string) => new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00+07:00`))
</script>

<template>
  <div v-if="student">
    <button type="button" class="mb-4 inline-flex min-h-10 items-center gap-2 rounded-control px-2 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink" @click="navigateTo('/lecturer/students')"><ArrowLeft :size="17" aria-hidden="true" />กลับไปข้อมูลนักศึกษา</button>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ getPersonFullName(student) }}</h2><p class="mt-1 text-sm text-muted">รหัสนักศึกษา {{ student.id }}</p></div><UiButton v-if="!isEditing" :icon="Pencil" @click="startEditing">แก้ไขชื่อ–นามสกุล</UiButton></div>
    <div class="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.7fr)]">
      <UiCard class="self-start">
        <div class="flex items-center justify-between gap-3"><h3 class="text-lg font-bold text-ink">ข้อมูลนักศึกษา</h3><UiBadge :tone="recordStatusMeta[student.recordStatus].tone">{{ recordStatusMeta[student.recordStatus].label }}</UiBadge></div>
        <form v-if="isEditing" class="mt-5" novalidate @submit.prevent="save"><div class="grid gap-5"><UiSelect v-model="form.prefix" :options="personPrefixOptions.student" label="คำนำหน้า" :error="errors.prefix" required /><UiInput v-model="form.firstName" label="ชื่อ" :error="errors.firstName" required /><UiInput v-model="form.lastName" label="นามสกุล" :error="errors.lastName" required /></div><UiAlert tone="info" title="ขอบเขตของอาจารย์" class="mt-5">อาจารย์แก้ไขได้เฉพาะคำนำหน้า ชื่อ และนามสกุล การเปลี่ยนรหัส สถานะข้อมูล บัญชี หรือรอบสหกิจต้องดำเนินการโดยเจ้าหน้าที่</UiAlert><div class="mt-5 flex flex-wrap justify-end gap-2 border-t border-divider pt-5"><UiButton variant="ghost" @click="isEditing = false">ยกเลิก</UiButton><UiButton type="submit" :icon="Save" :loading="isSaving">บันทึก</UiButton></div></form>
        <dl v-else class="mt-5 grid gap-5"><div><dt class="text-xs text-muted">รหัสนักศึกษา</dt><dd class="mt-1 font-semibold text-ink">{{ student.id }}</dd></div><div><dt class="text-xs text-muted">ชื่อ–นามสกุล</dt><dd class="mt-1 text-ink">{{ getPersonFullName(student) }}</dd></div><div><dt class="text-xs text-muted">หมู่เรียน</dt><dd class="mt-1 text-ink">{{ student.section || 'ยังไม่กำหนด' }}</dd></div><div><dt class="text-xs text-muted">รอบสหกิจศึกษา</dt><dd class="mt-1 text-ink">{{ student.cycle || 'ยังไม่กำหนด' }}</dd></div><div><dt class="text-xs text-muted">สถานประกอบการที่ยืนยัน</dt><dd class="mt-1 text-ink">{{ student.company || 'ยังไม่มี' }}</dd></div></dl>
      </UiCard>
      <UiCard :padded="false">
        <div class="border-b border-divider p-5 sm:p-6"><h3 class="text-lg font-bold text-ink">ประวัติคำร้องสถานประกอบการ</h3><p class="mt-1 text-sm text-muted">แสดงบริษัท ตำแหน่ง วันที่สมัคร และสถานะของคำร้องทั้งหมด</p></div>
        <div v-if="!applications.length" class="p-5 sm:p-6"><AppEmptyState title="ยังไม่มีประวัติคำร้อง" description="เมื่อนักศึกษาส่งคำร้อง รายการจะปรากฏที่นี่" /></div>
        <template v-else><div class="hidden overflow-x-auto md:block"><table class="w-full min-w-[700px] text-left text-sm"><thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th class="px-6 py-3">เลขที่คำร้อง</th><th class="px-4 py-3">สถานประกอบการ / ตำแหน่ง</th><th class="px-4 py-3">วันที่สมัคร</th><th class="px-4 py-3">สถานะ</th></tr></thead><tbody class="divide-y divide-divider"><tr v-for="application in applications" :key="application.id"><td class="whitespace-nowrap px-6 py-4 font-semibold text-ink">{{ application.id }}</td><td class="px-4 py-4"><p class="font-medium text-ink">{{ application.company }}</p><p class="mt-1 text-xs text-muted">{{ application.position }}</p></td><td class="whitespace-nowrap px-4 py-4 text-muted">{{ formatDate(application.appliedAt) }}</td><td class="px-4 py-4"><UiBadge :tone="studentApplicationStatusMeta[application.status].tone">{{ studentApplicationStatusMeta[application.status].label }}</UiBadge></td></tr></tbody></table></div><div class="divide-y divide-divider md:hidden"><article v-for="application in applications" :key="application.id" class="p-5"><div class="flex items-start justify-between gap-3"><div><h4 class="font-semibold text-ink">{{ application.company }}</h4><p class="mt-1 text-sm text-muted">{{ application.position }}</p></div><UiBadge :tone="studentApplicationStatusMeta[application.status].tone">{{ studentApplicationStatusMeta[application.status].label }}</UiBadge></div><p class="mt-3 text-xs text-muted">{{ application.id }} · {{ formatDate(application.appliedAt) }}</p></article></div></template>
      </UiCard>
    </div>
  </div>
</template>
