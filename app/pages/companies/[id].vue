<script setup lang="ts">
import { ArrowLeft, Building2, Pencil, RotateCcw, Search, Trash2, UserRoundCheck } from '@lucide/vue'
import { z } from 'zod'
import type { CompanyInput, SupervisionPlacement } from '~/composables/useSupervisionGroups'

definePageMeta({ title: 'รายละเอียดสถานประกอบการ', middleware: 'company-prototype', alias: ['/staff/companies/:id', '/lecturer/companies/:id'] })

const route = useRoute()
const { scenario } = useScenario()
const {
  getCompanyRecord, getCompanyPlacements, getStudentProfile, updateCompanyStudent,
  loadPersistedCompanies, persistUpdateCompany, persistCompanyStatus,
} = useSupervisionGroups()
const { status: companiesFetchStatus, error: companiesFetchError, refresh: refreshCompanies } = await useAsyncData('company-records', loadPersistedCompanies)
const { cycles, cycleCatalog } = useCoopCycles()
const selectableCycleIds = new Set(cycles.map(cycle => cycle.id))
const { showToast } = useToast()
const companyId = computed(() => String(route.params.id))
const company = computed(() => getCompanyRecord(companyId.value))
const placements = computed(() => company.value ? getCompanyPlacements(company.value.id) : [])
const selectablePlacements = computed(() => placements.value.filter(placement => selectableCycleIds.has(placement.cycleId)))
const effectiveViewState = computed(() => scenario.value.forceError || companiesFetchError.value
  ? 'error'
  : companiesFetchStatus.value === 'pending' ? 'loading' : scenario.value.viewState)
const companyBasePath = computed(() => scenario.value.role === 'lecturer' ? '/lecturer/companies' : '/staff/companies')
const isSaving = ref(false)
const companyDialogOpen = ref(false)
const studentSearch = ref('')
const studentCycleFilter = ref('all')
const studentCohortFilter = ref('all')
const studentSectionFilter = ref('all')
const selectedPlacement = ref<SupervisionPlacement | null>(null)
const studentDialogOpen = computed({
  get: () => selectedPlacement.value !== null,
  set: value => { if (!value) selectedPlacement.value = null },
})
const studentForm = reactive({ prefix: 'นาย', firstName: '', lastName: '', section: 'หมู่ 1', position: '' })
const studentErrors = reactive<Partial<Record<keyof typeof studentForm, string>>>({})
const studentSchema = z.object({
  prefix: z.enum(personPrefixValues, { error: 'กรุณาเลือกคำนำหน้า' }),
  firstName: z.string().trim().min(1, 'กรุณากรอกชื่อ').max(100, 'ชื่อต้องไม่เกิน 100 ตัวอักษร'),
  lastName: z.string().trim().min(1, 'กรุณากรอกนามสกุล').max(100, 'นามสกุลต้องไม่เกิน 100 ตัวอักษร'),
  section: z.enum(studentSectionValues, { error: 'กรุณาเลือกหมู่เรียน' }),
  position: z.string().trim().min(1, 'กรุณากรอกตำแหน่งฝึกงาน').max(150, 'ตำแหน่งต้องไม่เกิน 150 ตัวอักษร'),
})
const companyInitialValue = computed<CompanyInput>(() => company.value
  ? { name: company.value.name, branch: company.value.branch, province: company.value.province, region: company.value.region, address: company.value.address, contactName: company.value.contactName, contactPhone: company.value.contactPhone, latitude: company.value.latitude, longitude: company.value.longitude }
  : { name: '', branch: '', province: '', region: '', address: '', contactName: '', contactPhone: '' })
const formatCycleLabel = (cycleId: string) => {
  return cycleCatalog.find(item => item.id === cycleId)?.label ?? cycleId
}
const formatCompactCycleLabel = (cycleId: string) => formatCycleLabel(cycleId)
  .replace('ภาคเรียนที่ ', 'ภาค ')
  .replace('ภาคฤดูร้อน', 'ฤดูร้อน')
