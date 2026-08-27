<script setup lang="ts">
defineProps<{ sidebarCompact?: boolean }>()
const emit = defineEmits<{ toggleSidebar: [], openDrawer: [] }>()

const route = useRoute()
const { navigation } = useNavigation()
const searchInput = ref<HTMLInputElement | null>(null)
const headerElement = ref<HTMLElement | null>(null)
const search = ref('')
const searchOpen = ref(false)
const currentPage = computed(() => {
  const match = navigation.value.find(item => item.to === '/' ? route.path === '/' : route.path.startsWith(item.to))
  return match?.label || 'ระบบบริหารจัดการสหกิจศึกษา'
})
const results = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('th')
  return keyword ? navigation.value.filter(item => item.label.toLocaleLowerCase('th').includes(keyword)).slice(0, 6) : navigation.value.slice(0, 6)
})

const openResult = async (to: string) => {
  searchOpen.value = false
  search.value = ''
  await navigateTo(to)
}
const handleShortcut = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchInput.value?.focus()
    searchOpen.value = true
  }
  if (event.key === 'Escape') {
    searchOpen.value = false
  }
}
const handleOutsideClick = (event: MouseEvent) => {
  if (headerElement.value && !headerElement.value.contains(event.target as Node)) {
    searchOpen.value = false
  }
}

watch(() => route.fullPath, () => { searchOpen.value = false })
onMounted(() => {
  window.addEventListener('keydown', handleShortcut)
  document.addEventListener('click', handleOutsideClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleShortcut)
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <header ref="headerElement" class="sticky top-0 z-20 flex min-h-[4.5rem] items-center gap-2 border-b border-slate-200/80 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 sm:gap-3 sm:px-6 lg:px-7">
    <button type="button" class="flex size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white lg:hidden" aria-label="เปิดเมนู" @click="emit('openDrawer')">
      <UIcon name="i-lucide-menu" class="size-5" />
    </button>
    <button type="button" class="hidden size-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white lg:flex" :aria-label="sidebarCompact ? 'ขยายแถบเมนู' : 'ยุบแถบเมนู'" @click="emit('toggleSidebar')">
      <UIcon :name="sidebarCompact ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'" class="size-5" />
    </button>

    <div class="mr-auto min-w-0">
      <p class="truncate text-lg font-bold text-slate-950 dark:text-white">{{ currentPage }}</p>
      <p class="hidden truncate text-xs text-slate-500 sm:block">ระบบบริหารจัดการสหกิจศึกษา</p>
    </div>

    <div class="relative hidden w-full max-w-xs 2xl:block">
      <UIcon name="i-lucide-search" class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input ref="searchInput" v-model="search" type="search" class="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-16 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-3 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-indigo-950" placeholder="ค้นหาเมนูหรือคำสั่ง..." aria-label="ค้นหาเมนูหรือคำสั่ง" @focus="searchOpen = true" @input="searchOpen = true" >
      <kbd class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-800">Ctrl K</kbd>
      <div v-if="searchOpen" class="absolute inset-x-0 top-[calc(100%+0.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <button v-for="item in results" :key="item.to" type="button" class="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800" @mousedown.prevent="openResult(item.to)"><UIcon :name="item.icon" class="size-4 text-slate-400" />{{ item.label }}</button>
        <p v-if="!results.length" class="px-3 py-6 text-center text-sm text-slate-500">ไม่พบเมนูที่ค้นหา</p>
      </div>
    </div>

    <label class="hidden items-center gap-2 lg:flex">
      <span class="sr-only">รอบสหกิจศึกษา</span>
      <select class="min-h-10 min-w-48 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <option>รอบสหกิจศึกษาปัจจุบัน</option>
      </select>
    </label>
    <NuxtLink to="/notifications" class="relative flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900" aria-label="การแจ้งเตือน">
      <UIcon name="i-lucide-bell" class="size-5" />
      <span class="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950" aria-hidden="true">!</span>
    </NuxtLink>
  </header>
</template>
