<script setup lang="ts">
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Download, FileSpreadsheet, RotateCcw, Search, Upload, X } from '@lucide/vue'
import type { ImportRowStatus, PeopleFileFormat, PeopleImportRow } from '~/composables/usePeopleImport'
import type { PersonPrefix, PersonType } from '~/composables/usePeopleDirectory'
import { getPageCount, paginateItems } from '~/utils/table'

definePageMeta({ title: 'นำเข้าข้อมูลบุคคล', middleware: 'staff-prototype' })
useHead({ title: 'นำเข้าข้อมูลบุคคล' })

const route = useRoute()
const { scenario } = useScenario()
const { showToast } = useToast()
const { people, importPeople } = usePeopleDirectory()
const { parseFile, downloadTemplate, downloadInvalidRows } = usePeopleImport()

const selectedType = ref<PersonType>(route.query.type === 'lecturer' ? 'lecturer' : 'student')
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const stage = ref<'upload' | 'preview' | 'complete'>('upload')
const rows = ref<PeopleImportRow[]>([])
const parseError = ref('')
const isProcessing = ref(false)
const isImporting = ref(false)
const result = ref({ created: 0, updated: 0, invalid: 0 })
const search = ref('')
const statusFilter = ref<'all' | ImportRowStatus>('all')
const pageSize = ref('10')
const currentPage = ref(1)
const confirmOpen = ref(false)

const context = computed(() => selectedType.value === 'student'
  ? { plural: 'นักศึกษา', singular: 'นักศึกษา', idLabel: 'รหัสนักศึกษา', route: 'students' }
  : { plural: 'อาจารย์', singular: 'อาจารย์', idLabel: 'รหัสอาจารย์', route: 'lecturers' })
const typeOptions = [
  { value: 'student', label: 'ข้อมูลนักศึกษา' },
  { value: 'lecturer', label: 'ข้อมูลอาจารย์' },
]
const statusOptions = [
  { value: 'all', label: 'ทุกผลการตรวจ' },
  { value: 'new', label: 'พร้อมเพิ่มใหม่' },
  { value: 'update', label: 'พร้อมอัปเดตข้อมูลเดิม' },
  { value: 'invalid', label: 'ไม่ถูกต้อง' },
]
const pageSizeOptions = ['10', '20', '50'].map(value => ({ value, label: value }))
const statusMeta: Record<ImportRowStatus, { label: string, tone: 'success' | 'info' | 'danger' }> = {
  new: { label: 'พร้อมเพิ่มใหม่', tone: 'success' },
  update: { label: 'พร้อมอัปเดต', tone: 'info' },
  invalid: { label: 'ไม่ถูกต้อง', tone: 'danger' },
}
const summary = computed(() => ({
  new: rows.value.filter(row => row.status === 'new').length,
  update: rows.value.filter(row => row.status === 'update').length,
  invalid: rows.value.filter(row => row.status === 'invalid').length,
}))
const importableRows = computed(() => rows.value.filter((row): row is PeopleImportRow & { prefix: PersonPrefix } => row.status !== 'invalid' && row.prefix !== ''))
const filteredRows = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('th')
  return rows.value
    .filter(row => statusFilter.value === 'all' || row.status === statusFilter.value)
    .filter(row => !keyword || [row.id, row.prefix, row.firstName, row.lastName, row.reason]
      .some(value => value.toLocaleLowerCase('th').includes(keyword)))
})
const pageSizeNumber = computed(() => Number(pageSize.value))
const pageCount = computed(() => getPageCount(filteredRows.value.length, pageSizeNumber.value))
const paginatedRows = computed(() => paginateItems(filteredRows.value, currentPage.value, pageSizeNumber.value))
const resultStart = computed(() => filteredRows.value.length ? (currentPage.value - 1) * pageSizeNumber.value + 1 : 0)
const resultEnd = computed(() => Math.min(currentPage.value * pageSizeNumber.value, filteredRows.value.length))
const hasFilters = computed(() => Boolean(search.value) || statusFilter.value !== 'all')
const currentStep = computed(() => stage.value === 'upload' ? 1 : stage.value === 'preview' ? 2 : 3)

