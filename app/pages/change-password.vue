<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const loading = ref(false)
const { request } = useApiClient()
const session = useSession()

async function submit() {
  errorMessage.value = ''
  if (newPassword.value.length < 12) {
    errorMessage.value = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน'
    return
  }
  if (currentPassword.value === newPassword.value) {
    errorMessage.value = 'รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านปัจจุบัน'
    return
  }

  loading.value = true
  try {
    await request('/api/profile/password', {
      method: 'PUT',
      body: { currentPassword: currentPassword.value, newPassword: newPassword.value }
    })
    await session.refresh()
    await navigateTo('/login?passwordChanged=1')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-8">
    <div class="mb-7 text-center">
      <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-600 text-white">
        <UIcon name="i-lucide-key-round" class="size-6" />
      </div>
      <h1 class="mt-4 text-2xl font-semibold">เปลี่ยนรหัสผ่านครั้งแรก</h1>
      <p class="mt-1 text-sm text-slate-500">ตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานระบบ</p>
    </div>

    <form class="space-y-5" @submit.prevent="submit">
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium">รหัสผ่านปัจจุบัน</span>
        <input v-model="currentPassword" required type="password" minlength="8" maxlength="128" autocomplete="current-password" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700">
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium">รหัสผ่านใหม่</span>
        <input v-model="newPassword" required type="password" minlength="12" maxlength="128" autocomplete="new-password" aria-describedby="new-password-help" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700">
        <span id="new-password-help" class="mt-1.5 block text-xs text-slate-500">อย่างน้อย 12 ตัวอักษร และต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน</span>
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium">ยืนยันรหัสผ่านใหม่</span>
        <input v-model="confirmPassword" required type="password" minlength="12" maxlength="128" autocomplete="new-password" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700">
      </label>
      <div v-if="errorMessage" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{{ errorMessage }}</div>
      <UButton type="submit" block :loading="loading" icon="i-lucide-save" label="บันทึกรหัสผ่านใหม่" />
    </form>
  </section>
</template>
