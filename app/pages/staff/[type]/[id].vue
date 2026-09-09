<script setup lang="ts">
import { ArrowLeft, KeyRound, Pencil, Power, Save, ShieldBan, UserRoundCheck } from '@lucide/vue'
import { z } from 'zod'
import type { PersonInput, PersonType } from '~/composables/usePeopleDirectory'

definePageMeta({ title: 'รายละเอียดข้อมูลบุคคล', middleware: 'staff-prototype' })

const route = useRoute()
const { showToast } = useToast()
const {
  findPerson,
  loadPersistedPeople,
  persistUpdatePerson,
  persistAccountAction,
} = usePeopleDirectory()

const personType = computed<PersonType>(() => route.params.type === 'lecturers' ? 'lecturer' : 'student')
if (!['students', 'lecturers'].includes(String(route.params.type))) throw createError({ statusCode: 404, statusMessage: 'Page not found' })
await loadPersistedPeople(personType.value)
const person = computed(() => findPerson(personType.value, String(route.params.id)))
if (!person.value) throw createError({ statusCode: 404, statusMessage: 'ไม่พบข้อมูลบุคคล' })
const context = computed(() => personType.value === 'student'
  ? { title: 'รายละเอียดนักศึกษา', idLabel: 'รหัสนักศึกษา', singular: 'นักศึกษา' }
  : { title: 'รายละเอียดอาจารย์', idLabel: 'รหัสอาจารย์', singular: 'อาจารย์' })
useHead({ title: () => context.value.title })

const isEditing = ref(false)
const isSaving = ref(false)
const resetDialogOpen = ref(false)
const temporaryPassword = ref('')
const temporaryPasswordError = ref('')
const { cycles } = useCoopCycles()
const cycleOptions = cycles.map(cycle => ({ value: cycle.label, label: cycle.label }))
const prefixOptions = computed(() => personPrefixOptions[personType.value])
const genderOptions = [{ value: 'male', label: 'ชาย' }, { value: 'female', label: 'หญิง' }]
const editForm = reactive<PersonInput>({ id: '', prefix: 'นาย', firstName: '', lastName: '', gender: undefined, cycle: '', section: undefined })
const editCycle = computed({
  get: () => editForm.cycle ?? '',
  set: value => { editForm.cycle = value },
})
const editSection = computed({
  get: () => editForm.section ?? '',
  set: value => { editForm.section = value as PersonInput['section'] },
})
const editGender = computed({
  get: () => editForm.gender ?? '',
  set: value => { editForm.gender = value as PersonInput['gender'] },
})
const editErrors = reactive<Partial<Record<keyof PersonInput, string>>>({})
const schema = z.object({
  id: z.string().trim().min(1, 'กรุณากรอกรหัส').max(20),
  prefix: z.enum(personPrefixValues, { error: 'กรุณาเลือกคำนำหน้า' }),
  firstName: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(100),
  lastName: z.string().trim().min(1, 'กรุณากรอกนามสกุล').max(100),
  gender: z.enum(['male', 'female']).optional(),
  cycle: z.string().optional(),
  section: z.enum(studentSectionValues).optional(),
})

