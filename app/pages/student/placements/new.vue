<script setup lang="ts">
import { ArrowDown, ArrowLeft, ArrowUp, Building2, Check, ChevronLeft, ChevronRight, CirclePlus, FileCheck2, RotateCcw, Save, Search, X } from '@lucide/vue'
import { format } from 'date-fns'
import { z } from 'zod'
import { getPageCount, paginateItems } from '~/utils/table'

definePageMeta({ title: 'แจ้งข้อมูลที่ฝึกงาน', middleware: 'student-prototype' })
useHead({ title: 'แจ้งข้อมูลที่ฝึกงาน' })

const route = useRoute()
const { scenario, recordEvent } = useScenario()
const { selectedCycle } = useCoopCycles()
const { companies, activeRequest, findRequest, findCompany, addCompany, saveRequest } = useStudentPlacements()
const { showToast } = useToast()

const editId = computed(() => typeof route.query.edit === 'string' ? route.query.edit : undefined)
const editingRequest = computed(() => {
  const request = editId.value ? findRequest(editId.value) : undefined
  return request && ['draft', 'submitted', 'returned'].includes(request.status) ? request : undefined
})
const isEditing = computed(() => Boolean(editingRequest.value))
const hasExistingActiveRequest = computed(() => !isEditing.value && Boolean(activeRequest.value))
const canUseForm = computed(() => isEditing.value || selectedCycle.value.status === 'open')
const activeCompany = computed(() => activeRequest.value ? findCompany(activeRequest.value.companyId) : undefined)
const companySearch = ref('')
const companyStatusFilter = ref('all')
const companySortDirection = ref<'asc' | 'desc'>('asc')
const companyPage = ref(1)
const companyPageSize = ref('10')
const companyDialogOpen = ref(false)
const reviewDialogOpen = ref(false)
const isSaving = ref(false)
const submitError = ref('')
const formErrors = ref<Record<string, string>>({})
const companyErrors = ref<Record<string, string>>({})

const today = format(new Date(), 'yyyy-MM-dd')
const form = reactive({
  companyId: editingRequest.value?.companyId ?? '',
  position: editingRequest.value?.position ?? '',
  details: editingRequest.value?.details ?? '',
  appliedAt: editingRequest.value?.appliedAt ?? today,
  recipientName: editingRequest.value?.recipientName ?? '',
  recipientRole: editingRequest.value?.recipientRole ?? '',
  letterAddress: editingRequest.value?.letterAddress ?? '',
})
const newCompany = reactive({ name: '', address: '', province: '' })

watch(companyDialogOpen, (open) => {
  if (open) return
  companyErrors.value = {}
  Object.assign(newCompany, { name: '', address: '', province: '' })
})

const placementSchema = z.object({
  companyId: z.string().min(1, 'กรุณาเลือกสถานประกอบการ'),
  position: z.string().trim().min(2, 'กรุณาระบุตำแหน่งฝึกงานอย่างน้อย 2 ตัวอักษร'),
  details: z.string().trim().max(1000, 'รายละเอียดต้องไม่เกิน 1,000 ตัวอักษร'),
  appliedAt: z.string().min(1, 'กรุณาเลือกวันที่สมัคร'),
  recipientName: z.string().trim().min(2, 'กรุณาระบุชื่อหรือตำแหน่งผู้รับหนังสือ'),
  recipientRole: z.string().trim().min(2, 'กรุณาระบุตำแหน่งหรือหน่วยงานของผู้รับ'),
  letterAddress: z.string().trim().min(10, 'กรุณาระบุที่อยู่สำหรับออกหนังสือให้ครบถ้วน'),
})
const companySchema = z.object({
  name: z.string().trim().min(2, 'กรุณาระบุชื่อสถานประกอบการ'),
  address: z.string().trim().min(10, 'กรุณาระบุที่อยู่ให้ครบถ้วน'),
  province: z.string().min(1, 'กรุณาเลือกจังหวัด'),
})
const provinceOptions = ['กรุงเทพมหานคร', 'บุรีรัมย์', 'นครราชสีมา', 'ขอนแก่น', 'เชียงใหม่', 'ชลบุรี', 'สงขลา', 'สุพรรณบุรี']
  .map(value => ({ value, label: value }))
