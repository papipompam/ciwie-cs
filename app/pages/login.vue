<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const { request } = useApiClient()
const session = useSession()
const route = useRoute()
const successMessage = computed(() => route.query.passwordChanged === '1' ? 'เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบอีกครั้ง' : '')

async function submit() {
  errorMessage.value = ''
  if (!email.value.trim() || !password.value) {
    errorMessage.value = 'กรุณากรอกอีเมลและรหัสผ่าน'
    return
  }
  loading.value = true
  try {
    await request('/api/auth/login', { method: 'POST', body: { email: email.value.trim(), password: password.value } })
    await session.refresh()
    await navigateTo(session.user.value?.mustChangePassword ? '/change-password' : '/')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-8">
    <div class="mb-7 text-center">
      <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-teal-600 text-sm font-bold tracking-wide text-white">CS</div>
      <h1 class="mt-4 text-2xl font-semibold">เข้าสู่ระบบ</h1>
      <p class="mt-1 text-sm text-slate-500">ระบบจัดการการนิเทศสหกิจศึกษา</p>
    </div>
    <form class="space-y-5" @submit.prevent="submit">
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium">อีเมล</span>
        <input v-model="email" type="email" autocomplete="email" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700" >
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium">รหัสผ่าน</span>
        <span class="relative block">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 pr-12 dark:border-slate-700" >
          <button type="button" class="absolute right-0 top-0 flex size-11 items-center justify-center" :aria-label="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'" @click="showPassword = !showPassword"><UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" /></button>
        </span>
      </label>
      <div v-if="successMessage" role="status" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{{ successMessage }}</div>
      <div v-if="errorMessage" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{{ errorMessage }}</div>
      <UButton type="submit" block :loading="loading" label="เข้าสู่ระบบ" />
    </form>
  </section>
</template>