const studentCycleOptions = computed(() => [
  { value: 'all', label: 'ทุกรอบสหกิจ' },
  ...[...new Set(selectablePlacements.value.map(placement => placement.cycleId))]
    .filter(cycleId => selectableCycleIds.has(cycleId))
    .map(cycleId => ({ value: cycleId, label: formatCompactCycleLabel(cycleId) })),
])
const studentCohortOptions = computed(() => [
  { value: 'all', label: 'ทุกรุ่น' },
  ...[...new Set(selectablePlacements.value.map(placement => getStudentCohortYear(placement.studentId)))]
    .toSorted((a, b) => b.localeCompare(a, 'th'))
    .map(cohort => ({ value: cohort, label: `รุ่น ${cohort}` })),
])
const studentSectionOptions = computed(() => [
  { value: 'all', label: 'ทุกหมู่เรียน' },
  ...[...new Set(selectablePlacements.value.map(placement => getStudentProfile(placement.studentId).section))]
    .toSorted((a, b) => a.localeCompare(b, 'th', { numeric: true }))
    .map(section => ({ value: section, label: section })),
])
const hasStudentFilters = computed(() => Boolean(studentSearch.value.trim())
  || studentCycleFilter.value !== 'all'
  || studentCohortFilter.value !== 'all'
  || studentSectionFilter.value !== 'all')
const visiblePlacements = computed(() => {
  const keyword = studentSearch.value.trim().toLocaleLowerCase('th')
  return selectablePlacements.value.filter((placement) => {
    const profile = getStudentProfile(placement.studentId)
    const matchesSearch = !keyword || [placement.studentId, `${profile.prefix}${placement.studentName}`, placement.position, profile.section, placement.cycleId, formatCycleLabel(placement.cycleId)]
      .some(value => value.toLocaleLowerCase('th').includes(keyword))
    return matchesSearch
      && (studentCycleFilter.value === 'all' || placement.cycleId === studentCycleFilter.value)
      && (studentCohortFilter.value === 'all' || getStudentCohortYear(placement.studentId) === studentCohortFilter.value)
      && (studentSectionFilter.value === 'all' || profile.section === studentSectionFilter.value)
  })
})
const resetStudentFilters = () => {
  studentSearch.value = ''
  studentCycleFilter.value = 'all'
  studentCohortFilter.value = 'all'
  studentSectionFilter.value = 'all'
}
watchEffect(() => {
  if (!studentCycleOptions.value.some(option => option.value === studentCycleFilter.value)) studentCycleFilter.value = 'all'
  if (!studentCohortOptions.value.some(option => option.value === studentCohortFilter.value)) studentCohortFilter.value = 'all'
  if (!studentSectionOptions.value.some(option => option.value === studentSectionFilter.value)) studentSectionFilter.value = 'all'
})

