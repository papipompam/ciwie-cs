<script setup lang="ts">
interface LookupItem { id: string, label: string, description?: string, [key: string]: unknown }

const props = withDefaults(defineProps<{
  modelValue: string | string[]
  resource: string
  label: string
  context?: Record<string, string | number | undefined>
  multiple?: boolean
  required?: boolean
  valueKey?: string
}>(), { context: () => ({}), multiple: false, required: false, valueKey: 'id' })
const emit = defineEmits<{ 'update:modelValue': [value: string | string[]] }>()
const { request } = useApiClient()
const search = ref('')
const items = ref<LookupItem[]>([])
const knownItems = reactive(new Map<string, LookupItem>())
const loading = ref(false)
const error = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

const selectedIds = computed(() => Array.isArray(props.modelValue) ? props.modelValue : props.modelValue ? [props.modelValue] : [])
const selection = computed({
  get: () => Array.isArray(props.modelValue) ? '' : props.modelValue,
  set: value => emit('update:modelValue', value),
})
const multipleSelection = computed<string[]>({
  get: () => Array.isArray(props.modelValue) ? props.modelValue : [],
  set: value => emit('update:modelValue', value),
})
const options = computed(() => {
  const merged = new Map(items.value.map(item => [String(item[props.valueKey] || item.id), item]))
  for (const id of selectedIds.value) {
    if (!merged.has(id)) merged.set(id, knownItems.get(id) || { id, label: id })
  }
  return [...merged.values()]
})
const contextKey = computed(() => JSON.stringify(props.context))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const query = Object.fromEntries(Object.entries({ resource: props.resource, search: search.value.trim() || undefined, ...props.context }).filter(([, value]) => value !== undefined && value !== ''))
    const result = await request<{ items: LookupItem[] }>('/api/lookups', { query })
    items.value = result.items
    for (const item of result.items) knownItems.set(String(item[props.valueKey] || item.id), item)
  } catch (cause) {
    items.value = []
    error.value = cause instanceof Error ? cause.message : 'โหลดตัวเลือกไม่สำเร็จ'
  } finally {
    loading.value = false
  }
}

watch(search, () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(load, 300)
})
watch([() => props.resource, contextKey], load)
onMounted(load)
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>

<template>
  <label class="block">
    <span class="mb-1.5 block text-sm font-medium">{{ label }} <span v-if="required" class="text-rose-600">*</span></span>
    <span class="relative block">
      <UIcon name="i-lucide-search" class="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400" />
      <input v-model="search" :aria-label="`ค้นหา${label}`" :placeholder="`ค้นหา${label}`" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent pl-9 pr-3 dark:border-slate-700">
    </span>
    <select v-if="multiple" v-model="multipleSelection" multiple :required="required" :aria-label="label" class="mt-2 min-h-32 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700">
      <option v-for="item in options" :key="String(item[valueKey] || item.id)" :value="String(item[valueKey] || item.id)">{{ item.label }}{{ item.description ? ` — ${item.description}` : '' }}</option>
    </select>
    <select v-else v-model="selection" :required="required" :aria-label="label" class="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700">
      <option value="">เลือก{{ label }}</option>
      <option v-for="item in options" :key="String(item[valueKey] || item.id)" :value="String(item[valueKey] || item.id)">{{ item.label }}{{ item.description ? ` — ${item.description}` : '' }}</option>
    </select>
    <span v-if="loading" class="mt-1 block text-xs text-slate-500">กำลังโหลด…</span>
    <span v-else-if="error" class="mt-1 block text-xs text-rose-600">{{ error }}</span>
  </label>
</template>
