<script setup lang="ts">
import { Eye, EyeOff } from '@lucide/vue'

interface Props {
  modelValue?: string
  label: string
  name?: string
  type?: 'text' | 'search' | 'email' | 'tel' | 'date' | 'password' | 'number'
  autocomplete?: string
  placeholder?: string
  help?: string
  error?: string
  required?: boolean
  disabled?: boolean
  inputClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  name: undefined,
  type: 'text',
  autocomplete: undefined,
  placeholder: undefined,
  help: undefined,
  error: undefined,
  required: false,
  disabled: false,
  inputClass: undefined,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const id = useId()
const passwordVisible = ref(false)
const inputType = computed(() => props.type === 'password' && passwordVisible.value ? 'text' : props.type)
const helpId = computed(() => props.help ? `${id}-help` : undefined)
const errorId = computed(() => props.error ? `${id}-error` : undefined)
const describedBy = computed(() => [helpId.value, errorId.value].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <label :for="id" class="block text-sm font-semibold text-ink">
    {{ label }} <span v-if="required" class="text-danger" aria-hidden="true">*</span>
  </label>
  <div class="relative mt-1.5">
    <input
      :id="id"
      :value="modelValue"
      :name="name"
      :type="inputType"
      :autocomplete="autocomplete"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :aria-invalid="Boolean(error)"
      :aria-describedby="describedBy"
      :class="[error ? 'border-danger' : 'border-divider hover:border-gray-300', props.type === 'password' ? 'pr-11' : '', inputClass]"
      class="min-h-11 w-full rounded-control border bg-canvas px-3 text-sm font-normal text-ink transition-colors placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-55"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <button
      v-if="props.type === 'password'"
      type="button"
      class="absolute inset-y-0 right-1 inline-grid w-10 place-items-center rounded-control text-muted transition-colors hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning disabled:cursor-not-allowed disabled:opacity-55"
      :disabled="disabled"
      :aria-label="passwordVisible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
      :title="passwordVisible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
      :aria-pressed="passwordVisible"
      @click="passwordVisible = !passwordVisible"
    >
      <EyeOff v-if="passwordVisible" :size="18" aria-hidden="true" />
      <Eye v-else :size="18" aria-hidden="true" />
    </button>
  </div>
  <p v-if="help" :id="helpId" class="mt-1.5 text-xs font-normal text-muted">{{ help }}</p>
  <p v-if="error" :id="errorId" class="mt-1.5 text-xs font-medium text-danger">{{ error }}</p>
</template>
