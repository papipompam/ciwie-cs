<script setup lang="ts">
interface Props { class?: string }
defineProps<Props>()
</script>

<template>
  <div class="animate-pulse rounded-md bg-divider/80" :class="$props.class" aria-hidden="true" />
</template>