const companyStatusOptions = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'active', label: companyStatusMeta.active.label },
  { value: 'pending', label: companyStatusMeta.pending.label },
  { value: 'inactive', label: companyStatusMeta.inactive.label },
]
const pageSizeOptions = [10, 20, 50, 100].map(value => ({ value: String(value), label: String(value) }))
const effectiveCompanyState = computed(() => scenario.value.forceError ? 'error' : scenario.value.viewState)

const availableCompanies = computed(() => {
  const keyword = companySearch.value.trim().toLocaleLowerCase('th')
  const source = scenario.value.dataSet === 'edge'
    ? companies.value.filter(company => company.status !== 'active')
    : companies.value
  return source
    .filter(company => companyStatusFilter.value === 'all' || company.status === companyStatusFilter.value)
    .filter(company => !keyword || [company.name, company.branch, company.address, company.province, company.region]
      .some(value => value.toLocaleLowerCase('th').includes(keyword)))
    .toSorted((a, b) => {
      const comparison = a.name.localeCompare(b.name, 'th')
      return companySortDirection.value === 'asc' ? comparison : -comparison
    })
})
const companyPageSizeNumber = computed(() => Number(companyPageSize.value))
const companyPageCount = computed(() => getPageCount(availableCompanies.value.length, companyPageSizeNumber.value))
const paginatedCompanies = computed(() => paginateItems(availableCompanies.value, companyPage.value, companyPageSizeNumber.value))
const companyResultStart = computed(() => availableCompanies.value.length ? (companyPage.value - 1) * companyPageSizeNumber.value + 1 : 0)
const companyResultEnd = computed(() => Math.min(companyPage.value * companyPageSizeNumber.value, availableCompanies.value.length))
const hasCompanyFilters = computed(() => Boolean(companySearch.value) || companyStatusFilter.value !== 'all')
const selectedCompany = computed(() => findCompany(form.companyId))

watch([companySearch, companyStatusFilter, companyPageSize], () => {
  companyPage.value = 1
})
watch(companyPageCount, (pageCount) => {
  if (companyPage.value > pageCount) companyPage.value = pageCount
})

const zodErrors = (error: z.ZodError) => Object.fromEntries(error.issues.map(issue => [String(issue.path[0]), issue.message]))
const selectCompany = (companyId: string) => {
  const company = findCompany(companyId)
  if (!company || company.status === 'inactive') return
  form.companyId = companyId
  formErrors.value.companyId = ''
}
const toggleCompanySort = () => {
  companySortDirection.value = companySortDirection.value === 'asc' ? 'desc' : 'asc'
  companyPage.value = 1
}
const clearCompanyFilters = () => {
  companySearch.value = ''
  companyStatusFilter.value = 'all'
}
const resetCompanyTable = () => {
  clearCompanyFilters()
  companySortDirection.value = 'asc'
  companyPageSize.value = '10'
  companyPage.value = 1
}
const retryCompanies = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
}
const formatReviewDate = (date: string) => new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date(`${date}T00:00:00+07:00`))
const createCompany = () => {
  const result = companySchema.safeParse(newCompany)
  if (!result.success) {
    companyErrors.value = zodErrors(result.error)
    return
  }
  companyErrors.value = {}
  const company = addCompany(result.data)
  form.companyId = company.id
  resetCompanyTable()
  companyDialogOpen.value = false
  recordEvent(`เพิ่มสถานประกอบการใหม่: ${company.name}`)
  showToast({ title: 'เพิ่มสถานประกอบการแล้ว', description: 'รายการมีสถานะรอเจ้าหน้าที่ตรวจสอบและถูกเลือกในคำร้องนี้' })
}

const validatePlacement = async () => {
  submitError.value = ''
  const result = placementSchema.safeParse(form)
  if (!result.success) {
    formErrors.value = zodErrors(result.error)
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return undefined
  }
  formErrors.value = {}
  return result.data
}

const reviewSubmission = async () => {
  const value = await validatePlacement()
  if (!value) return
  reviewDialogOpen.value = true
}

