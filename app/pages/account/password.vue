<script setup lang="ts">
import { KeyRound, ShieldCheck } from '@lucide/vue'
import { z } from 'zod'

definePageMeta({ title: 'เปลี่ยนรหัสผ่าน' })
useHead({ title: 'เปลี่ยนรหัสผ่าน' })

const { currentAccount, changePassword } = useAuthPrototype()
const { showToast } = useToast()
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)
const fieldErrors = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'กรุณากรอกรหัสผ่านปัจจุบัน'),
  newPassword: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร').regex(/[A-Za-zก-๙]/, 'ต้องมีตัวอักษรอย่างน้อย 1 ตัว').regex(/\d/, 'ต้องมีตัวเลขอย่างน้อย 1 ตัว'),
  confirmPassword: z.string().min(1, 'กรุณายืนยันรหัสผ่านใหม่'),
}).refine(data => data.newPassword === data.confirmPassword, { path: ['confirmPassword'], message: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' })
  .refine(data => data.currentPassword !== data.newPassword, { path: ['newPassword'], message: 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน' })

const submitPassword = async () => {
  fieldErrors.currentPassword = ''
  fieldErrors.newPassword = ''
  fieldErrors.confirmPassword = ''
  const parsed = passwordSchema.safeParse({ currentPassword: currentPassword.value, newPassword: newPassword.value, confirmPassword: confirmPassword.value })
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors
    fieldErrors.currentPassword = errors.currentPassword?.[0] ?? ''
    fieldErrors.newPassword = errors.newPassword?.[0] ?? ''
    fieldErrors.confirmPassword = errors.confirmPassword?.[0] ?? ''
    return
  }

  isSubmitting.value = true
  try {
    await changePassword(parsed.data.currentPassword, parsed.data.newPassword)
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    showToast({ title: 'เปลี่ยนรหัสผ่านแล้ว', description: 'กรุณาใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งถัดไป' })
  }
  catch (error) {
    fieldErrors.currentPassword = error instanceof Error && error.message === 'current-password-invalid'
      ? 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
      : 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <div class="mb-6">
      <h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">เปลี่ยนรหัสผ่าน</h2>
      <p class="mt-1 text-sm leading-6 text-muted">ตั้งรหัสผ่านใหม่สำหรับบัญชีที่กำลังใช้งาน</p>
    </div>

    <UiCard>
      <div class="flex items-start gap-3 border-b border-divider pb-5">
        <span class="grid size-11 shrink-0 place-items-center rounded-control bg-warning-soft text-warning"><ShieldCheck :size="22" aria-hidden="true" /></span>
        <div><p class="font-semibold text-ink">{{ currentAccount?.name }}</p><p class="mt-1 text-sm text-muted">ชื่อผู้ใช้ {{ currentAccount?.username }}</p></div>
      </div>
      <form novalidate class="mt-5 grid gap-5" @submit.prevent="submitPassword">
        <div><UiInput v-model="currentPassword" type="password" autocomplete="current-password" label="รหัสผ่านปัจจุบัน" :error="fieldErrors.currentPassword" required /></div>
        <div class="grid gap-5 sm:grid-cols-2">
          <div><UiInput v-model="newPassword" type="password" autocomplete="new-password" label="รหัสผ่านใหม่" help="อย่างน้อย 8 ตัวอักษร และต้องมีตัวอักษรกับตัวเลข" :error="fieldErrors.newPassword" required /></div>
          <div><UiInput v-model="confirmPassword" type="password" autocomplete="new-password" label="ยืนยันรหัสผ่านใหม่" :error="fieldErrors.confirmPassword" required /></div>
        </div>
        <div class="flex justify-end border-t border-divider pt-5"><UiButton type="submit" :icon="KeyRound" :loading="isSubmitting">บันทึกรหัสผ่านใหม่</UiButton></div>
      </form>
    </UiCard>
  </div>
</template>
