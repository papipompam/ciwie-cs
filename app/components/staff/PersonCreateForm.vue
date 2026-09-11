<script setup lang="ts">
import { Save } from '@lucide/vue'
import { z } from 'zod'
import type { PersonInput, PersonType } from '~/composables/usePeopleDirectory'

const props = defineProps<{ personType: PersonType }>()
const emit = defineEmits<{ saved: [], cancel: [] }>()
const { persistCreatePerson } = usePeopleDirectory()
const { cycles } = useCoopCycles()
const { showToast } = useToast()

const context = computed(() => props.personType === 'student'
  ? { idLabel: 'รหัสนักศึกษา', singular: 'นักศึกษา' }
  : { idLabel: 'รหัสอาจารย์', singular: 'อาจารย์' })
const prefixOptions = computed(() => personPrefixOptions[props.personType])
const cycleOptions = cycles.map(cycle => ({ value: cycle.label, label: cycle.label }))
const form = reactive<PersonInput>({ id: '', prefix: props.personType === 'student' ? 'นาย' : 'อาจารย์', firstName: '', lastName: '', phone: '', email: '', gender: undefined, cycle: props.personType === 'student' ? 'ภาคเรียนที่ 2/2569' : undefined, section: props.personType === 'student' ? 'หมู่ 1' : undefined })
const formCycle = computed({ get: () => form.cycle ?? '', set: value => { form.cycle = value } })
const formSection = computed({ get: () => form.section ?? '', set: value => { form.section = value as PersonInput['section'] } })
const errors = reactive<Partial<Record<keyof PersonInput, string>>>({})
const isSubmitting = ref(false)
const schema = z.object({
  id: z.string().trim().min(1, 'กรุณากรอกรหัส').max(20, 'รหัสต้องไม่เกิน 20 ตัวอักษร'),
  prefix: z.enum(personPrefixValues, { error: 'กรุณาเลือกคำนำหน้า' }),
  firstName: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(100, 'ชื่อต้องไม่เกิน 100 ตัวอักษร'),
  lastName: z.string().trim().min(1, 'กรุณากรอกนามสกุล').max(100, 'นามสกุลต้องไม่เกิน 100 ตัวอักษร'),
  phone: z.string().trim().regex(/^[0-9+()\-\s]{8,30}$/, 'รูปแบบเบอร์โทรไม่ถูกต้อง').optional().or(z.literal('')),
  email: z.string().trim().email('รูปแบบอีเมลไม่ถูกต้อง').max(254).optional().or(z.literal('')),
  gender: z.enum(['male', 'female']).optional(), cycle: z.string().optional(), section: z.enum(studentSectionValues).optional(),
})

const submit = async () => {
  Object.keys(errors).forEach(key => { errors[key as keyof PersonInput] = undefined })
  const result = schema.safeParse(form)
  if (!result.success) {
    result.error.issues.forEach((issue) => { errors[issue.path[0] as keyof PersonInput] = issue.message })
    return
  }
  isSubmitting.value = true
  try {
    const person = await persistCreatePerson(props.personType, result.data)
    showToast({ title: `เพิ่ม${context.value.singular}แล้ว`, description: `สร้างบัญชี ${person.id} และรอเข้าสู่ระบบครั้งแรก` })
    emit('saved')
  } catch (error) {
    if (error instanceof Error && error.message === 'duplicate-id') errors.id = `${context.value.idLabel}นี้มีอยู่ในระบบแล้ว`
    else showToast({ title: 'บันทึกข้อมูลไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' })
  } finally { isSubmitting.value = false }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <template v-if="personType === 'student'">
      <section aria-labelledby="student-information-heading">
        <h3 id="student-information-heading" class="text-base font-bold text-ink">ข้อมูลนักศึกษา</h3>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2"><UiInput v-model="form.id" :label="context.idLabel" placeholder="เช่น 66123456701" :error="errors.id" required /></div>
          <div><UiSelect v-model="form.prefix" :options="prefixOptions" label="คำนำหน้า" :error="errors.prefix" required /></div>
          <div><UiInput v-model="form.firstName" label="ชื่อ" placeholder="กรอกชื่อ" :error="errors.firstName" required /></div>
          <div><UiInput v-model="form.lastName" label="นามสกุล" placeholder="กรอกนามสกุล" :error="errors.lastName" required /></div>
          <div><UiInput v-model="form.phone" label="เบอร์โทร" placeholder="08xxxxxxxx" :error="errors.phone" /></div>
          <div class="sm:col-span-2"><UiInput v-model="form.email" type="email" label="อีเมล" placeholder="name@example.ac.th" :error="errors.email" /></div>
        </div>
      </section>
      <section class="mt-6 border-t border-divider pt-5" aria-labelledby="student-education-heading">
        <h3 id="student-education-heading" class="text-base font-bold text-ink">ข้อมูลการศึกษา</h3>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div><UiSelect v-model="formCycle" :options="cycleOptions" label="รอบสหกิจศึกษา" :error="errors.cycle" /></div>
          <div><UiSelect v-model="formSection" :options="studentSectionValues.map(value => ({ value, label: value }))" label="หมู่เรียน" :error="errors.section" required /></div>
        </div>
      </section>
    </template>
    <template v-else>
      <section aria-labelledby="lecturer-information-heading">
        <h3 id="lecturer-information-heading" class="text-base font-bold text-ink">ข้อมูลอาจารย์</h3>
        <div class="mt-4 grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2"><UiInput v-model="form.id" :label="context.idLabel" placeholder="เช่น L0021" :error="errors.id" required /></div>
          <div class="sm:col-span-2 grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]">
            <div><UiSelect v-model="form.prefix" :options="prefixOptions" label="คำนำหน้า" :error="errors.prefix" required /></div>
            <div><UiInput v-model="form.firstName" label="ชื่อ" placeholder="กรอกชื่อ" :error="errors.firstName" required /></div>
            <div><UiInput v-model="form.lastName" label="นามสกุล" placeholder="กรอกนามสกุล" :error="errors.lastName" required /></div>
          </div>
          <div><UiInput v-model="form.email" type="email" label="อีเมล" placeholder="name@example.ac.th" :error="errors.email" /></div>
          <div><UiInput v-model="form.phone" label="เบอร์โทร" placeholder="08xxxxxxxx" :error="errors.phone" /></div>
        </div>
      </section>
    </template>
    <div class="mt-6 flex justify-end gap-3 border-t border-divider pt-4">
      <UiButton type="button" variant="ghost" @click="emit('cancel')">ยกเลิก</UiButton>
      <UiButton type="submit" :icon="Save" :loading="isSubmitting">บันทึกและสร้างบัญชี</UiButton>
    </div>
  </form>
</template>
