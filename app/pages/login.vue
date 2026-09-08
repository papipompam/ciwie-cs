<script setup lang="ts">
import { LockKeyhole } from '@lucide/vue'
import { z } from 'zod'

definePageMeta({ layout: 'login' })
useHead({ title: 'เข้าสู่ระบบ' })

const { login } = useAuthPrototype()
const username = ref('')
const password = ref('')
const isSubmitting = ref(false)
const fieldErrors = reactive({ username: '', password: '' })
const loginState = ref<'idle' | 'invalid' | 'locked' | 'suspended' | 'terminated'>('idle')

const loginSchema = z.object({
  username: z.string().trim().min(1, 'กรุณากรอกชื่อผู้ใช้'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})

const clearFeedback = () => {
  fieldErrors.username = ''
  fieldErrors.password = ''
  loginState.value = 'idle'
}

const submitLogin = async () => {
  clearFeedback()
  const parsed = loginSchema.safeParse({ username: username.value, password: password.value })
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors
    fieldErrors.username = errors.username?.[0] ?? ''
    fieldErrors.password = errors.password?.[0] ?? ''
    return
  }

  isSubmitting.value = true
  try {
    const result = await login(parsed.data.username, parsed.data.password)
    if (result.status === 'success') {
      await navigateTo(result.requiresPasswordChange ? '/first-login' : '/')
      return
    }
    loginState.value = result.status
  }
  catch {
    loginState.value = 'invalid'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="w-full">
    <div class="mb-7">
      <p class="text-sm font-semibold text-warning">CWIE BRU</p>
      <h1 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">เข้าสู่ระบบ</h1>
      <p class="mt-2 text-sm leading-6 text-muted">กรอกชื่อผู้ใช้และรหัสผ่านเพื่อเข้าใช้งานตามสิทธิ์ของคุณ</p>
    </div>

    <UiAlert v-if="loginState === 'invalid'" tone="danger" title="เข้าสู่ระบบไม่สำเร็จ" class="mb-5">ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่</UiAlert>
    <UiAlert v-else-if="loginState === 'locked'" tone="warning" title="ระงับการเข้าสู่ระบบชั่วคราว" class="mb-5">มีการกรอกข้อมูลไม่ถูกต้องหลายครั้ง กรุณารอ 1 นาทีแล้วลองใหม่</UiAlert>
    <UiAlert v-else-if="loginState === 'suspended'" tone="warning" title="บัญชีถูกระงับชั่วคราว" class="mb-5">บัญชีนี้ยังไม่สามารถเข้าใช้งานได้ กรุณาติดต่อเจ้าหน้าที่ผู้ดูแลระบบ</UiAlert>
    <UiAlert v-else-if="loginState === 'terminated'" tone="danger" title="บัญชีสิ้นสุดการใช้งานแล้ว" class="mb-5">กรุณาติดต่อเจ้าหน้าที่หากต้องการตรวจสอบสถานะบัญชี</UiAlert>

    <form novalidate class="space-y-5" @submit.prevent="submitLogin">
      <div><UiInput v-model="username" name="username" label="ชื่อผู้ใช้" autocomplete="username" placeholder="รหัสนักศึกษา หรือชื่อผู้ใช้" :error="fieldErrors.username" required /></div>
      <div><UiInput v-model="password" name="password" type="password" autocomplete="current-password" label="รหัสผ่าน" placeholder="กรอกรหัสผ่าน" :error="fieldErrors.password" required /></div>
      <UiButton type="submit" class="w-full" :icon="LockKeyhole" :loading="isSubmitting">เข้าสู่ระบบ</UiButton>
    </form>

    <details class="mt-7 rounded-control border border-divider bg-surface p-4 text-sm">
      <summary class="font-semibold text-ink">บัญชีตัวอย่างสำหรับตรวจ UI</summary>
      <div class="mt-3 grid gap-2 text-xs leading-5 text-muted sm:grid-cols-2">
        <p><span class="font-semibold text-ink">เจ้าหน้าที่:</span> staff001</p><p><span class="font-semibold text-ink">อาจารย์:</span> lecturer001</p>
        <p><span class="font-semibold text-ink">นักศึกษา:</span> 66123456701</p><p><span class="font-semibold text-ink">เข้าสู่ระบบครั้งแรก:</span> 66123456725</p>
        <p class="sm:col-span-2">รหัสผ่านปกติ Cwie@2569 · รหัสผ่านชั่วคราว Temp@2569</p>
      </div>
    </details>
  </div>
</template>
