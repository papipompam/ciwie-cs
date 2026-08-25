<script setup lang="ts">
defineProps<{ compact?: boolean }>()
defineEmits<{ close: [] }>()

const route = useRoute()
const { navigation } = useNavigation()
const { user, logout } = useSession()

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <aside class="flex h-full flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
    <div class="flex min-h-16 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
        <span class="text-xs font-bold tracking-wide" aria-hidden="true">CS</span>
      </div>
      <div v-if="!compact" class="min-w-0">
        <p class="truncate font-semibold text-slate-900 dark:text-white">CIWIE CS</p>
        <p class="truncate text-xs text-slate-500">ระบบนิเทศสหกิจศึกษา</p>
      </div>
      <button v-if="!compact" type="button" class="ml-auto flex size-11 items-center justify-center rounded-lg lg:hidden" aria-label="ปิดเมนู" @click="$emit('close')">
        <UIcon name="i-lucide-x" class="size-5" />
      </button>
    </div>

    <nav class="flex-1 space-y-1 overflow-y-auto p-3" aria-label="เมนูหลัก">
      <NuxtLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors"
        :class="isActive(item.to) ? 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'"
        :aria-current="isActive(item.to) ? 'page' : undefined"
        @click="$emit('close')"
      >
        <UIcon :name="item.icon" class="size-5 shrink-0" aria-hidden="true" />
        <span v-if="!compact">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="border-t border-slate-200 p-3 dark:border-slate-800">
      <div v-if="!compact" class="mb-2 px-3">
        <p class="truncate text-sm font-medium">{{ user?.displayName }}</p>
        <p class="text-xs text-slate-500">{{ user?.role }}</p>
      </div>
      <button type="button" class="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" @click="logout">
        <UIcon name="i-lucide-log-out" class="size-5" aria-hidden="true" />
        <span v-if="!compact">ออกจากระบบ</span>
      </button>
    </div>
  </aside>
</template>
