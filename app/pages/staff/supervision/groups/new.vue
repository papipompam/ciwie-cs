<script setup lang="ts">
import { ArrowLeft, Building2, Check, Save, Search, UsersRound } from '@lucide/vue'
import { z } from 'zod'
import type { SupervisionCompany } from '~/composables/useSupervisionGroups'

definePageMeta({ title: 'สร้างกลุ่มอาจารย์นิเทศ', middleware: 'staff-prototype' })
useHead({ title: 'สร้างกลุ่มอาจารย์นิเทศ' })

const { showToast } = useToast()
const { people } = usePeopleDirectory()
const { getUnassignedCompanies, getAssignedLecturerIds, createGroup } = useSupervisionGroups()
const { cycleId, round, selectedCycleLabel } = useSupervisionContext()
const name = ref('')
const lecturerIds = ref<string[]>([])
const companyIds = ref<string[]>([])
const companySearch = ref('')
const studentDialogOpen = ref(false)
const selectedCompanyForStudents = ref<SupervisionCompany | null>(null)
const errors = ref<Record<string, string>>({})
const isSaving = ref(false)

const assignedLecturerIds = computed(() => getAssignedLecturerIds(cycleId.value, round.value))
const lecturerCandidates = computed(() => people.value.filter(person => person.type === 'lecturer'
  && person.recordStatus === 'active'
  && !['suspended', 'terminated'].includes(person.accountStatus)
  && !assignedLecturerIds.value.has(person.id)))
const availableCompanies = computed(() => getUnassignedCompanies(cycleId.value, round.value))
const filteredCompanies = computed(() => {
  const keyword = companySearch.value.trim().toLocaleLowerCase('th')
  return availableCompanies.value.filter(company => !keyword
    || [company.name, company.branch, company.province, company.region].some(value => value.toLocaleLowerCase('th').includes(keyword)))
})
const selectedCompanies = computed(() => availableCompanies.value.filter(company => companyIds.value.includes(company.id)))
const selectedStudentCount = computed(() => selectedCompanies.value.reduce((total, company) => total + company.studentCount, 0))

const schema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อกลุ่ม'),
  lecturerIds: z.array(z.string()),
  companyIds: z.array(z.string()).min(1, 'กรุณาเลือกสถานประกอบการอย่างน้อย 1 แห่ง'),
})

watch([cycleId, round], () => {
  lecturerIds.value = []
  companyIds.value = []
  companySearch.value = ''
  errors.value = {}
})
watch(name, () => {
  if (errors.value.name) errors.value = { ...errors.value, name: '' }
})

const toggleSelection = (target: 'lecturer' | 'company', id: string, checked: boolean | 'indeterminate') => {
  const selection = target === 'lecturer' ? lecturerIds : companyIds
  selection.value = checked ? [...new Set([...selection.value, id])] : selection.value.filter(item => item !== id)
  const errorKey = target === 'lecturer' ? 'lecturerIds' : 'companyIds'
  errors.value = { ...errors.value, [errorKey]: '' }
}

const openStudentDialog = (company: SupervisionCompany) => {
  selectedCompanyForStudents.value = company
  studentDialogOpen.value = true
}

