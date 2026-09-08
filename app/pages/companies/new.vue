<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import type { CompanyInput } from '~/composables/useSupervisionGroups'

definePageMeta({ title: 'เพิ่มสถานประกอบการ', middleware: 'company-prototype', alias: ['/staff/companies/new', '/lecturer/companies/new'] })
useHead({ title: 'เพิ่มสถานประกอบการ' })

const { createCompany } = useSupervisionGroups()
const { scenario } = useScenario()
const { showToast } = useToast()
const isSubmitting = ref(false)
const companyBasePath = computed(() => scenario.value.role === 'lecturer' ? '/lecturer/companies' : '/staff/companies')
const submit = async (input: CompanyInput) => {
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const company = createCompany(input)
    showToast({ title: 'เพิ่มสถานประกอบการแล้ว', description: `${company.id} · ${company.name}` })
    await navigateTo(`${companyBasePath.value}/${company.id}`)
  } catch {
    showToast({ title: 'เพิ่มสถานประกอบการไม่สำเร็จ', description: 'กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <button type="button" class="mb-4 inline-flex min-h-10 items-center gap-2 rounded-control px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-ink" @click="navigateTo(companyBasePath)"><ArrowLeft :size="17" aria-hidden="true" />กลับไปข้อมูลสถานประกอบการ</button>
    <header class="mb-6"><p class="text-sm font-semibold text-primary">ข้อมูลกลาง</p><h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">เพิ่มสถานประกอบการ</h2><p class="mt-1 text-sm leading-6 text-muted">ข้อมูลนี้นำกลับมาใช้กับคำร้องและการจัดกลุ่มนิเทศได้</p></header>
    <UiCard><CompanyForm :submitting="isSubmitting" submit-label="บันทึกสถานประกอบการ" @submit="submit" @cancel="navigateTo(companyBasePath)" /></UiCard>
  </div>
</template>
