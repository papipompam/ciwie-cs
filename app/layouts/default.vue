<script setup lang="ts">
const drawerOpen = ref(false)
const colorMode = useColorMode()
const route = useRoute()

watch(() => route.fullPath, () => { drawerOpen.value = false })

function toggleTheme() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <div class="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
      <AppSidebar />
    </div>

    <div v-if="drawerOpen" class="fixed inset-0 z-40 lg:hidden">
      <button type="button" class="absolute inset-0 bg-slate-950/50" aria-label="ปิดเมนู" @click="drawerOpen = false" />
      <div class="relative h-full w-[min(20rem,88vw)] shadow-2xl">
        <AppSidebar @close="drawerOpen = false" />
      </div>
    </div>

    <div class="lg:pl-64">
      <header class="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6">
        <button type="button" class="flex size-11 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 lg:hidden" aria-label="เปิดเมนู" @click="drawerOpen = true">
          <UIcon name="i-lucide-menu" class="size-5" />
        </button>
        <p class="min-w-0 flex-1 truncate text-sm text-slate-500">ระบบจัดการการนิเทศสหกิจศึกษา</p>
        <button type="button" class="flex size-11 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="สลับธีม" @click="toggleTheme">
          <UIcon :name="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'" class="size-5" />
        </button>
        <NuxtLink to="/notifications" class="relative flex size-11 items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="การแจ้งเตือน">
          <UIcon name="i-lucide-bell" class="size-5" />
        </NuxtLink>
      </header>
      <main id="main-content" class="mx-auto max-w-screen-2xl p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

