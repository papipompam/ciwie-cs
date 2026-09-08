<script setup lang="ts">
import { KeyRound } from '@lucide/vue'
import { z } from 'zod'

definePageMeta({ layout: 'auth', middleware: 'first-login' })
useHead({ title: 'ตั้งรหัสผ่านใหม่' })

const { currentAccount, completeFirstLogin } = useAuthPrototype()
const { showToast } = useToast()
const newPassword = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)
const submitError = ref('')
const fieldErrors = reactive({ newPassword: '', confirmPassword: '' })

const passwordSchema = z.object({
  newPassword: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร').regex(/[A-Za-zก-๙]/, 'ต้องมีตัวอักษรอย่างน้อย 1 ตัว').regex(/\d/, 'ต้องมีตัวเลขอย่างน้อย 1 ตัว'),
  confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่านใหม่'),
}).refine(data => data.newPassword === data.confirmPassword, { path: ['confirmPassword'], message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' })

const submitPassword = async () => {
  fieldErrors.newPassword = ''
  fieldErrors.confirmPassword = ''
  submitError.value = ''
  const parsed = passwordSchema.safeParse({ newPassword: newPassword.value, confirmPassword: confirmPassword.value })
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors
    fieldErrors.newPassword = errors.newPassword?.[0] ?? ''
    fieldErrors.confirmPassword = errors.confirmPassword?.[0] ?? ''
    return
  }

  isSubmitting.value = true
  try {
    await completeFirstLogin(parsed.data.newPassword)
    showToast({ title: 'ตั้งรหัสผ่านใหม่แล้ว', description: 'เข้าสู่ระบบสำเร็จและพร้อมใช้งานตามสิทธิ์ของคุณ' })
    await navigateTo('/')
  }
  catch {
    submitError.value = 'ไม่สามารถตั้งรหัสผ่านได้ กรุณากลับไปเข้าสู่ระบบใหม่อีกครั้ง'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-lg">
    <p class="text-sm font-semibold text-warning">เข้าสู่ระบบครั้งแรก</p>
    <h1 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">ตั้งรหัสผ่านใหม่</h1>
    <p class="mt-2 text-sm leading-6 text-muted">เพื่อความปลอดภัย คุณต้องเปลี่ยนรหัสผ่านชั่วคราวก่อนเข้าใช้งานระบบ</p>

    <div class="mt-6 rounded-control border border-divider bg-surface p-4">
      <p class="text-xs text-muted">บัญชีที่กำลังตั้งค่า</p>
      <p class="mt-1 font-semibold text-ink">{{ currentAccount?.name }}</p>
      <p class="mt-0.5 text-xs text-muted">{{ currentAccount?.username }}</p>
    </div>

    <UiAlert v-if="submitError" tone="danger" title="ตั้งรหัสผ่านไม่สำเร็จ" class="mt-5">{{ submitError }}</UiAlert>
    <form novalidate class="mt-6 space-y-5" @submit.prevent="submitPassword">
      <div><UiInput v-model="newPassword" type="password" autocomplete="new-password" label="รหัสผ่านใหม่" help="อย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรกับตัวเลข" :error="fieldErrors.newPassword" required /></div>
      <div><UiInput v-model="confirmPassword" type="password" autocomplete="new-password" label="ยืนยันรหัสผ่านใหม่" :error="fieldErrors.confirmPassword" required /></div>
      <UiButton type="submit" class="w-full" :icon="KeyRound" :loading="isSubmitting">ตั้งรหัสผ่านและเข้าใช้งาน</UiButton>
    </form>
  </div>
</template>
