<script setup lang="ts">
const sidebarOpen = ref(true)

onMounted(() => {
  sidebarOpen.value = localStorage.getItem('sidebar-open') !== '0'
})

watch(sidebarOpen, (value) => {
  if (import.meta.client && window.matchMedia('(min-width: 1024px)').matches) {
    localStorage.setItem('sidebar-open', value ? '1' : '0')
  }
})
</script>

<template>
  <div class="flex min-h-screen bg-[#eef2f7] dark:bg-slate-950">
    <AppSidebar v-model:open="sidebarOpen" />

    <div class="min-w-0 flex-1">
      <AppHeader
        :sidebar-compact="!sidebarOpen" @open-drawer="sidebarOpen = true"
        @toggle-sidebar="sidebarOpen = !sidebarOpen" />
      <main id="main-content" class="mx-auto w-full max-w-[112rem] p-4 sm:p-6 lg:p-7 xl:px-8 xl:py-7">
        <slot />
      </main>
    </div>
  </div>
</template>