watch(company, value => { if (value) useHead({ title: `${value.name} · สถานประกอบการ` }) }, { immediate: true })
const retry = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
  void refreshCompanies()
}
const saveCompany = async (input: CompanyInput) => {
  if (!company.value || isSaving.value) return
  isSaving.value = true
  try {
    await persistUpdateCompany(company.value, input)
    showToast({ title: 'บันทึกข้อมูลสถานประกอบการแล้ว', description: company.value.name })
    companyDialogOpen.value = false
  } catch {
    showToast({ title: 'บันทึกข้อมูลไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' })
  } finally {
    isSaving.value = false
  }
}
const openStudent = (placement: SupervisionPlacement) => {
  const [firstName = placement.studentName, lastName = ''] = placement.studentName.split(' ')
  const profile = getStudentProfile(placement.studentId)
  Object.assign(studentForm, { prefix: profile.prefix, firstName, lastName, section: profile.section === 'ยังไม่กำหนด' ? 'หมู่ 1' : profile.section, position: placement.position })
  Object.assign(studentErrors, { prefix: undefined, firstName: undefined, lastName: undefined, section: undefined, position: undefined })
  selectedPlacement.value = placement
}
const saveStudent = async () => {
  if (!selectedPlacement.value || isSaving.value) return
  Object.assign(studentErrors, { prefix: undefined, firstName: undefined, lastName: undefined, section: undefined, position: undefined })
  const result = studentSchema.safeParse(studentForm)
  if (!result.success) {
    result.error.issues.forEach((issue) => { studentErrors[issue.path[0] as keyof typeof studentForm] = issue.message })
    return
  }
  isSaving.value = true
  try {
    updateCompanyStudent(selectedPlacement.value.id, result.data)
    showToast({ title: 'บันทึกข้อมูลนักศึกษาแล้ว', description: selectedPlacement.value.studentId })
    selectedPlacement.value = null
  } catch {
    showToast({ title: 'บันทึกข้อมูลนักศึกษาไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' })
  } finally {
    isSaving.value = false
  }
}
const handleDeactivate = async () => {
  if (!company.value) return
  try {
    await persistCompanyStatus(company.value, 'inactive')
    showToast({ title: 'ยุติการใช้งานสถานประกอบการแล้ว', description: 'ข้อมูลและประวัตินักศึกษายังคงอยู่' })
  }
  catch { showToast({ title: 'เปลี่ยนสถานะไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' }) }
}
const handleRestore = async () => {
  if (!company.value) return
  try {
    await persistCompanyStatus(company.value, 'active')
    showToast({ title: 'เปิดใช้งานสถานประกอบการแล้ว', description: company.value.name })
  }
  catch { showToast({ title: 'เปลี่ยนสถานะไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' }) }
}
const handleDelete = async () => {
  if (!company.value) return
  try {
    await persistCompanyStatus(company.value, 'inactive')
    showToast({ title: 'ยุติการใช้งานสถานประกอบการแล้ว', description: 'เก็บข้อมูลเดิมไว้เพื่อรักษาประวัติอ้างอิง' })
  }
  catch { showToast({ title: 'เปลี่ยนสถานะไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' }) }
}
</script>

