<script setup lang="ts">
import { Save, UserRoundPen } from '@lucide/vue'
import { z } from 'zod'
import { studentProfileInputSchema, studentProfileResponseSchema } from '#shared/student-profile'
import { reloadBrowser, requestAwareFetch } from '~/utils/requestAwareFetch'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
const dialogOpen = computed({ get: () => props.open, set: value => emit('update:open', value) })
const { currentAccount } = useAuthPrototype()
const { scenario } = useScenario()
const { showToast } = useToast()
const { data, status, error, refresh } = useFetch('/api/auth/profile')
const form = reactive({ prefix: 'นาย', firstName: '', lastName: '', section: '', phone: '', email: '' })
const fieldErrors = reactive({ prefix: '', firstName: '', lastName: '', section: '', phone: '', email: '' })
const isSubmitting = ref(false)
const prefixOptions = ['นาย', 'นาง', 'นางสาว'].map(value => ({ value, label: value }))
const sectionOptions = ['1', '2'].map(value => ({ value, label: value }))
const displayName = computed(() => [form.prefix, form.firstName, form.lastName].filter(Boolean).join(' '))

watch(data, (value) => {
  if (!value) return
  const profile = studentProfileResponseSchema.parse(value).profile
  Object.assign(form, { prefix: profile.prefix, firstName: profile.firstName, lastName: profile.lastName, section: profile.section ?? '', phone: profile.phone ?? '', email: profile.email ?? '' })
}, { immediate: true })

watch(dialogOpen, (isOpen) => {
  if (isOpen) refresh()
})

const submit = async () => {
  Object.assign(fieldErrors, { prefix: '', firstName: '', lastName: '', section: '', phone: '', email: '' })
  const parsed = studentProfileInputSchema.safeParse(form)
  if (!parsed.success) {
    Object.assign(fieldErrors, z.flattenError(parsed.error).fieldErrors)
    return
  }
  isSubmitting.value = true
  try {
    const result = studentProfileResponseSchema.parse(await requestAwareFetch('/api/auth/profile', { method: 'PATCH', body: parsed.data, reload: false }))
    Object.assign(form, { prefix: result.profile.prefix, firstName: result.profile.firstName, lastName: result.profile.lastName, section: result.profile.section ?? '', phone: result.profile.phone ?? '', email: result.profile.email ?? '' })
    scenario.value.userName = `${result.profile.prefix}${result.profile.firstName} ${result.profile.lastName}`.trim()
    showToast({ title: 'บันทึกข้อมูลส่วนตัวแล้ว' })
    dialogOpen.value = false
    reloadBrowser()
  }
  finally { isSubmitting.value = false }
}
</script>

<template>
  <UiDialog v-model:open="dialogOpen" size="xl" title="แก้ไขข้อมูลส่วนตัว" description="แก้ไขข้อมูลพื้นฐานของคุณ">
    <UiCard v-if="status === 'pending'"><UiSkeleton class="h-48" /></UiCard>
    <AppErrorState v-else-if="error" title="โหลดข้อมูลส่วนตัวไม่สำเร็จ" description="กรุณาลองอีกครั้ง" @retry="refresh" />
    <template v-else>
      <div class="flex items-start gap-3 border-b border-divider pb-5"><span class="grid size-11 shrink-0 place-items-center rounded-control bg-info-soft text-info"><UserRoundPen :size="22" aria-hidden="true" /></span><div><p class="font-semibold text-ink">{{ displayName }}</p><p class="mt-1 text-sm text-muted">รหัสผู้ใช้ {{ currentAccount?.username }}</p></div></div>
      <form novalidate class="mt-5 grid gap-5" @submit.prevent="submit">
        <div class="grid gap-5 sm:grid-cols-3"><UiSelect v-model="form.prefix" :options="prefixOptions" label="คำนำหน้า" :error="fieldErrors.prefix" required /><div><UiInput v-model="form.firstName" label="ชื่อ" :error="fieldErrors.firstName" required /></div><div><UiInput v-model="form.lastName" label="นามสกุล" :error="fieldErrors.lastName" required /></div></div>
        <div class="grid gap-5 sm:grid-cols-[minmax(9rem,0.6fr)_1fr_1fr]"><UiSelect v-model="form.section" :options="sectionOptions" label="หมู่เรียน" :error="fieldErrors.section" required /><div><UiInput v-model="form.phone" type="tel" autocomplete="tel" label="โทรศัพท์" :error="fieldErrors.phone" required /></div><div><UiInput v-model="form.email" type="email" autocomplete="email" label="อีเมล" :error="fieldErrors.email" required /></div></div>
        <div class="flex justify-end border-t border-divider pt-5"><UiButton type="submit" :icon="Save" :loading="isSubmitting">บันทึกข้อมูล</UiButton></div>
      </form>
    </template>
  </UiDialog>
</template>