const populateEditForm = () => {
  if (!person.value) return
  Object.assign(editForm, { id: person.value.id, prefix: person.value.prefix, firstName: person.value.firstName, lastName: person.value.lastName, gender: person.value.gender, cycle: person.value.cycle || '', section: person.value.section })
  Object.assign(editErrors, { id: undefined, prefix: undefined, firstName: undefined, lastName: undefined, gender: undefined, cycle: undefined, section: undefined })
}
const startEditing = () => {
  populateEditForm()
  isEditing.value = true
}
const cancelEditing = () => {
  isEditing.value = false
  populateEditForm()
}
const save = async () => {
  Object.assign(editErrors, { id: undefined, prefix: undefined, firstName: undefined, lastName: undefined, cycle: undefined, section: undefined })
  const result = schema.safeParse(editForm)
  if (!result.success) {
    result.error.issues.forEach(issue => { editErrors[issue.path[0] as keyof PersonInput] = issue.message })
    return
  }
  if (personType.value === 'lecturer' && !result.data.gender) {
    editErrors.gender = 'กรุณาระบุเพศสำหรับคำนวณห้องพัก'
    return
  }
  if (!person.value) return
  isSaving.value = true
  try {
    const oldId = person.value.id
    await persistUpdatePerson(person.value, result.data)
    isEditing.value = false
    showToast({ title: 'บันทึกข้อมูลแล้ว', description: 'ระบบบันทึกค่าเดิมและค่าใหม่ในประวัติ' })
    if (oldId !== person.value.id) await navigateTo(`/staff/${route.params.type}/${person.value.id}`, { replace: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'duplicate-id') editErrors.id = `${context.value.idLabel}นี้มีอยู่ในระบบแล้ว`
    else showToast({ title: 'บันทึกข้อมูลไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' })
  } finally {
    isSaving.value = false
  }
}
const performAction = async (action: 'suspend' | 'activate' | 'terminate' | 'restore', title: string, description: string) => {
  if (!person.value || isSaving.value) return
  isSaving.value = true
  try {
    await persistAccountAction(person.value, { action })
    showToast({ title, description })
  }
  catch { showToast({ title: 'บันทึกสถานะไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' }) }
  finally { isSaving.value = false }
}
const handleSuspendAccount = () => {
  if (!person.value) return
  void performAction('suspend', 'ระงับบัญชีแล้ว', 'ผู้ใช้จะเข้าสู่ระบบไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง')
}
const handleActivateAccount = () => {
  if (!person.value) return
  void performAction('activate', 'เปิดใช้งานบัญชีแล้ว', 'ผู้ใช้สามารถเข้าสู่ระบบได้อีกครั้ง')
}
const handleTerminatePerson = () => {
  if (!person.value) return
  void performAction('terminate', 'ยุติการใช้งานแล้ว', 'ข้อมูลและประวัติเดิมยังคงอยู่ในระบบ')
}
const handleRestorePerson = () => {
  if (!person.value) return
  void performAction('restore', 'เปิดใช้งานข้อมูลแล้ว', 'ข้อมูลและบัญชีกลับมาใช้งานได้อีกครั้ง')
}
const confirmPasswordReset = async () => {
  temporaryPasswordError.value = ''
  if (temporaryPassword.value.length < 8 || !/[A-Za-zก-๙]/.test(temporaryPassword.value) || !/\d/.test(temporaryPassword.value)) {
    temporaryPasswordError.value = 'รหัสผ่านชั่วคราวต้องมีอย่างน้อย 8 ตัวอักษร และประกอบด้วยตัวอักษรกับตัวเลข'
    return
  }
  if (temporaryPassword.value === person.value?.id) {
    temporaryPasswordError.value = 'รหัสผ่านชั่วคราวต้องไม่ซ้ำกับรหัสผู้ใช้'
    return
  }
  if (!person.value) return
  isSaving.value = true
  try {
    await persistAccountAction(person.value, { action: 'reset-password', temporaryPassword: temporaryPassword.value })
    resetDialogOpen.value = false
    temporaryPassword.value = ''
    showToast({ title: 'รีเซ็ตรหัสผ่านแล้ว', description: 'Session เดิมถูกยกเลิกและผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไป' })
  }
  catch { temporaryPasswordError.value = 'รีเซ็ตรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง' }
  finally { isSaving.value = false }
}
const formatDateTime = (date: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
</script>

<template>
  <div v-if="person">
    <button type="button" class="mb-4 inline-flex min-h-10 items-center gap-2 rounded-control px-2 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink" @click="navigateTo(`/staff/${route.params.type}`)"><ArrowLeft :size="17" aria-hidden="true" />กลับไป{{ personType === 'student' ? 'ข้อมูลนักศึกษา' : 'ข้อมูลอาจารย์' }}</button>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ getPersonFullName(person) }}</h2><p class="mt-1 text-sm text-muted">{{ context.idLabel }} {{ person.id }}</p></div>
      <UiButton v-if="!isEditing" :icon="Pencil" @click="startEditing">แก้ไขข้อมูล</UiButton>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      <div class="space-y-6">
        <UiCard>
          <div class="flex items-center justify-between gap-3"><h3 class="text-lg font-bold text-ink">ข้อมูลบุคคล</h3><UiBadge :tone="recordStatusMeta[person.recordStatus].tone">{{ recordStatusMeta[person.recordStatus].label }}</UiBadge></div>
          <form v-if="isEditing" class="mt-5" novalidate @submit.prevent="save">
            <div class="grid gap-5 sm:grid-cols-2"><div class="sm:col-span-2"><UiInput v-model="editForm.id" :label="context.idLabel" :error="editErrors.id" required /></div><div><UiSelect v-model="editForm.prefix" :options="prefixOptions" label="คำนำหน้า" :error="editErrors.prefix" required /></div><div><UiInput v-model="editForm.firstName" label="ชื่อ" :error="editErrors.firstName" required /></div><div><UiInput v-model="editForm.lastName" label="นามสกุล" :error="editErrors.lastName" required /></div><div v-if="personType === 'lecturer'"><UiSelect v-model="editGender" :options="genderOptions" label="เพศ" help="ใช้สำหรับจัดห้องพักแยกชายและหญิง" :error="editErrors.gender" required /></div><div v-if="personType === 'student'"><UiSelect v-model="editCycle" :options="cycleOptions" label="รอบสหกิจศึกษา" placeholder="เลือกรอบสหกิจศึกษา" :error="editErrors.cycle" /></div><div v-if="personType === 'student'"><UiSelect v-model="editSection" :options="studentSectionValues.map(value => ({ value, label: value }))" label="หมู่เรียน" :error="editErrors.section" required /></div></div>
            <div class="mt-6 flex flex-wrap justify-end gap-2 border-t border-divider pt-5"><UiButton variant="ghost" @click="cancelEditing">ยกเลิก</UiButton><UiButton type="submit" :icon="Save" :loading="isSaving">บันทึกการแก้ไข</UiButton></div>
          </form>
          <dl v-else class="mt-5 grid gap-5 sm:grid-cols-2"><div><dt class="text-xs font-medium text-muted">{{ context.idLabel }}</dt><dd class="mt-1 font-semibold text-ink">{{ person.id }}</dd></div><div><dt class="text-xs font-medium text-muted">ชื่อผู้ใช้</dt><dd class="mt-1 font-semibold text-ink">{{ person.id }}</dd></div><div><dt class="text-xs font-medium text-muted">คำนำหน้า</dt><dd class="mt-1 text-ink">{{ person.prefix }}</dd></div><div><dt class="text-xs font-medium text-muted">ชื่อ</dt><dd class="mt-1 text-ink">{{ person.firstName }}</dd></div><div><dt class="text-xs font-medium text-muted">นามสกุล</dt><dd class="mt-1 text-ink">{{ person.lastName }}</dd></div><div v-if="personType === 'lecturer'"><dt class="text-xs font-medium text-muted">เพศ</dt><dd class="mt-1 text-ink">{{ person.gender === 'male' ? 'ชาย' : person.gender === 'female' ? 'หญิง' : 'ยังไม่ระบุ' }}</dd></div><div v-if="personType === 'student'"><dt class="text-xs font-medium text-muted">หมู่เรียน</dt><dd class="mt-1 text-ink">{{ person.section || 'ยังไม่กำหนด' }}</dd></div><div v-if="personType === 'student'"><dt class="text-xs font-medium text-muted">รอบสหกิจศึกษา</dt><dd class="mt-1 text-ink">{{ person.cycle || 'ยังไม่กำหนด' }}</dd></div><div v-if="personType === 'student'"><dt class="text-xs font-medium text-muted">สถานประกอบการที่ยืนยัน</dt><dd class="mt-1 text-ink">{{ person.company || 'ยังไม่มี' }}</dd></div></dl>
        </UiCard>

        <UiCard :padded="false">
          <div class="border-b border-divider p-5 sm:p-6"><h3 class="text-lg font-bold text-ink">ประวัติการเปลี่ยนแปลงและบัญชี</h3><p class="mt-1 text-sm text-muted">แสดงผู้ดำเนินการ เวลา และรายละเอียดที่เปลี่ยน โดยไม่สามารถลบประวัติได้</p></div>
          <div class="hidden overflow-x-auto md:block"><table class="w-full min-w-[700px] text-left text-sm"><thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th class="px-6 py-3">วันเวลา</th><th class="px-4 py-3">รายการ</th><th class="px-4 py-3">รายละเอียด</th><th class="px-4 py-3">ผู้ดำเนินการ</th></tr></thead><tbody class="divide-y divide-divider"><tr v-for="activity in person.activities" :key="activity.id"><td class="whitespace-nowrap px-6 py-4 text-muted">{{ formatDateTime(activity.occurredAt) }}</td><td class="px-4 py-4 font-semibold text-ink">{{ activity.action }}</td><td class="px-4 py-4 text-muted">{{ activity.detail }}</td><td class="px-4 py-4 text-ink">{{ activity.actor }}</td></tr></tbody></table></div>
          <div class="divide-y divide-divider md:hidden"><article v-for="activity in person.activities" :key="activity.id" class="p-5"><h4 class="font-semibold text-ink">{{ activity.action }}</h4><p class="mt-2 text-sm leading-6 text-muted">{{ activity.detail }}</p><p class="mt-2 text-xs text-muted">{{ activity.actor }} · {{ formatDateTime(activity.occurredAt) }}</p></article></div>
        </UiCard>
      </div>

      <aside class="space-y-6">
        <UiCard>
          <div class="flex items-center justify-between gap-3"><h3 class="text-lg font-bold text-ink">บัญชีผู้ใช้</h3><UiBadge :tone="accountStatusMeta[person.accountStatus].tone">{{ accountStatusMeta[person.accountStatus].label }}</UiBadge></div>
          <p class="mt-3 text-sm leading-6 text-muted">การระงับ รีเซ็ตรหัสผ่าน หรือยุติบัญชีจะยกเลิก Session เดิมทั้งหมด</p>
          <div v-if="person.recordStatus === 'active'" class="mt-5 grid gap-2">
            <UiDialog v-if="person.accountStatus === 'active' || person.accountStatus === 'first-login'" title="ระงับบัญชีชั่วคราว" description="ผู้ใช้จะเข้าสู่ระบบไม่ได้และ Session ปัจจุบันจะถูกยกเลิก แต่ข้อมูลและประวัติยังคงอยู่">
              <template #trigger><UiButton variant="secondary" :icon="ShieldBan">ระงับบัญชีชั่วคราว</UiButton></template><template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template><template #confirm><UiButton variant="danger" @click="handleSuspendAccount">ยืนยันการระงับ</UiButton></template>
            </UiDialog>
            <UiButton v-if="person.accountStatus === 'suspended'" variant="secondary" :icon="UserRoundCheck" @click="handleActivateAccount">เปิดใช้งานบัญชี</UiButton>
            <UiButton variant="secondary" :icon="KeyRound" @click="resetDialogOpen = true">รีเซ็ตรหัสผ่าน</UiButton>
          </div>
        </UiCard>

        <UiCard>
          <h3 class="text-lg font-bold text-ink">สถานะข้อมูล</h3>
          <p class="mt-3 text-sm leading-6 text-muted">การยุติการใช้งานจะไม่ลบข้อมูล คำร้อง ตารางนิเทศ หรือประวัติที่เคยอ้างอิง</p>
          <div class="mt-5">
            <UiDialog v-if="person.recordStatus === 'active'" :title="`ยุติการใช้งาน${context.singular}`" description="ข้อมูลจะไม่ปรากฏเป็นตัวเลือกสำหรับรายการใหม่ และบัญชีจะถูกยุติ แต่ยังค้นหาและดูประวัติเดิมได้">
              <template #trigger><UiButton variant="danger" :icon="Power">ยุติการใช้งาน</UiButton></template><template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template><template #confirm><UiButton variant="danger" @click="handleTerminatePerson">ยืนยันการยุติ</UiButton></template>
            </UiDialog>
            <UiButton v-else :icon="UserRoundCheck" @click="handleRestorePerson">เปิดใช้งานอีกครั้ง</UiButton>
          </div>
        </UiCard>
      </aside>
    </div>

    <UiDialog v-model:open="resetDialogOpen" :close-on-confirm="false" title="กำหนดรหัสผ่านชั่วคราว" description="ระบบจะยกเลิก Session เดิมและบังคับให้ผู้ใช้เปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไป">
      <UiInput v-model="temporaryPassword" label="รหัสผ่านชั่วคราว" type="text" help="อย่างน้อย 8 ตัวอักษร มีตัวอักษรและตัวเลข และต้องไม่ซ้ำกับรหัสผู้ใช้" :error="temporaryPasswordError" required />
      <template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template><template #confirm><UiButton :icon="KeyRound" @click="confirmPasswordReset">ยืนยันรีเซ็ตรหัสผ่าน</UiButton></template>
    </UiDialog>
  </div>
</template>