const submit = async () => {
  if (isSaving.value) return
  errors.value = {}
  const result = schema.safeParse({ name: name.value, lecturerIds: lecturerIds.value, companyIds: companyIds.value })
  if (!result.success) {
    result.error.issues.forEach((issue) => { errors.value[String(issue.path[0])] = issue.message })
    return
  }
  isSaving.value = true
  try {
    const group = createGroup({
      cycleId: cycleId.value,
      round: round.value,
      name: result.data.name,
      lecturerIds: result.data.lecturerIds,
      companyIds: result.data.companyIds,
    })
    showToast({
      title: 'สร้างกลุ่มอาจารย์แล้ว',
      description: `${group.name} · อาจารย์ ${group.lecturerIds.length} คน · สถานประกอบการ ${group.companyIds.length} แห่ง`,
    })
    await navigateTo({ path: '/staff/supervision/groups', query: { cycle: cycleId.value, round: String(round.value) } })
  }
  catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : ''
    errors.value.form = message === 'lecturer-already-assigned'
      ? 'อาจารย์บางคนอยู่ในกลุ่มอื่นของการนิเทศครั้งนี้แล้ว กรุณาเลือกรายชื่อใหม่'
      : message === 'company-already-assigned'
        ? 'สถานประกอบการบางแห่งถูกมอบหมายให้กลุ่มอื่นแล้ว กรุณาเลือกรายการใหม่'
        : 'บันทึกกลุ่มไม่สำเร็จ กรุณาลองอีกครั้ง'
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <form novalidate @submit.prevent="submit">
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <button type="button" class="mb-3 inline-flex min-h-9 items-center gap-2 rounded-control text-sm font-semibold text-muted hover:text-ink" @click="navigateTo('/staff/supervision/groups')">
          <ArrowLeft :size="17" aria-hidden="true" />กลับไปหน้าจัดกลุ่มอาจารย์
        </button>
        <h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">สร้างกลุ่มอาจารย์นิเทศ</h2>
        <p class="mt-1 text-sm leading-6 text-muted">เลือกสถานประกอบการเพื่อสร้างกลุ่มด้วยตนเอง โดยเพิ่มอาจารย์ตอนนี้หรือภายหลังได้</p>
      </div>
      <UiButton type="submit" :icon="Save" :loading="isSaving">บันทึกกลุ่ม</UiButton>
    </div>

    <UiAlert v-if="errors.form" class="mb-6" tone="danger" title="บันทึกกลุ่มไม่สำเร็จ">{{ errors.form }}</UiAlert>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div class="space-y-6">
        <UiCard>
          <div class="flex items-start gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-full bg-warning-soft font-bold text-warning">1</span>
            <div><h3 class="text-lg font-bold text-ink">จัดกลุ่มอาจารย์</h3><p class="mt-1 text-sm text-muted">กำหนดชื่อกลุ่มและเลือกอาจารย์ว่าแต่ละคนอยู่กลุ่มใด</p></div>
          </div>
          <div class="mt-5"><UiInput v-model="name" label="ชื่อกลุ่มอาจารย์" placeholder="เช่น กลุ่มอาจารย์ 2" :error="errors.name" required /></div>

          <fieldset class="mt-5">
            <legend class="text-sm font-semibold text-ink">อาจารย์ในกลุ่ม (เพิ่มภายหลังได้)</legend>
            <p class="mt-1 text-xs text-muted">แสดงเฉพาะอาจารย์ที่ยังไม่อยู่ในกลุ่มอื่นของการนิเทศครั้งนี้</p>
            <template v-if="lecturerCandidates.length">
              <div class="mt-3 hidden overflow-hidden rounded-control border border-divider md:block">
                <table class="w-full table-fixed border-collapse text-left text-sm">
                  <caption class="sr-only">รายชื่ออาจารย์ที่เลือกเข้ากลุ่ม</caption>
                  <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
                    <tr><th scope="col" class="w-14 px-4 py-3"><span class="sr-only">เลือก</span></th><th scope="col" class="w-40 px-4 py-3">รหัสอาจารย์</th><th scope="col" class="px-4 py-3">ชื่อ–นามสกุล</th><th scope="col" class="w-36 px-4 py-3 text-right">สถานะบัญชี</th></tr>
                  </thead>
                  <tbody class="divide-y divide-divider">
                    <tr v-for="lecturer in lecturerCandidates" :key="lecturer.id" class="hover:bg-surface/70">
                      <td class="px-4 py-4"><UiCheckbox :model-value="lecturerIds.includes(lecturer.id)" :label="`เลือก ${getPersonFullName(lecturer)}`" @update:model-value="toggleSelection('lecturer', lecturer.id, $event)" /></td>
                      <td class="px-4 py-4 text-muted">{{ lecturer.id }}</td>
                      <td class="px-4 py-4 font-semibold text-ink">{{ getPersonFullName(lecturer) }}</td>
                      <td class="px-4 py-4 text-right"><UiBadge tone="success">ใช้งาน</UiBadge></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="mt-3 divide-y divide-divider overflow-hidden rounded-control border border-divider md:hidden">
                <div v-for="lecturer in lecturerCandidates" :key="lecturer.id" class="flex items-start gap-3 p-4">
                  <UiCheckbox :model-value="lecturerIds.includes(lecturer.id)" :label="`เลือก ${getPersonFullName(lecturer)}`" @update:model-value="toggleSelection('lecturer', lecturer.id, $event)" />
                  <div class="min-w-0 flex-1"><div class="flex items-start justify-between gap-3"><p class="font-semibold text-ink">{{ getPersonFullName(lecturer) }}</p><UiBadge tone="success">ใช้งาน</UiBadge></div><p class="mt-1 text-xs text-muted">{{ lecturer.id }}</p></div>
                </div>
              </div>
            </template>
            <p v-else class="mt-3 rounded-control bg-surface p-4 text-sm text-muted">อาจารย์ทุกคนอยู่ในกลุ่มของการนิเทศครั้งนี้แล้ว</p>
            <p v-if="errors.lecturerIds" class="mt-2 text-xs font-medium text-danger">{{ errors.lecturerIds }}</p>
          </fieldset>
        </UiCard>

        <UiCard :padded="false">
          <div class="border-b border-divider p-5 sm:p-6">
            <div class="flex items-start gap-3">
              <span class="grid size-10 shrink-0 place-items-center rounded-full bg-warning-soft font-bold text-warning">2</span>
              <div><h3 class="text-lg font-bold text-ink">เลือกสถานประกอบการของกลุ่ม</h3><p class="mt-1 text-sm text-muted">หนึ่งสถานประกอบการมอบหมายได้หนึ่งกลุ่มต่อครั้ง จำนวนนักศึกษาคำนวณจากผู้ที่ยืนยันสถานที่แล้ว</p></div>
            </div>
            <label class="mt-5 block w-full text-sm font-semibold text-ink sm:max-w-md">
              <span class="sr-only">ค้นหาสถานประกอบการ</span>
              <span class="relative block"><Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" /><input v-model="companySearch" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" placeholder="ค้นหาชื่อ สาขา จังหวัด หรือภูมิภาค"></span>
            </label>
            <p v-if="errors.companyIds" class="mt-3 text-xs font-medium text-danger">{{ errors.companyIds }}</p>
          </div>

          <div v-if="!filteredCompanies.length" class="p-5 sm:p-6">
            <AppEmptyState :title="companySearch ? 'ไม่พบสถานประกอบการที่ค้นหา' : 'ไม่มีสถานประกอบการรอมอบหมาย'" :description="companySearch ? 'ลองเปลี่ยนคำค้นหา' : 'สถานประกอบการที่มีนักศึกษาฝึกงานถูกมอบหมายครบแล้ว'" />
          </div>
          <template v-else>
            <div class="hidden overflow-x-auto md:block">
              <table class="w-full min-w-[820px] border-collapse text-left text-sm">
                <caption class="sr-only">สถานประกอบการที่เลือกให้กลุ่มอาจารย์รับผิดชอบ</caption>
                <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th scope="col" class="w-14 px-5 py-3 sm:px-6"><span class="sr-only">เลือก</span></th><th scope="col" class="px-4 py-3">สถานประกอบการ</th><th scope="col" class="px-4 py-3">พื้นที่</th><th scope="col" class="px-4 py-3 text-right">นักศึกษา</th><th scope="col" class="w-28 px-4 py-3 text-right"><span class="sr-only">ดูข้อมูล</span></th></tr></thead>
                <tbody class="divide-y divide-divider"><tr v-for="company in filteredCompanies" :key="company.id" class="hover:bg-surface/70"><td class="px-5 py-4 sm:px-6"><UiCheckbox :model-value="companyIds.includes(company.id)" :label="`เลือก ${company.name}`" @update:model-value="toggleSelection('company', company.id, $event)" /></td><td class="px-4 py-4"><p class="font-semibold text-ink">{{ company.name }}</p><p class="mt-1 text-xs text-muted">{{ company.branch }}</p></td><td class="px-4 py-4"><p class="text-ink">{{ company.province }}</p><p class="mt-1 text-xs text-muted">{{ company.region }}</p></td><td class="px-4 py-4 text-right font-semibold text-ink">{{ company.studentCount }} คน</td><td class="px-4 py-4 text-right"><button type="button" class="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-control border border-divider bg-canvas px-3 text-xs font-semibold text-ink hover:bg-surface" :aria-label="`ดูข้อมูล ${company.name}`" @click="openStudentDialog(company)">ดูข้อมูล</button></td></tr></tbody>
              </table>
            </div>
            <div class="divide-y divide-divider md:hidden">
              <article v-for="company in filteredCompanies" :key="company.id" class="flex items-start gap-3 p-5"><UiCheckbox :model-value="companyIds.includes(company.id)" :label="`เลือก ${company.name}`" @update:model-value="toggleSelection('company', company.id, $event)" /><div class="min-w-0 flex-1"><p class="font-semibold text-ink">{{ company.name }}</p><p class="mt-1 text-xs text-muted">{{ company.branch }} · {{ company.province }}</p><div class="mt-3 flex items-center justify-between gap-3"><p class="text-sm font-semibold text-ink">นักศึกษา {{ company.studentCount }} คน</p><UiButton size="sm" variant="secondary" @click="openStudentDialog(company)">ดูข้อมูล</UiButton></div></div></article>
            </div>
          </template>
        </UiCard>
      </div>

      <aside>
        <UiCard class="xl:sticky xl:top-40">
          <div class="flex items-start gap-3"><span class="grid size-10 shrink-0 place-items-center rounded-control bg-info-soft text-info"><UsersRound :size="20" aria-hidden="true" /></span><div><h3 class="text-lg font-bold text-ink">สรุปการจัดกลุ่ม</h3><p class="mt-1 text-sm text-muted">ตรวจสอบก่อนบันทึก</p></div></div>
          <dl class="mt-5 space-y-3 text-sm">
            <div class="flex items-start justify-between gap-4"><dt class="text-muted">รอบ</dt><dd class="text-right font-semibold text-ink">{{ selectedCycleLabel }}</dd></div>
            <div class="flex items-start justify-between gap-4"><dt class="text-muted">ครั้งที่นิเทศ</dt><dd class="font-semibold text-ink">ครั้งที่ {{ round }}</dd></div>
            <div class="flex items-start justify-between gap-4"><dt class="text-muted">อาจารย์ในกลุ่ม</dt><dd class="font-semibold text-ink">{{ lecturerIds.length }} คน</dd></div>
            <div class="flex items-start justify-between gap-4"><dt class="text-muted">สถานประกอบการ</dt><dd class="font-semibold text-ink">{{ companyIds.length }} แห่ง</dd></div>
            <div class="flex items-start justify-between gap-4 border-t border-divider pt-3"><dt class="font-semibold text-ink">นักศึกษารวม</dt><dd class="text-xl font-bold text-ink">{{ selectedStudentCount }} คน</dd></div>
          </dl>
          <div v-if="selectedCompanies.length" class="mt-5 rounded-control bg-surface p-3"><div class="flex items-center gap-2 text-sm font-semibold text-ink"><Building2 :size="17" aria-hidden="true" />สถานประกอบการที่เลือก</div><ul class="mt-2 space-y-1 text-xs leading-5 text-muted"><li v-for="company in selectedCompanies" :key="company.id">{{ company.name }} — {{ company.studentCount }} คน</li></ul></div>
          <UiButton type="submit" class="mt-5 w-full" :icon="Check" :loading="isSaving">บันทึกกลุ่ม</UiButton>
        </UiCard>
      </aside>
    </div>

    <UiDialog v-model:open="studentDialogOpen" size="xl" :title="selectedCompanyForStudents?.name ?? 'รายชื่อนักศึกษา'" :description="selectedCompanyForStudents ? `${selectedCompanyForStudents.branch} · ${selectedCompanyForStudents.province} · นักศึกษา ${selectedCompanyForStudents.studentCount} คน` : undefined">
      <div v-if="selectedCompanyForStudents" class="overflow-hidden rounded-control border border-divider">
        <table class="hidden w-full table-fixed border-collapse text-left text-sm md:table">
          <caption class="sr-only">รายชื่อนักศึกษาของ {{ selectedCompanyForStudents.name }}</caption>
          <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th scope="col" class="w-48 px-4 py-3">รหัสนักศึกษา</th><th scope="col" class="w-64 px-4 py-3">ชื่อ–นามสกุล</th><th scope="col" class="px-4 py-3">ตำแหน่ง</th></tr></thead>
          <tbody class="divide-y divide-divider"><tr v-for="student in selectedCompanyForStudents.students" :key="student.id"><td class="whitespace-nowrap px-4 py-4 text-muted">{{ student.studentId }}</td><td class="px-4 py-4 font-semibold text-ink">{{ student.studentName }}</td><td class="px-4 py-4 text-muted">{{ student.position }}</td></tr></tbody>
        </table>
        <div class="divide-y divide-divider md:hidden">
          <article v-for="student in selectedCompanyForStudents.students" :key="student.id" class="p-4"><p class="font-semibold text-ink">{{ student.studentName }}</p><p class="mt-1 text-xs text-muted">{{ student.studentId }}</p><p class="mt-3 text-sm text-muted">ตำแหน่ง: {{ student.position }}</p></article>
        </div>
      </div>
      <template #cancel><UiButton variant="ghost">ปิด</UiButton></template>
    </UiDialog>
  </form>
</template>