<template>
  <div>
    <button type="button" class="mb-4 inline-flex min-h-10 items-center gap-2 rounded-control px-2 text-sm font-semibold text-muted hover:bg-surface hover:text-ink" @click="navigateTo(companyBasePath)"><ArrowLeft :size="17" aria-hidden="true" />กลับไปข้อมูลสถานประกอบการ</button>
    <div v-if="effectiveViewState === 'loading'" class="space-y-5" aria-label="กำลังโหลดรายละเอียดสถานประกอบการ"><UiSkeleton class="h-24" /><UiSkeleton class="h-96" /><UiSkeleton class="h-72" /></div>
    <AppErrorState v-else-if="effectiveViewState === 'error'" title="โหลดข้อมูลสถานประกอบการไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง" @retry="retry" />
    <AppEmptyState v-else-if="!company" title="ไม่พบสถานประกอบการ" description="รายการนี้อาจถูกลบหรือไม่มีอยู่ในข้อมูลตัวอย่าง"><UiButton variant="secondary" @click="navigateTo(companyBasePath)">กลับไปข้อมูลสถานประกอบการ</UiButton></AppEmptyState>
    <template v-else>
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p class="text-sm font-semibold text-primary">{{ company.id }} · {{ company.branch }}</p><h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ company.name }}</h2><p class="mt-1 text-sm leading-6 text-muted">{{ company.province }} · {{ company.region }}</p></div><UiBadge :tone="company.status === 'active' ? 'success' : 'neutral'">{{ company.status === 'active' ? 'ใช้งาน' : 'ยุติการใช้งาน' }}</UiBadge></header>

      <div class="grid gap-4 sm:grid-cols-3">
        <UiCard><p class="text-xs font-medium text-muted">นักศึกษาฝึกงาน</p><p class="mt-2 text-2xl font-bold text-ink">{{ selectablePlacements.length }} คน</p></UiCard>
        <UiCard><p class="text-xs font-medium text-muted">รอบสหกิจศึกษา</p><p class="mt-2 text-2xl font-bold text-ink">{{ new Set(placements.map(item => item.cycleId)).size }} รอบ</p></UiCard>
        <UiCard><p class="text-xs font-medium text-muted">ผู้ประสานงาน</p><p class="mt-2 font-bold text-ink">{{ company.contactName }}</p><p class="mt-1 text-sm text-muted">{{ company.contactPhone }}</p></UiCard>
      </div>

      <UiCard class="mt-6">
        <div class="flex flex-col gap-4 border-b border-divider pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3"><span class="grid size-10 shrink-0 place-items-center rounded-control bg-info-soft text-info"><Building2 :size="20" aria-hidden="true" /></span><div><h3 class="text-lg font-bold text-ink">รายละเอียดสถานประกอบการ</h3><p class="mt-0.5 text-sm text-muted">ข้อมูลสำหรับติดต่อและใช้ในการจัดกลุ่มนิเทศ</p></div></div>
          <UiButton class="shrink-0" variant="secondary" :icon="Pencil" @click="companyDialogOpen = true">แก้ไขข้อมูล</UiButton>
        </div>
        <dl class="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div class="sm:col-span-2"><dt class="text-xs font-medium text-muted">ชื่อสถานประกอบการ</dt><dd class="mt-1.5 font-semibold text-ink">{{ company.name }}</dd></div>
          <div><dt class="text-xs font-medium text-muted">สาขา</dt><dd class="mt-1.5 text-sm text-ink">{{ company.branch }}</dd></div>
          <div><dt class="text-xs font-medium text-muted">จังหวัด / ภูมิภาค</dt><dd class="mt-1.5 text-sm text-ink">{{ company.province }} · {{ company.region }}</dd></div>
          <div><dt class="text-xs font-medium text-muted">ผู้ประสานงาน</dt><dd class="mt-1.5 text-sm text-ink">{{ company.contactName }}</dd></div>
          <div><dt class="text-xs font-medium text-muted">เบอร์โทรศัพท์</dt><dd class="mt-1.5 text-sm text-ink">{{ company.contactPhone }}</dd></div>
          <div class="sm:col-span-2"><dt class="text-xs font-medium text-muted">ที่อยู่สถานประกอบการ</dt><dd class="mt-1.5 text-sm leading-6 text-ink">{{ company.address }}</dd></div>
        </dl>
      </UiCard>

      <UiDialog v-model:open="companyDialogOpen" size="xl" title="แก้ไขข้อมูลสถานประกอบการ" description="ข้อมูลที่แก้ไขจะถูกนำไปใช้กับการจัดกลุ่มและตารางนิเทศ">
        <CompanyForm :key="String(companyDialogOpen)" :initial-value="companyInitialValue" :submitting="isSaving" @submit="saveCompany" @cancel="companyDialogOpen = false" />
      </UiDialog>

      <UiCard class="mt-6" :padded="false">
        <div class="border-b border-divider p-5 sm:p-6"><div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h3 class="text-lg font-bold text-ink">นักศึกษาที่ฝึกงาน</h3><p class="mt-1 text-sm text-muted">รายชื่อนักศึกษาและประวัติการฝึกงานของสถานประกอบการ</p></div><UiBadge tone="info">{{ hasStudentFilters ? `${visiblePlacements.length} จาก ${selectablePlacements.length} คน` : `${selectablePlacements.length} คน` }}</UiBadge></div><div v-if="selectablePlacements.length" class="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div class="relative w-full lg:w-80 lg:flex-none"><Search class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" :size="18" aria-hidden="true" /><label for="company-student-search" class="sr-only">ค้นหานักศึกษา</label><input id="company-student-search" v-model="studentSearch" type="search" maxlength="100" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 text-sm text-ink placeholder:text-muted" placeholder="ค้นหารหัส ชื่อ หรือตำแหน่ง"></div><div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-[11rem_8rem_8rem_2.75rem] lg:w-auto"><UiSelect v-model="studentCycleFilter" :options="studentCycleOptions" label="กรองรอบสหกิจศึกษา" :label-visible="false" /><UiSelect v-model="studentCohortFilter" :options="studentCohortOptions" label="กรองรุ่นนักศึกษา" :label-visible="false" /><UiSelect v-model="studentSectionFilter" :options="studentSectionOptions" label="กรองหมู่เรียน" :label-visible="false" /><button type="button" class="grid size-11 shrink-0 place-self-end place-items-center rounded-control border border-divider text-muted hover:bg-surface hover:text-ink sm:place-self-auto" aria-label="รีเซ็ตตัวกรองนักศึกษา" title="รีเซ็ตตัวกรอง" @click="resetStudentFilters"><RotateCcw :size="17" aria-hidden="true" /></button></div></div></div>
        <div v-if="!selectablePlacements.length" class="p-5 sm:p-6"><AppEmptyState title="ยังไม่มีประวัตินักศึกษาฝึกงาน" description="เมื่อนักศึกษาได้รับการยืนยันสถานที่ฝึกงาน รายชื่อจะแสดงในส่วนนี้" /></div>
        <div v-else-if="!visiblePlacements.length" class="p-5 sm:p-6"><AppEmptyState title="ไม่พบนักศึกษาที่ตรงกับตัวกรอง" description="ลองเปลี่ยนคำค้นหา รอบสหกิจ รุ่น หรือหมู่เรียน"><UiButton v-if="hasStudentFilters" variant="secondary" @click="resetStudentFilters">ล้างตัวกรอง</UiButton></AppEmptyState></div>
        <template v-else>
          <div class="hidden overflow-x-auto md:block"><table class="w-full min-w-[960px] text-left text-sm"><caption class="sr-only">ประวัตินักศึกษาฝึกงานของสถานประกอบการนี้</caption><thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th scope="col" class="px-6 py-3">นักศึกษา</th><th scope="col" class="px-4 py-3">รุ่น</th><th scope="col" class="px-4 py-3">หมู่เรียน</th><th scope="col" class="px-4 py-3">ตำแหน่งฝึกงาน</th><th scope="col" class="px-4 py-3">รอบสหกิจศึกษา</th><th scope="col" class="w-20 px-4 py-3"><span class="sr-only">แก้ไข</span></th></tr></thead><tbody class="divide-y divide-divider"><tr v-for="placement in visiblePlacements" :key="placement.id" class="hover:bg-surface/70"><td class="px-6 py-4"><p class="font-semibold text-ink">{{ getStudentProfile(placement.studentId).prefix }}{{ placement.studentName }}</p><p class="mt-1 text-xs text-muted">{{ placement.studentId }}</p></td><td class="whitespace-nowrap px-4 py-4 text-ink">{{ getStudentCohortYear(placement.studentId) }}</td><td class="whitespace-nowrap px-4 py-4 text-ink">{{ getStudentProfile(placement.studentId).section }}</td><td class="px-4 py-4 text-ink">{{ placement.position }}</td><td class="whitespace-nowrap px-4 py-4 text-muted">{{ formatCycleLabel(placement.cycleId) }}</td><td class="px-4 py-4 text-right"><button type="button" class="inline-grid size-9 place-items-center rounded-control text-muted hover:bg-surface hover:text-ink" :aria-label="`แก้ไข ${placement.studentId}`" title="แก้ไขข้อมูลนักศึกษา" @click="openStudent(placement)"><Pencil :size="16" aria-hidden="true" /></button></td></tr></tbody></table></div>
          <div class="divide-y divide-divider md:hidden"><article v-for="placement in visiblePlacements" :key="placement.id" class="p-5"><div class="flex items-start justify-between gap-3"><div><h4 class="font-semibold text-ink">{{ getStudentProfile(placement.studentId).prefix }}{{ placement.studentName }}</h4><p class="mt-1 text-xs text-muted">{{ placement.studentId }} · รุ่น {{ getStudentCohortYear(placement.studentId) }} · {{ getStudentProfile(placement.studentId).section }}</p></div><button type="button" class="inline-grid size-9 shrink-0 place-items-center rounded-control border border-divider text-muted" :aria-label="`แก้ไข ${placement.studentId}`" @click="openStudent(placement)"><Pencil :size="16" aria-hidden="true" /></button></div><p class="mt-3 text-sm text-ink">{{ placement.position }}</p><p class="mt-1 text-xs text-muted">{{ formatCycleLabel(placement.cycleId) }}</p></article></div>
        </template>
      </UiCard>

      <UiCard class="mt-6"><h3 class="text-lg font-bold text-ink">สถานะข้อมูล</h3><p class="mt-1 text-sm leading-6 text-muted">ระบบเก็บประวัติไว้และใช้การยุติการใช้งานแทนการลบถาวร</p><div class="mt-5 flex flex-wrap gap-2"><UiButton v-if="company.status === 'inactive'" variant="secondary" :icon="UserRoundCheck" @click="handleRestore">เปิดใช้งานอีกครั้ง</UiButton><UiDialog v-if="company.status === 'active' && placements.length" title="ยุติการใช้งานสถานประกอบการ" description="สถานประกอบการจะไม่ถูกเลือกสำหรับรายการใหม่ แต่ข้อมูลนักศึกษาและประวัติเดิมยังคงอยู่"><template #trigger><UiButton variant="danger" :icon="Trash2">ยุติการใช้งาน</UiButton></template><template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template><template #confirm><UiButton variant="danger" @click="handleDeactivate">ยืนยันยุติการใช้งาน</UiButton></template></UiDialog><UiDialog v-if="!placements.length && company.status === 'active'" title="ยุติการใช้งานสถานประกอบการ" description="รายการจะไม่ถูกเลือกสำหรับงานใหม่ และสามารถเปิดใช้งานกลับมาได้ภายหลัง"><template #trigger><UiButton variant="danger" :icon="Trash2">ยุติการใช้งาน</UiButton></template><template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template><template #confirm><UiButton variant="danger" @click="handleDelete">ยืนยันยุติการใช้งาน</UiButton></template></UiDialog></div></UiCard>

      <UiDialog v-model:open="studentDialogOpen" size="lg" :title="`แก้ไขข้อมูลนักศึกษา ${selectedPlacement?.studentId ?? ''}`" description="ข้อมูลที่แก้ไขจะแสดงทั้งในหน้าสถานประกอบการและตารางนิเทศ">
        <form novalidate @submit.prevent="saveStudent"><div class="grid gap-5 sm:grid-cols-2"><div><UiSelect v-model="studentForm.prefix" :options="personPrefixOptions.student" label="คำนำหน้า" :error="studentErrors.prefix" required /></div><div><UiSelect v-model="studentForm.section" :options="studentSectionValues.map(value => ({ value, label: value }))" label="หมู่เรียน" :error="studentErrors.section" required /></div><div><UiInput v-model="studentForm.firstName" label="ชื่อ" :error="studentErrors.firstName" required /></div><div><UiInput v-model="studentForm.lastName" label="นามสกุล" :error="studentErrors.lastName" required /></div><div class="sm:col-span-2"><UiInput v-model="studentForm.position" label="ตำแหน่งฝึกงาน" :error="studentErrors.position" required /></div></div><div class="mt-6 flex justify-end gap-2 border-t border-divider pt-5"><UiButton variant="ghost" :disabled="isSaving" @click="selectedPlacement = null">ยกเลิก</UiButton><UiButton type="submit" :loading="isSaving">บันทึกข้อมูลนักศึกษา</UiButton></div></form>
      </UiDialog>
    </template>
  </div>
</template>
