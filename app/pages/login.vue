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
  <section class="w-full max-w-md rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xl shadow-stone-300/30 dark:border-stone-800 dark:bg-stone-900 dark:shadow-none sm:p-9">
    <div class="mb-8">
      <img src="/images/cs-buu-logo.png" alt="สาขาวิชาวิทยาการคอมพิวเตอร์" class="mb-8 h-auto w-full max-w-[22rem] object-contain object-left lg:hidden" >
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Welcome back</p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-stone-950 dark:text-white">เข้าสู่ระบบ</h1>
      <p class="mt-2 text-sm leading-6 text-stone-500">เข้าสู่ระบบเพื่อจัดการงานสหกิจศึกษาและการนิเทศ</p>
    </div>
    <form class="space-y-5" @submit.prevent="submit">
      <label class="block">
        <span class="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200">อีเมล</span>
        <input v-model="email" type="email" autocomplete="email" placeholder="name@example.com" class="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-950" >
      </label>
      <label class="block">
        <span class="mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200">รหัสผ่าน</span>
        <span class="relative block">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="กรอกรหัสผ่าน" class="min-h-12 w-full rounded-xl border border-slate-300 bg-slate-50/60 px-4 pr-12 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-950" >
          <button type="button" class="absolute right-0 top-0 flex size-12 items-center justify-center text-stone-500" :aria-label="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'" @click="showPassword = !showPassword"><UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" /></button>
        </span>
      </label>
      <div v-if="successMessage" role="status" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{{ successMessage }}</div>
      <div v-if="errorMessage" role="alert" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{{ errorMessage }}</div>
      <UButton type="submit" block :loading="loading" label="เข้าสู่ระบบ" />
    </form>
  </section>
</template>