const submit = async (mode: 'draft' | 'submitted') => {
  if (isSaving.value) return
  const value = await validatePlacement()
  if (!value) return
  isSaving.value = true
  try {
    await new Promise(resolve => window.setTimeout(resolve, scenario.value.networkDelay === 'slow' ? 1500 : 450))
    if (scenario.value.forceError) throw new Error('mock-submit-error')
    const request = saveRequest(value, mode, editId.value)
    recordEvent(`${mode === 'submitted' ? 'ส่ง' : 'บันทึก'}คำร้อง ${request.id}`)
    showToast({
      title: mode === 'submitted' ? 'ส่งคำร้องแล้ว' : 'บันทึกฉบับร่างแล้ว',
      description: mode === 'submitted' ? 'อาจารย์จะตรวจสอบข้อมูลในขั้นตอนถัดไป' : 'คุณกลับมาแก้ไขและส่งภายหลังได้',
    })
    reviewDialogOpen.value = false
    await navigateTo(`/student/placements/${request.id}`)
  }
  catch (error) {
    console.error(error)
    submitError.value = error instanceof Error && error.message === 'active-placement-request-exists'
      ? 'คุณมีรอบหรือคำร้องที่กำลังดำเนินการอยู่แล้ว กรุณาดำเนินการรายการเดิมให้เสร็จสิ้น'
      : error instanceof Error && error.message === 'cycle-not-open'
        ? 'รอบสหกิจศึกษานี้ยังไม่เปิดรับคำร้องใหม่'
        : 'ไม่สามารถบันทึกคำร้องได้ในขณะนี้ ข้อมูลที่กรอกยังอยู่ครบ กรุณาลองอีกครั้ง'
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <button type="button" class="mb-4 inline-flex min-h-10 items-center gap-2 rounded-control text-sm font-medium text-muted hover:text-ink" @click="navigateTo(isEditing ? `/student/placements/${editId}` : '/student/applications')">
      <ArrowLeft :size="18" aria-hidden="true" /> กลับ{{ isEditing ? 'ไปหน้ารายละเอียด' : 'ไปหน้าสมัครและยืนยันที่ฝึกงาน' }}
    </button>

    <div class="mb-6">
      <h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ isEditing ? `แก้ไขข้อมูล ${editId}` : 'แจ้งข้อมูลที่ฝึกงาน' }}</h2>
      <p class="mt-1 text-sm leading-6 text-muted">กรอกข้อมูลสถานประกอบการและผู้รับหนังสือ เพื่อให้ผู้รับผิดชอบจัดทำหนังสือขอฝึกงานส่งกลับมาให้คุณ</p>
    </div>

    <UiCard v-if="hasExistingActiveRequest">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <UiBadge :tone="placementStatusMeta[activeRequest!.status].tone">{{ placementStatusMeta[activeRequest!.status].label }}</UiBadge>
            <span class="text-sm font-medium text-muted">{{ activeRequest!.id }}</span>
          </div>
          <h3 class="mt-3 text-lg font-bold text-ink">คุณแจ้งข้อมูลที่ฝึกงานแล้ว</h3>
          <p class="mt-1 text-sm leading-6 text-muted">{{ activeCompany?.name }} · {{ activeRequest!.position }}</p>
          <p class="mt-2 text-sm leading-6 text-muted">นักศึกษามีคำร้องที่กำลังดำเนินการได้ครั้งละหนึ่งรายการ หากต้องแก้ไขหรือส่งข้อมูลเพิ่มเติม ให้ดำเนินการจากคำร้องปัจจุบัน</p>
        </div>
        <UiButton class="shrink-0" :icon="FileCheck2" @click="navigateTo(`/student/placements/${activeRequest!.id}`)">ดูคำร้องปัจจุบัน</UiButton>
      </div>
    </UiCard>

    <UiAlert v-if="editingRequest?.returnReason" class="mb-5" tone="warning" title="เหตุผลที่อาจารย์ส่งกลับ">
      {{ editingRequest.returnReason }}
    </UiAlert>

    <UiAlert v-if="!hasExistingActiveRequest && !canUseForm" tone="warning" title="รอบนี้ยังไม่เปิดรับคำร้องใหม่">
      คุณสามารถดูบริบทรอบได้ แต่ยังสร้างคำร้องไม่ได้จนกว่าสถานะรอบจะเป็นเปิดยื่นสถานประกอบการ
    </UiAlert>

    <form v-if="!hasExistingActiveRequest && canUseForm" class="space-y-5" novalidate @submit.prevent="reviewSubmission">
      <UiCard :padded="false">
        <div class="border-b border-divider p-5 sm:p-6">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex items-start gap-3">
              <div class="grid size-10 shrink-0 place-items-center rounded-control bg-warning-soft text-warning"><Building2 :size="20" aria-hidden="true" /></div>
              <div><h3 class="font-semibold text-ink">1. เลือกสถานประกอบการ</h3><p class="mt-1 text-sm leading-6 text-muted">ค้นหาจากข้อมูลที่มีอยู่ก่อน หากไม่พบจึงเพิ่มข้อมูลหลักรายการใหม่</p></div>
            </div>
            <UiButton variant="secondary" :icon="CirclePlus" @click="companyDialogOpen = true">เพิ่มสถานประกอบการใหม่</UiButton>
          </div>

          <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label class="block w-full text-sm font-semibold text-ink sm:max-w-sm lg:w-96 lg:flex-none">
              <span class="sr-only">ค้นหาสถานประกอบการ</span>
              <span class="relative block">
                <Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input v-model="companySearch" type="search" class="min-h-11 w-full rounded-control border bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" :class="formErrors.companyId ? 'border-danger' : 'border-divider'" placeholder="ชื่อสถานประกอบการ ที่อยู่ หรือจังหวัด" :aria-invalid="Boolean(formErrors.companyId)" :aria-describedby="formErrors.companyId ? 'company-selection-error' : undefined">
              </span>
            </label>
            <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
              <div class="w-full sm:w-48"><UiSelect v-model="companyStatusFilter" :options="companyStatusOptions" label="กรองตามสถานะ" :label-visible="false" /></div>
              <button type="button" class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink transition-colors hover:bg-surface" aria-label="รีเซ็ตตารางสถานประกอบการ" title="รีเซ็ตตาราง" @click="resetCompanyTable"><RotateCcw :size="18" aria-hidden="true" /></button>
            </div>
          </div>

          <div v-if="hasCompanyFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span class="text-muted">ตัวกรองที่ใช้:</span>
            <span v-if="companySearch" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">คำค้น “{{ companySearch }}”</span>
            <span v-if="companyStatusFilter !== 'all'" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">{{ companyStatusOptions.find(option => option.value === companyStatusFilter)?.label }}</span>
            <button type="button" class="inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-semibold text-warning hover:bg-warning-soft" @click="clearCompanyFilters"><X :size="15" aria-hidden="true" />ล้างทั้งหมด</button>
          </div>
          <p v-if="formErrors.companyId" id="company-selection-error" class="mt-3 text-xs font-medium text-danger" role="alert">{{ formErrors.companyId }}</p>
        </div>

        <div v-if="effectiveCompanyState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดสถานประกอบการ">
          <div v-for="row in 4" :key="row" class="grid grid-cols-[1.4fr_1fr_8rem] gap-4 max-md:grid-cols-[1fr_6rem]"><UiSkeleton class="h-12" /><UiSkeleton class="h-12 max-md:hidden" /><UiSkeleton class="h-12" /></div>
        </div>
        <div v-else-if="effectiveCompanyState === 'error'" class="p-5 sm:p-6"><AppErrorState title="โหลดสถานประกอบการไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองดึงข้อมูลอีกครั้ง" @retry="retryCompanies" /></div>
        <div v-else-if="effectiveCompanyState === 'empty' || !paginatedCompanies.length" class="p-5 sm:p-6">
          <AppEmptyState :title="hasCompanyFilters ? 'ไม่พบสถานประกอบการที่ตรงกับตัวกรอง' : 'ยังไม่มีข้อมูลสถานประกอบการ'" :description="hasCompanyFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'เพิ่มข้อมูลสถานประกอบการใหม่เพื่อใช้ในคำร้องนี้'">
            <UiButton v-if="hasCompanyFilters" variant="secondary" @click="clearCompanyFilters">ล้างตัวกรอง</UiButton>
            <UiButton v-else :icon="CirclePlus" @click="companyDialogOpen = true">เพิ่มสถานประกอบการใหม่</UiButton>
          </AppEmptyState>
        </div>
        <template v-else>
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full min-w-[900px] border-collapse text-left text-sm">
              <caption class="sr-only">รายการสถานประกอบการสำหรับเลือกยื่นคำร้อง</caption>
              <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" class="w-16 px-4 py-3 text-center">เลือก</th>
                  <th scope="col" class="px-5 py-3 sm:px-6" :aria-sort="companySortDirection === 'asc' ? 'ascending' : 'descending'">
                    <button type="button" class="inline-flex items-center gap-1 font-semibold hover:text-ink" :aria-label="companySortDirection === 'asc' ? 'เรียงชื่อสถานประกอบการจาก ฮ ถึง ก' : 'เรียงชื่อสถานประกอบการจาก ก ถึง ฮ'" @click="toggleCompanySort">สถานประกอบการ <ArrowUp v-if="companySortDirection === 'asc'" :size="15" aria-hidden="true" /><ArrowDown v-else :size="15" aria-hidden="true" /></button>
                  </th>
                  <th scope="col" class="px-4 py-3">พื้นที่</th>
                  <th scope="col" class="px-4 py-3">ที่อยู่</th>
                  <th scope="col" class="px-4 py-3">สถานะ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-divider">
                <tr
                  v-for="company in paginatedCompanies"
                  :key="company.id"
                  class="transition-colors"
                  :class="[
                    form.companyId === company.id ? 'bg-warning-soft/60' : 'hover:bg-surface/70',
                    company.status === 'inactive' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                  ]"
                  :title="company.status === 'inactive' ? 'สถานประกอบการนี้ยุติการใช้งานแล้ว' : 'กดเพื่อเลือกสถานประกอบการนี้'"
                  @click="selectCompany(company.id)"
                >
                  <td class="px-4 py-4 text-center">
                    <input
                      type="radio"
                      name="selected-company"
                      class="size-5 cursor-pointer accent-primary disabled:cursor-not-allowed"
                      :checked="form.companyId === company.id"
                      :disabled="company.status === 'inactive'"
                      :aria-label="`เลือก ${company.name}`"
                      @click.stop
                      @change="selectCompany(company.id)"
                    >
                  </td>
                  <td class="px-5 py-4 sm:px-6"><p class="font-semibold text-ink">{{ company.name }}</p><p class="mt-1 text-xs text-muted">{{ company.branch }} · {{ company.id }}</p></td>
                  <td class="px-4 py-4"><p class="font-medium text-ink">{{ company.province }}</p><p class="mt-1 text-xs text-muted">{{ company.region }}</p></td>
                  <td class="max-w-xs px-4 py-4 text-muted"><p class="line-clamp-2 leading-5">{{ company.address }}</p></td>
                  <td class="px-4 py-4"><UiBadge :tone="companyStatusMeta[company.status].tone">{{ companyStatusMeta[company.status].label }}</UiBadge></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="divide-y divide-divider md:hidden">
            <article
              v-for="company in paginatedCompanies"
              :key="company.id"
              class="p-5 transition-colors"
              :class="[
                form.companyId === company.id ? 'bg-warning-soft/60' : 'hover:bg-surface/70',
                company.status === 'inactive' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              ]"
              :title="company.status === 'inactive' ? 'สถานประกอบการนี้ยุติการใช้งานแล้ว' : 'กดเพื่อเลือกสถานประกอบการนี้'"
              @click="selectCompany(company.id)"
            >
              <div class="flex items-start gap-3">
                <input type="radio" name="selected-company-mobile" class="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed" :checked="form.companyId === company.id" :disabled="company.status === 'inactive'" :aria-label="`เลือก ${company.name}`" @click.stop @change="selectCompany(company.id)">
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-3"><div class="min-w-0"><h4 class="font-semibold text-ink">{{ company.name }}</h4><p class="mt-1 text-xs text-muted">{{ company.branch }} · {{ company.id }}</p></div><UiBadge :tone="companyStatusMeta[company.status].tone">{{ companyStatusMeta[company.status].label }}</UiBadge></div>
                  <dl class="mt-4 grid gap-3 text-sm"><div><dt class="text-xs text-muted">พื้นที่</dt><dd class="mt-0.5 text-ink">{{ company.province }} · {{ company.region }}</dd></div><div><dt class="text-xs text-muted">ที่อยู่</dt><dd class="mt-0.5 leading-6 text-ink">{{ company.address }}</dd></div></dl>
                  <p v-if="form.companyId === company.id" class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-warning"><Check :size="16" aria-hidden="true" />เลือกสถานประกอบการนี้แล้ว</p>
                </div>
              </div>
            </article>
          </div>

          <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div class="flex items-center gap-3"><p class="whitespace-nowrap text-muted">แสดง {{ companyResultStart }}–{{ companyResultEnd }} จาก {{ availableCompanies.length }} รายการ</p><div class="w-20 shrink-0"><UiSelect v-model="companyPageSize" :options="pageSizeOptions" label="จำนวนรายการต่อหน้า" :label-visible="false" /></div></div>
            <nav class="flex items-center gap-2" aria-label="การแบ่งหน้าสถานประกอบการ"><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-45" :disabled="companyPage === 1" aria-label="หน้าก่อนหน้า" @click="companyPage--"><ChevronLeft :size="18" aria-hidden="true" /></button><span class="min-w-20 text-center font-semibold text-ink">หน้า {{ companyPage }} / {{ companyPageCount }}</span><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-45" :disabled="companyPage === companyPageCount" aria-label="หน้าถัดไป" @click="companyPage++"><ChevronRight :size="18" aria-hidden="true" /></button></nav>
          </div>
        </template>
      </UiCard>

      <UiDialog
        v-model:open="companyDialogOpen"
        :close-on-confirm="false"
        title="เพิ่มสถานประกอบการใหม่"
        description="กรอกเฉพาะข้อมูลหลัก รายการนี้จะถูกบันทึกให้ผู้อื่นค้นหาและใช้ต่อได้ โดยมีสถานะรอเจ้าหน้าที่ตรวจสอบ"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2"><UiInput v-model="newCompany.name" label="ชื่อสถานประกอบการ" required :error="companyErrors.name" /></div>
          <div class="sm:col-span-2"><UiTextarea v-model="newCompany.address" label="ที่อยู่สถานประกอบการ" required :error="companyErrors.address" /></div>
          <div class="sm:col-span-2"><UiSelect v-model="newCompany.province" label="จังหวัด" required :options="provinceOptions" :error="companyErrors.province" /></div>
        </div>
        <template #cancel><UiButton variant="secondary">ยกเลิก</UiButton></template>
        <template #confirm><UiButton :icon="CirclePlus" @click="createCompany">เพิ่มและเลือก</UiButton></template>
      </UiDialog>

      <UiCard>
        <h3 class="font-semibold text-ink">2. ข้อมูลการสมัคร</h3>
        <p class="mt-1 text-sm leading-6 text-muted">ข้อมูลตำแหน่งและรายละเอียดของคุณ ไม่กระทบคำร้องของนักศึกษาคนอื่น</p>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div><UiInput v-model="form.position" label="ตำแหน่งฝึกงาน" required :error="formErrors.position" /></div>
          <div><UiInput v-model="form.appliedAt" type="date" label="วันที่สมัคร" required :error="formErrors.appliedAt" /></div>
          <div class="sm:col-span-2"><UiTextarea v-model="form.details" label="รายละเอียดงานหรือข้อมูลประกอบ (ไม่บังคับ)" :error="formErrors.details" help="หากทราบ สามารถระบุลักษณะงาน ทีม หรือข้อมูลเพิ่มเติมได้" /></div>
        </div>
      </UiCard>

      <UiCard>
        <h3 class="font-semibold text-ink">3. ข้อมูลสำหรับออกหนังสือ</h3>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div><UiInput v-model="form.recipientName" label="เรียน / ชื่อผู้รับหนังสือ" placeholder="เช่น ผู้จัดการฝ่ายทรัพยากรบุคคล" required :error="formErrors.recipientName" /></div>
          <div><UiInput v-model="form.recipientRole" label="ตำแหน่งหรือหน่วยงานของผู้รับ" required :error="formErrors.recipientRole" /></div>
          <div class="sm:col-span-2"><UiTextarea v-model="form.letterAddress" label="ที่อยู่สำหรับออกหนังสือ" required :error="formErrors.letterAddress" help="กรอกที่อยู่ที่ต้องการให้ปรากฏบนหนังสือฉบับนี้ให้ครบถ้วน" /></div>
        </div>
      </UiCard>

      <UiAlert v-if="submitError" tone="danger" title="บันทึกคำร้องไม่สำเร็จ">{{ submitError }}</UiAlert>

      <div class="flex flex-col-reverse gap-2 rounded-panel border border-divider bg-canvas/95 p-3 shadow-xl backdrop-blur sm:sticky sm:bottom-3 sm:z-10 sm:flex-row sm:justify-end">
        <UiButton type="button" variant="secondary" :icon="Save" :loading="isSaving" @click="submit('draft')">บันทึกฉบับร่าง</UiButton>
        <UiButton type="submit" :icon="FileCheck2" :loading="isSaving">{{ isEditing ? 'ตรวจสอบและส่งอีกครั้ง' : 'ตรวจสอบและส่งคำร้อง' }}</UiButton>
      </div>

      <UiDialog
        v-model:open="reviewDialogOpen"
        :close-on-confirm="false"
        title="ตรวจสอบข้อมูลก่อนส่งคำร้อง"
        description="กรุณาตรวจสอบข้อมูลให้ถูกต้อง เมื่อยืนยันแล้วระบบจะส่งคำร้องให้อาจารย์ทันที"
      >
        <div class="space-y-5">
          <section>
            <div class="flex items-center gap-2"><Building2 :size="18" class="text-warning" aria-hidden="true" /><h4 class="font-semibold text-ink">สถานประกอบการ</h4></div>
            <dl class="mt-3 rounded-panel border border-divider bg-surface p-4 text-sm">
              <div><dt class="text-xs font-medium text-muted">ชื่อสถานประกอบการ</dt><dd class="mt-1 font-semibold text-ink">{{ selectedCompany?.name ?? 'ไม่พบข้อมูล' }}</dd></div>
              <div class="mt-3"><dt class="text-xs font-medium text-muted">สาขา / จังหวัด</dt><dd class="mt-1 text-ink">{{ selectedCompany?.branch }} · {{ selectedCompany?.province }}</dd></div>
              <div class="mt-3"><dt class="text-xs font-medium text-muted">ที่อยู่</dt><dd class="mt-1 leading-6 text-ink">{{ selectedCompany?.address }}</dd></div>
            </dl>
          </section>

          <section>
            <h4 class="font-semibold text-ink">ข้อมูลการสมัคร</h4>
            <dl class="mt-3 grid gap-3 rounded-panel border border-divider p-4 text-sm sm:grid-cols-2">
              <div><dt class="text-xs font-medium text-muted">ตำแหน่งฝึกงาน</dt><dd class="mt-1 text-ink">{{ form.position }}</dd></div>
              <div><dt class="text-xs font-medium text-muted">วันที่สมัคร</dt><dd class="mt-1 text-ink">{{ formatReviewDate(form.appliedAt) }}</dd></div>
              <div class="sm:col-span-2"><dt class="text-xs font-medium text-muted">รายละเอียดงานหรือข้อมูลประกอบ</dt><dd class="mt-1 whitespace-pre-line leading-6 text-ink">{{ form.details || 'ไม่ได้ระบุ' }}</dd></div>
            </dl>
          </section>

          <section>
            <h4 class="font-semibold text-ink">ข้อมูลสำหรับออกหนังสือ</h4>
            <dl class="mt-3 rounded-panel border border-divider p-4 text-sm">
              <div><dt class="text-xs font-medium text-muted">เรียน / ชื่อผู้รับหนังสือ</dt><dd class="mt-1 text-ink">{{ form.recipientName }}</dd></div>
              <div class="mt-3"><dt class="text-xs font-medium text-muted">ตำแหน่งหรือหน่วยงาน</dt><dd class="mt-1 text-ink">{{ form.recipientRole }}</dd></div>
              <div class="mt-3"><dt class="text-xs font-medium text-muted">ที่อยู่สำหรับออกหนังสือ</dt><dd class="mt-1 whitespace-pre-line leading-6 text-ink">{{ form.letterAddress }}</dd></div>
            </dl>
          </section>

          <UiAlert v-if="submitError" tone="danger" title="ส่งคำร้องไม่สำเร็จ">{{ submitError }}</UiAlert>
        </div>

        <template #cancel><UiButton variant="ghost" :disabled="isSaving">กลับไปแก้ไข</UiButton></template>
        <template #confirm><UiButton :icon="FileCheck2" :loading="isSaving" @click="submit('submitted')">ยืนยันและส่งคำร้อง</UiButton></template>
      </UiDialog>
    </form>
  </div>
</template>
