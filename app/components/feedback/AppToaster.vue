<script setup lang="ts">
import { CheckCircle2, X } from '@lucide/vue'
import { ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from 'reka-ui'

const { messages, dismissToast } = useToast()
</script>

<template>
  <ToastProvider :duration="4000">
    <ToastRoot
      v-for="message in messages"
      :key="message.id"
      class="flex w-[calc(100vw-2rem)] max-w-sm gap-3 rounded-panel border border-divider bg-canvas p-4 shadow-xl"
      @update:open="open => !open && dismissToast(message.id)"
    >
      <CheckCircle2 class="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <ToastTitle class="text-sm font-semibold text-ink">{{ message.title }}</ToastTitle>
        <ToastDescription v-if="message.description" class="mt-0.5 text-sm text-muted">
          {{ message.description }}
        </ToastDescription>
      </div>
      <ToastClose class="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-surface" aria-label="ปิดข้อความแจ้งเตือน">
        <X :size="16" aria-hidden="true" />
      </ToastClose>
    </ToastRoot>
    <ToastViewport class="fixed right-4 bottom-20 z-[80] flex flex-col gap-2 outline-none" />
  </ToastProvider>
</template>