watch([search, statusFilter, pageSize], () => { currentPage.value = 1 })
watch(pageCount, count => { if (currentPage.value > count) currentPage.value = count })
watch(selectedType, async (type) => {
  resetImport()
  await navigateTo({ path: route.path, query: { type } }, { replace: true })
})

const clearFilters = () => {
  search.value = ''
  statusFilter.value = 'all'
}

const resetImport = () => {
  selectedFile.value = null
  rows.value = []
  parseError.value = ''
  stage.value = 'upload'
  clearFilters()
  currentPage.value = 1
  if (fileInput.value) fileInput.value.value = ''
}

const retry = () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
  parseError.value = ''
  resetImport()
}

const validateFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase()
  if (!extension || !['csv', 'xlsx'].includes(extension)) return 'รองรับเฉพาะไฟล์ CSV หรือ Excel (.xlsx)'
  if (file.size > 5 * 1024 * 1024) return 'ไฟล์ต้องมีขนาดไม่เกิน 5 MB'
  return ''
}

const processFile = async (file: File) => {
  parseError.value = validateFile(file)
  if (parseError.value) return
  selectedFile.value = file
  isProcessing.value = true
  try {
    if (scenario.value.forceError) throw new Error('scenario-error')
    const existingIds = new Set(people.value.filter(person => person.type === selectedType.value).map(person => person.id))
    rows.value = await parseFile(file, selectedType.value, existingIds)
    stage.value = 'preview'
  }
  catch (error) {
    console.error(error)
    parseError.value = 'อ่านข้อมูลจากไฟล์ไม่สำเร็จ กรุณาตรวจชื่อคอลัมน์และรูปแบบไฟล์แล้วลองอีกครั้ง'
  }
  finally {
    isProcessing.value = false
  }
}

const handleFileChange = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) await processFile(file)
}

const handleDownloadTemplate = async (format: PeopleFileFormat) => {
  try {
    await downloadTemplate(selectedType.value, format)
    showToast({ title: 'ดาวน์โหลดไฟล์ตัวอย่างแล้ว', description: `ไฟล์ ${format.toUpperCase()} สำหรับข้อมูล${context.value.plural}` })
  }
  catch (error) {
    console.error(error)
    showToast({ title: 'ดาวน์โหลดไฟล์ไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' })
  }
}

const handleDownloadErrors = async () => {
  try {
    await downloadInvalidRows(rows.value, selectedType.value)
    showToast({ title: 'ดาวน์โหลดรายการไม่สำเร็จแล้ว', description: `${summary.value.invalid} รายการ พร้อมเหตุผล` })
  }
  catch (error) {
    console.error(error)
    showToast({ title: 'ดาวน์โหลดไฟล์ไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' })
  }
}

