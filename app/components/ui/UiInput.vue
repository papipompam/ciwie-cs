<script setup lang="ts">
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
const helpId = computed(() => props.help ? `${id}-help` : undefined)
const errorId = computed(() => props.error ? `${id}-error` : undefined)
const describedBy = computed(() => [helpId.value, errorId.value].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <label :for="id" class="block text-sm font-semibold text-ink">
    {{ label }} <span v-if="required" class="text-danger" aria-hidden="true">*</span>
  </label>
  <input
    :id="id"
    :value="modelValue"
    :name="name"
    :type="type"
    :autocomplete="autocomplete"
    :placeholder="placeholder"
    :required="required"
    :disabled="disabled"
    :aria-invalid="Boolean(error)"
    :aria-describedby="describedBy"
    class="mt-1.5 min-h-11 w-full rounded-control border bg-canvas px-3 text-sm font-normal text-ink transition-colors placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-55"
    :class="[error ? 'border-danger' : 'border-divider hover:border-gray-300', inputClass]"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  >
  <p v-if="help" :id="helpId" class="mt-1.5 text-xs font-normal text-muted">{{ help }}</p>
  <p v-if="error" :id="errorId" class="mt-1.5 text-xs font-medium text-danger">{{ error }}</p>
</template>
