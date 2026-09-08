<script setup lang="ts">
import { ArrowLeft, ShieldX } from '@lucide/vue'

definePageMeta({ title: 'ไม่มีสิทธิ์เข้าถึง' })
useHead({ title: 'ไม่มีสิทธิ์เข้าถึง' })
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center py-8">
    <UiCard class="w-full text-center">
      <span class="mx-auto grid size-14 place-items-center rounded-full bg-danger-soft text-danger"><ShieldX :size="28" aria-hidden="true" /></span>
      <h2 class="mt-5 text-2xl font-bold tracking-tight text-ink">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
      <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">บัญชีของคุณไม่มีสิทธิ์ใช้งานหน้านี้ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อเจ้าหน้าที่ผู้ดูแลระบบ</p>
      <NuxtLink to="/" class="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-primary bg-primary px-4 text-sm font-semibold text-ink hover:border-primary-hover hover:bg-primary-hover">
        <ArrowLeft :size="17" aria-hidden="true" />
        กลับหน้าหลัก
      </NuxtLink>
    </UiCard>
  </div>
</template>