const handleImport = async () => {
  if (!importableRows.value.length || isImporting.value) return
  isImporting.value = true
  try {
    const imported = importPeople(selectedType.value, importableRows.value.map(row => ({
      id: row.id,
      prefix: row.prefix,
      firstName: row.firstName,
      lastName: row.lastName,
    })))
    result.value = { ...imported, invalid: summary.value.invalid }
    stage.value = 'complete'
    confirmOpen.value = false
    showToast({ title: 'นำเข้าข้อมูลสำเร็จ', description: `ดำเนินการแล้ว ${imported.created + imported.updated} รายการ` })
  }
  catch (error) {
    console.error(error)
    showToast({ title: 'นำเข้าข้อมูลไม่สำเร็จ', description: 'ข้อมูลยังไม่ถูกเปลี่ยนแปลง กรุณาลองอีกครั้ง' })
  }
  finally {
    isImporting.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <button type="button" class="mb-3 inline-flex min-h-9 items-center gap-2 rounded-control text-sm font-semibold text-muted hover:text-ink" @click="navigateTo(`/staff/${context.route}`)"><ArrowLeft :size="17" aria-hidden="true" />กลับไป{{ context.plural }}</button>
        <h2 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">นำเข้าข้อมูล{{ context.plural }}</h2>
        <p class="mt-1 text-sm leading-6 text-muted">ตรวจสอบข้อมูลทั้งหมดก่อนยืนยัน ระบบจะนำเข้าเฉพาะรายการที่ผ่านการตรวจ</p>
      </div>
      <div v-if="stage === 'upload'" class="flex flex-wrap gap-2 sm:justify-end">
        <UiButton variant="secondary" :icon="Download" @click="handleDownloadTemplate('csv')">ไฟล์ตัวอย่าง CSV</UiButton>
        <UiButton variant="secondary" :icon="FileSpreadsheet" @click="handleDownloadTemplate('xlsx')">ไฟล์ตัวอย่าง Excel</UiButton>
      </div>
    </div>

    <ol class="mb-8 grid grid-cols-3" aria-label="ขั้นตอนการนำเข้าข้อมูล">
      <li v-for="(step, index) in ['เลือกไฟล์', 'ตรวจสอบข้อมูล', 'ผลการนำเข้า']" :key="step" class="relative flex flex-col items-center text-center">
        <div v-if="index > 0" class="absolute top-4 right-1/2 h-0.5 w-full" :class="currentStep > index ? 'bg-primary' : 'bg-divider'" aria-hidden="true" />
        <span class="relative z-10 grid size-9 place-items-center rounded-full border-2 text-sm font-bold" :class="currentStep >= index + 1 ? 'border-primary bg-primary text-ink' : 'border-divider bg-canvas text-muted'">
          <Check v-if="currentStep > index + 1" :size="17" aria-hidden="true" />
          <span v-else>{{ index + 1 }}</span>
        </span>
        <span class="mt-2 text-xs font-semibold sm:text-sm" :class="currentStep >= index + 1 ? 'text-ink' : 'text-muted'">{{ step }}</span>
      </li>
    </ol>

    <UiCard v-if="stage === 'upload'">
      <div class="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div>
          <UiSelect v-model="selectedType" :options="typeOptions" :placeholder="typeOptions.find(item => item.value === selectedType)?.label" label="ประเภทข้อมูล" />
          <p class="mt-3 text-xs leading-5 text-muted">ไฟล์ต้องมีคอลัมน์ {{ context.idLabel }}, ชื่อ และนามสกุล ตามไฟล์ตัวอย่าง</p>
        </div>
        <div>
          <label for="people-import-file" class="block text-sm font-semibold text-ink">ไฟล์ข้อมูล <span class="text-danger" aria-hidden="true">*</span></label>
          <input id="people-import-file" ref="fileInput" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="mt-1.5 block w-full rounded-control border border-divider bg-canvas text-sm text-muted file:mr-4 file:min-h-11 file:border-0 file:border-r file:border-divider file:bg-surface file:px-4 file:font-semibold file:text-ink hover:file:bg-warning-soft" :aria-invalid="Boolean(parseError)" aria-describedby="people-import-help people-import-error" @change="handleFileChange">
          <p id="people-import-help" class="mt-1.5 text-xs text-muted">รองรับ CSV และ Excel (.xlsx) ขนาดไม่เกิน 5 MB</p>
          <p v-if="parseError" id="people-import-error" class="mt-1.5 text-xs font-medium text-danger">{{ parseError }}</p>
          <div v-if="isProcessing" class="mt-5 space-y-3" aria-label="กำลังตรวจสอบไฟล์"><UiSkeleton class="h-12" /><UiSkeleton class="h-12" /><UiSkeleton class="h-12" /></div>
        </div>
      </div>
    </UiCard>

    <template v-else-if="stage === 'preview'">
      <div class="mb-5 grid gap-3 sm:grid-cols-3">
        <UiCard><p class="text-sm text-muted">พร้อมเพิ่มใหม่</p><p class="mt-2 text-3xl font-bold text-success">{{ summary.new }}</p></UiCard>
        <UiCard><p class="text-sm text-muted">ข้อมูลเดิมที่พร้อมอัปเดต</p><p class="mt-2 text-3xl font-bold text-info">{{ summary.update }}</p></UiCard>
        <UiCard><p class="text-sm text-muted">ไม่ถูกต้อง</p><p class="mt-2 text-3xl font-bold text-danger">{{ summary.invalid }}</p></UiCard>
      </div>

      <UiAlert v-if="summary.update" class="mb-5" tone="info" title="พบรหัสเดิมในระบบ">
        รายการเหล่านี้นำเข้าได้ โดยระบบจะอัปเดตเฉพาะคำนำหน้าและชื่อ–นามสกุล และไม่สร้างบัญชีใหม่หรือเปลี่ยนรหัสผ่านเดิม
      </UiAlert>

      <UiCard :padded="false">
        <div class="border-b border-divider p-5 sm:p-6">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div><h3 class="text-lg font-bold text-ink">ผลการตรวจไฟล์</h3><p class="mt-1 text-sm leading-6 text-muted">{{ selectedFile?.name }} · ทั้งหมด {{ rows.length }} รายการ</p></div>
            <div class="flex flex-wrap gap-2 xl:justify-end">
              <UiButton v-if="summary.invalid" variant="secondary" :icon="Download" @click="handleDownloadErrors">ดาวน์โหลดรายการไม่สำเร็จ</UiButton>
              <UiButton variant="secondary" :icon="RotateCcw" @click="resetImport">เลือกไฟล์ใหม่</UiButton>
              <UiButton :icon="Upload" @click="confirmOpen = true">ยืนยัน {{ importableRows.length }} รายการ</UiButton>
            </div>
          </div>
          <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label class="block w-full text-sm font-semibold text-ink sm:max-w-md lg:w-96 lg:flex-none"><span class="sr-only">ค้นหาในไฟล์</span><span class="relative block"><Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" /><input v-model="search" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" :placeholder="`ค้นหา${context.idLabel} ชื่อ หรือนามสกุล`"></span></label>
            <div class="flex items-center gap-2 lg:ml-auto"><div class="w-full sm:w-64"><UiSelect v-model="statusFilter" :options="statusOptions" :placeholder="statusOptions.find(item => item.value === statusFilter)?.label" label="กรองตามผลการตรวจ" :label-visible="false" /></div><button type="button" class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink hover:bg-surface" aria-label="รีเซ็ตตัวกรอง" title="รีเซ็ตตัวกรอง" @click="clearFilters"><RotateCcw :size="18" aria-hidden="true" /></button></div>
          </div>
          <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm"><span class="text-muted">ตัวกรองที่ใช้:</span><span v-if="search" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">คำค้น “{{ search }}”</span><span v-if="statusFilter !== 'all'" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">{{ statusOptions.find(item => item.value === statusFilter)?.label }}</span><button type="button" class="inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-semibold text-warning hover:bg-warning-soft" @click="clearFilters"><X :size="15" aria-hidden="true" />ล้างทั้งหมด</button></div>
        </div>

        <div v-if="scenario.viewState === 'error' || scenario.forceError" class="p-5 sm:p-6"><AppErrorState title="แสดงผลการตรวจไฟล์ไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองอีกครั้ง" @retry="retry" /></div>
        <div v-else-if="scenario.viewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดผลการตรวจ"><UiSkeleton v-for="row in 5" :key="row" class="h-12" /></div>
        <div v-else-if="!paginatedRows.length" class="p-5 sm:p-6"><AppEmptyState title="ไม่พบรายการที่ตรงกับตัวกรอง" description="ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่"><UiButton variant="secondary" @click="clearFilters">ล้างตัวกรอง</UiButton></AppEmptyState></div>
        <template v-else>
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full min-w-[900px] border-collapse text-left text-sm">
              <caption class="sr-only">ผลตรวจข้อมูลก่อนนำเข้า</caption>
              <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase"><tr><th scope="col" class="w-20 px-6 py-3">แถว</th><th scope="col" class="px-4 py-3">{{ context.idLabel }}</th><th scope="col" class="px-4 py-3">ชื่อ–นามสกุล</th><th scope="col" class="px-4 py-3">ผลการตรวจ</th><th scope="col" class="px-4 py-3">รายละเอียด</th></tr></thead>
              <tbody class="divide-y divide-divider"><tr v-for="row in paginatedRows" :key="row.rowNumber" class="hover:bg-surface/70"><td class="px-6 py-4 text-muted">{{ row.rowNumber }}</td><td class="whitespace-nowrap px-4 py-4 font-semibold text-ink">{{ row.id || '—' }}</td><td class="px-4 py-4 text-ink">{{ row.prefix }}{{ [row.firstName, row.lastName].filter(Boolean).join(' ') || '—' }}</td><td class="px-4 py-4"><UiBadge :tone="statusMeta[row.status].tone">{{ statusMeta[row.status].label }}</UiBadge></td><td class="max-w-md px-4 py-4 text-muted">{{ row.reason }}</td></tr></tbody>
            </table>
          </div>
          <div class="divide-y divide-divider md:hidden"><article v-for="row in paginatedRows" :key="row.rowNumber" class="p-5"><div class="flex items-start justify-between gap-3"><div><p class="font-semibold text-ink">{{ row.id || `แถว ${row.rowNumber}` }}</p><p class="mt-1 text-sm text-muted">{{ row.prefix }}{{ [row.firstName, row.lastName].filter(Boolean).join(' ') || 'ข้อมูลชื่อไม่ครบ' }}</p></div><UiBadge :tone="statusMeta[row.status].tone">{{ statusMeta[row.status].label }}</UiBadge></div><p class="mt-3 border-t border-divider pt-3 text-sm leading-6 text-muted">{{ row.reason }}</p></article></div>
          <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"><div class="flex items-center gap-3"><p class="whitespace-nowrap text-muted">แสดง {{ resultStart }}–{{ resultEnd }} จาก {{ filteredRows.length }} รายการ</p><div class="w-20 shrink-0"><UiSelect v-model="pageSize" :options="pageSizeOptions" :placeholder="pageSize" label="จำนวนรายการต่อหน้า" :label-visible="false" /></div></div><nav class="flex items-center gap-2" aria-label="การแบ่งหน้าผลตรวจ"><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === 1" aria-label="หน้าก่อนหน้า" @click="currentPage--"><ChevronLeft :size="18" aria-hidden="true" /></button><span class="min-w-20 text-center font-semibold text-ink">หน้า {{ currentPage }} / {{ pageCount }}</span><button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:opacity-45" :disabled="currentPage === pageCount" aria-label="หน้าถัดไป" @click="currentPage++"><ChevronRight :size="18" aria-hidden="true" /></button></nav></div>
        </template>
      </UiCard>
    </template>

    <UiCard v-else>
      <UiAlert tone="success" title="นำเข้าข้อมูลสำเร็จ">ระบบดำเนินการเฉพาะรายการที่ผ่านการตรวจ และคงรายการไม่ถูกต้องไว้นอกระบบ</UiAlert>
      <dl class="mt-6 grid gap-4 sm:grid-cols-3"><div class="rounded-control bg-surface p-4"><dt class="text-sm text-muted">เพิ่มข้อมูลและบัญชีใหม่</dt><dd class="mt-2 text-3xl font-bold text-ink">{{ result.created }}</dd></div><div class="rounded-control bg-surface p-4"><dt class="text-sm text-muted">อัปเดตข้อมูลเดิม</dt><dd class="mt-2 text-3xl font-bold text-ink">{{ result.updated }}</dd></div><div class="rounded-control bg-surface p-4"><dt class="text-sm text-muted">ไม่นำเข้า</dt><dd class="mt-2 text-3xl font-bold text-ink">{{ result.invalid }}</dd></div></dl>
      <div class="mt-6 flex flex-wrap gap-2"><UiButton @click="navigateTo(`/staff/${context.route}`)">ดูข้อมูล{{ context.plural }}</UiButton><UiButton variant="secondary" @click="resetImport">นำเข้าไฟล์อื่น</UiButton><UiButton v-if="result.invalid" variant="secondary" :icon="Download" @click="handleDownloadErrors">ดาวน์โหลดรายการไม่สำเร็จ</UiButton></div>
    </UiCard>

    <UiDialog v-model:open="confirmOpen" title="ยืนยันการนำเข้าข้อมูล" :description="`ระบบจะดำเนินการ ${importableRows.length} รายการ และไม่นำเข้ารายการที่ไม่ถูกต้อง ${summary.invalid} รายการ`" :close-on-confirm="false">
      <UiAlert v-if="summary.update" tone="info" title="มีข้อมูลเดิมที่ต้องอัปเดต">{{ summary.update }} รายการจะเปลี่ยนเฉพาะคำนำหน้าและชื่อ–นามสกุล โดยคงบัญชีและรหัสผ่านเดิม</UiAlert>
      <template #cancel><UiButton variant="ghost">กลับไปตรวจสอบ</UiButton></template>
      <template #confirm><UiButton :loading="isImporting" :disabled="!importableRows.length" @click="handleImport">ยืนยันนำเข้า</UiButton></template>
    </UiDialog>
  </div>
</template>
