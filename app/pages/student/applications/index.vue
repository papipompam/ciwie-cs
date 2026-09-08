<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Files,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from '@lucide/vue'
import { format } from 'date-fns'
import { studentApplicationFormSchema as applicationSchema } from '#shared/student-applications'
import type { StudentApplication, StudentApplicationFormValue, TrackedApplicationStatus } from '~/composables/useStudentApplications'
import { createStudentApplicationSchema } from '~/composables/useStudentApplications'
import { getPageCount, paginateItems } from '~/utils/table'

definePageMeta({ title: 'สมัครและยืนยันที่ฝึกงาน', middleware: 'student-prototype' })
useHead({ title: 'สมัครและยืนยันที่ฝึกงาน' })

const { scenario } = useScenario()
const { showToast } = useToast()
const { currentAccount } = useAuthPrototype()
const { findPerson } = usePeopleDirectory()
const { requests, selectAndSubmit } = usePlacementRequestPreview()
const currentRequest = computed(() => requests.value.find(item => item.application.id === latestApplication.value?.id))
const {
  applications: applicationStore,
  currentStudentApplications: applications,
  latestApplication,
  canCreateApplication,
  addApplication,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
} = useStudentApplications()

const { data: fetchedApplications, status: fetchStatus, error: fetchError, refresh: refreshApplications } = await useFetch<StudentApplication[]>('/api/student/applications')
watch(fetchedApplications, (items) => { if (items) applicationStore.value = items }, { immediate: true })
const createDisabled = computed(() => !canCreateApplication.value || fetchStatus.value !== 'success')

const searchQuery = ref('')
const statusFilter = ref('all')
const provinceFilter = ref('all')
const sortDirection = ref<'asc' | 'desc'>('desc')
const currentPage = ref(1)
const pageSize = ref('10')
const applicationDialogOpen = ref(false)
const statusDialogOpen = ref(false)
const deleteDialogOpen = ref(false)
const selectionDialogOpen = ref(false)
const editingId = ref<string | null>(null)
const selectedId = ref<string | null>(null)
const statusValue = ref<TrackedApplicationStatus>('submitted')
const isSubmitting = ref(false)
const isSavingStatus = ref(false)

interface ApplicationFormErrors {
  companyName?: string
  position?: string
  companyLocation?: string
  recipientName?: string
  letterAddress?: string
  latitude?: string
  longitude?: string
  province?: string
  appliedAt?: string
  status?: string
}

const today = format(new Date(), 'yyyy-MM-dd')
const emptyForm = (): StudentApplicationFormValue => ({
  companyName: '',
  position: '',
  companyLocation: '',
  recipientName: '',
  letterAddress: '',
  latitude: null,
  longitude: null,
  province: '',
  appliedAt: today,
  status: 'submitted',
})
const form = reactive<StudentApplicationFormValue>(emptyForm())
const formErrors = reactive<ApplicationFormErrors>({})
const currentStudent = computed(() => currentAccount.value
  ? findPerson('student', currentAccount.value.username)
  : undefined)
const studentProfile = computed(() => ({
  id: currentStudent.value?.id ?? currentAccount.value?.username ?? 'ไม่ระบุ',
  name: currentStudent.value
    ? `${currentStudent.value.prefix}${currentStudent.value.firstName} ${currentStudent.value.lastName}`
    : currentAccount.value?.name ?? 'ไม่ระบุ',
  section: currentStudent.value?.section ?? 'ไม่ระบุ',
  cycle: currentStudent.value?.cycle ?? 'ไม่ระบุ',
}))
const fillExampleApplication = () => {
  Object.assign(form, {
    companyName: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด',
    position: 'Frontend Developer',
    companyLocation: '88/8 ถนนธานี ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000',
    recipientName: 'ผู้จัดการฝ่ายทรัพยากรบุคคล',
    letterAddress: 'บริษัท บุรีรัมย์ดิจิทัล จำกัด 88/8 ถนนธานี ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000',
    latitude: null,
    longitude: null,
    province: 'บุรีรัมย์',
    appliedAt: today,
    status: 'submitted',
  })
  clearFormErrors()
}
watch(() => form.companyName, () => { formErrors.companyName = undefined })
watch(() => form.position, () => { formErrors.position = undefined })
watch(() => form.companyLocation, () => { formErrors.companyLocation = undefined })
watch(() => form.recipientName, () => { formErrors.recipientName = undefined })
watch(() => form.letterAddress, () => { formErrors.letterAddress = undefined })

const statusOptions = [
  { value: 'all', label: 'ทุกสถานะ' },
  ...trackedApplicationStatusOptions,
]
const formStatusOptions = trackedApplicationStatusOptions.filter(option => option.value !== 'completed')
const provinceOptions = computed(() => [
  { value: 'all', label: 'ทุกจังหวัด' },
  ...[...new Set(applications.value.map(application => application.province))]
    .sort((a, b) => a.localeCompare(b, 'th'))
    .map(province => ({ value: province, label: province })),
])
const formProvinceOptions = [
  'กรุงเทพมหานคร',
  'ขอนแก่น',
  'ชลบุรี',
  'เชียงใหม่',
  'นครราชสีมา',
  'บุรีรัมย์',
  'สงขลา',
  'สุพรรณบุรี',
].map(province => ({ value: province, label: province }))
const pageSizeOptions = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
]

const effectiveViewState = computed(() => {
  if (scenario.value.forceError || fetchError.value) return 'error'
  if (fetchStatus.value === 'pending') return 'loading'
  return scenario.value.viewState
})
const visibleSource = computed(() => scenario.value.viewState === 'empty' ? [] : applications.value)
const filteredApplications = computed(() => {
  const keyword = searchQuery.value.trim().toLocaleLowerCase('th')
  return visibleSource.value
    .filter(application => !keyword || [application.companyName, application.position, application.companyLocation, application.recipientName ?? '', application.letterAddress ?? '']
      .some(value => value.toLocaleLowerCase('th').includes(keyword)))
    .filter(application => statusFilter.value === 'all' || application.status === statusFilter.value)
    .filter(application => provinceFilter.value === 'all' || application.province === provinceFilter.value)
    .toSorted((a, b) => {
      const comparison = a.appliedAt.localeCompare(b.appliedAt)
      return sortDirection.value === 'asc' ? comparison : -comparison
    })
})
const pageSizeNumber = computed(() => Number(pageSize.value))
const pageCount = computed(() => getPageCount(filteredApplications.value.length, pageSizeNumber.value))
const paginatedApplications = computed(() => paginateItems(filteredApplications.value, currentPage.value, pageSizeNumber.value))
const resultStart = computed(() => filteredApplications.value.length ? (currentPage.value - 1) * pageSizeNumber.value + 1 : 0)
const resultEnd = computed(() => Math.min(currentPage.value * pageSizeNumber.value, filteredApplications.value.length))
const hasActiveFilters = computed(() => Boolean(searchQuery.value.trim()) || statusFilter.value !== 'all' || provinceFilter.value !== 'all')
const activeStatusLabel = computed(() => statusOptions.find(option => option.value === statusFilter.value)?.label)
const selectedApplication = computed(() => applications.value.find(application => application.id === selectedId.value) ?? null)
const applicationBlockReason = computed(() => {
  if (!latestApplication.value || canCreateApplication.value) return ''
  return latestApplication.value.status === 'completed'
    ? 'คุณยืนยันเลือกที่ฝึกงานแล้ว หากต้องการเปลี่ยนสถานประกอบการ กรุณาติดต่อเจ้าหน้าที่'
    : 'กรอกบริษัทใหม่ได้เมื่อบริษัทเดิมปฏิเสธเท่านั้น'
})
const currentMapUrl = computed(() => {
  const item = latestApplication.value
  return item?.latitude != null && item.longitude != null
    ? `https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=17/${item.latitude}/${item.longitude}`
    : null
})
const mapUrl = (item: StudentApplication) => item.latitude != null && item.longitude != null
  ? `https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=17/${item.latitude}/${item.longitude}` : undefined
const formatUpdatedAt = (value: string) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value))

watch([searchQuery, statusFilter, provinceFilter, pageSize], () => {
  currentPage.value = 1
})
watch(pageCount, (count) => {
  if (currentPage.value > count) currentPage.value = count
})

const clearFormErrors = () => {
  Object.assign(formErrors, {
    companyName: undefined,
    position: undefined,
    companyLocation: undefined,
    recipientName: undefined,
    letterAddress: undefined,
    latitude: undefined,
    longitude: undefined,
    province: undefined,
    appliedAt: undefined,
    status: undefined,
  })
}
const openAddDialog = () => {
  if (createDisabled.value) {
    showToast({ title: 'ยังกรอกบริษัทใหม่ไม่ได้', description: fetchStatus.value !== 'success' ? 'กรุณารอโหลดข้อมูล หรือลองโหลดอีกครั้ง' : applicationBlockReason.value })
    return
  }
  editingId.value = null
  Object.assign(form, emptyForm())
  clearFormErrors()
  applicationDialogOpen.value = true
}
const openEditDialog = (application: StudentApplication) => {
  if (application.status === 'completed') {
    showToast({ title: 'ยืนยันเลือกที่ฝึกงานแล้ว', description: 'หากต้องการแก้ไขข้อมูล กรุณาติดต่อเจ้าหน้าที่' })
    return
  }
  editingId.value = application.id
  Object.assign(form, {
    companyName: application.companyName,
    position: application.position,
    companyLocation: application.companyLocation,
    recipientName: application.recipientName ?? '',
    letterAddress: application.letterAddress ?? application.companyLocation,
    latitude: application.latitude ?? null,
    longitude: application.longitude ?? null,
    province: application.province,
    appliedAt: application.appliedAt,
    status: application.status,
  })
  clearFormErrors()
  applicationDialogOpen.value = true
}
const openStatusDialog = (application: StudentApplication) => {
  if (application.status === 'completed') {
    showToast({ title: 'ยืนยันเลือกที่ฝึกงานแล้ว', description: 'หากต้องการเปลี่ยนสถานประกอบการ กรุณาติดต่อเจ้าหน้าที่' })
    return
  }
  selectedId.value = application.id
  statusValue.value = application.status
  statusDialogOpen.value = true
}
const openDeleteDialog = (application: StudentApplication) => {
  if (application.status !== 'rejected') return
  selectedId.value = application.id
  deleteDialogOpen.value = true
}

const coordinatesValid = ref(true)
const submitApplication = async () => {
  if (isSubmitting.value || !coordinatesValid.value) return
  clearFormErrors()
  const result = editingId.value ? applicationSchema.safeParse(form) : createStudentApplicationSchema.safeParse(form)
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors as Partial<Record<keyof ApplicationFormErrors, string[]>>
    formErrors.companyName = errors.companyName?.[0]
    formErrors.position = errors.position?.[0]
    formErrors.companyLocation = errors.companyLocation?.[0]
    formErrors.recipientName = errors.recipientName?.[0]
    formErrors.letterAddress = errors.letterAddress?.[0]
    formErrors.latitude = errors.latitude?.[0]
    formErrors.longitude = errors.longitude?.[0]
    formErrors.province = errors.province?.[0]
    formErrors.appliedAt = errors.appliedAt?.[0]
    formErrors.status = errors.status?.[0]
    return
  }

  isSubmitting.value = true
  try {
    if (editingId.value) {
      await updateApplication(editingId.value, applicationSchema.parse(result.data))
      showToast({ title: 'แก้ไขข้อมูลการสมัครแล้ว', description: result.data.companyName })
    }
    else {
      await addApplication(createStudentApplicationSchema.parse(result.data))
      showToast({ title: 'บันทึกข้อมูลแล้ว', description: `${result.data.companyName} · รอดำเนินการ` })
    }
    applicationDialogOpen.value = false
  }
  catch (error) {
    const response = error as { statusCode?: number, data?: { data?: Partial<Record<keyof ApplicationFormErrors, string[]>> } }
    const blocked = response.statusCode === 409 || (error instanceof Error && error.message === 'student-application-already-active')
    if (response.statusCode === 400 && response.data?.data) {
      for (const [field, messages] of Object.entries(response.data.data)) {
        formErrors[field as keyof ApplicationFormErrors] = messages?.[0]
      }
    }
    if (blocked) await refreshApplications()
    showToast({ title: 'บันทึกข้อมูลไม่สำเร็จ', description: blocked ? 'มีบริษัทที่กำลังดำเนินการอยู่ กรุณาตรวจสอบรายการปัจจุบัน' : 'กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง' })
  }
  finally {
    isSubmitting.value = false
  }
}
const submitStatus = async () => {
  if (!selectedApplication.value || isSavingStatus.value) return
  isSavingStatus.value = true
  try {
    await updateApplicationStatus(selectedApplication.value.id, statusValue.value)
    showToast({
      title: 'อัปเดตสถานะแล้ว',
      description: `${selectedApplication.value.companyName} · ${trackedApplicationStatusMeta[statusValue.value].label}`,
    })
    statusDialogOpen.value = false
  }
  catch {
    showToast({ title: 'อัปเดตสถานะไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' })
  }
  finally {
    isSavingStatus.value = false
  }
}
const confirmSelection = async () => {
  const application = latestApplication.value
  if (!application || ['rejected', 'cancelled'].includes(application.status) || isSavingStatus.value || currentRequest.value) return
  if (!applicationSchema.safeParse(application).success) {
    selectionDialogOpen.value = false
    openEditDialog(application)
    showToast({ title: 'กรุณาตรวจสอบข้อมูลบริษัท ผู้รับหนังสือ และพิกัดให้ครบก่อนยืนยัน' })
    return
  }
  isSavingStatus.value = true
  try {
    await selectAndSubmit(application, updateApplicationStatus)
    selectionDialogOpen.value = false
    showToast({ title: 'ยืนยันสถานประกอบการแล้ว', description: 'ข้อมูลถูกส่งเข้าคิวของเจ้าหน้าที่ทันที ขั้นตอนต่อไปคือรอเจ้าหน้าที่ออกหนังสือ' })
  }
  catch {
    await refreshApplications()
    showToast({ title: 'ดำเนินการยังไม่ครบ', description: 'กดลองอีกครั้งเพื่อทำต่อจากขั้นตอนที่บันทึกสำเร็จแล้ว' })
  }
  finally {
    isSavingStatus.value = false
  }
}
const confirmDelete = async () => {
  if (!selectedApplication.value) return
  const companyName = selectedApplication.value.companyName
  try {
    await deleteApplication(selectedApplication.value.id)
    showToast({ title: 'ลบรายการการสมัครแล้ว', description: companyName })
    selectedId.value = null
  }
  catch {
    showToast({ title: 'ลบรายการไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' })
  }
}
const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = 'all'
  provinceFilter.value = 'all'
}
const resetTable = () => {
  clearFilters()
  sortDirection.value = 'desc'
  pageSize.value = '10'
  currentPage.value = 1
}
const retry = async () => {
  scenario.value.forceError = false
  scenario.value.viewState = 'data'
  await refreshApplications()
}
const toggleDateSort = () => {
  sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  currentPage.value = 1
}
const formatDate = (date: string) => new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}).format(new Date(`${date}T00:00:00+07:00`))
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">สมัครและยืนยันที่ฝึกงาน</h2>
      </div>
      <div class="sm:max-w-md">
        <UiButton class="w-full shrink-0 sm:w-auto" :icon="Plus" @click="openAddDialog">
          กรอกข้อมูล
        </UiButton>
      </div>
    </div>

    <UiCard v-if="effectiveViewState === 'loading'" class="mb-6" aria-label="กำลังโหลดข้อมูลที่ฝึกงาน">
      <div class="flex items-start gap-3 border-b border-divider pb-5">
        <UiSkeleton class="size-10 shrink-0" />
        <div class="min-w-0 flex-1"><UiSkeleton class="h-5 w-36" /><UiSkeleton class="mt-2 h-4 w-56 max-w-full" /></div>
      </div>
      <UiSkeleton class="mt-5 h-8 w-64 max-w-full" />
      <UiSkeleton class="mt-3 h-24 w-full" />
    </UiCard>
    <UiCard v-else-if="effectiveViewState === 'error'" class="mb-6">
      <AppErrorState title="โหลดข้อมูลที่ฝึกงานไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองดึงข้อมูลอีกครั้ง" @retry="retry" />
    </UiCard>
    <UiCard v-else-if="effectiveViewState === 'empty' || !latestApplication" class="mb-6">
      <AppEmptyState title="ยังไม่มีข้อมูลที่ฝึกงาน" description="กรอกข้อมูลบริษัท ตำแหน่ง และที่อยู่ เพื่อเริ่มติดตามการสมัครที่ฝึกงาน">
        <UiButton :icon="Plus" @click="openAddDialog">กรอกข้อมูลที่ฝึกงาน</UiButton>
      </AppEmptyState>
    </UiCard>
    <UiCard v-else-if="latestApplication" class="mb-6">
      <div class="mb-5 flex flex-col gap-4 border-b border-divider pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-control bg-info-soft text-info"><Building2 :size="20" aria-hidden="true" /></span>
          <div>
            <h3 class="text-lg font-bold text-ink">ข้อมูลที่ฝึกงาน</h3>
            <p class="mt-1 text-sm leading-6 text-muted">ข้อมูลบริษัท ตำแหน่ง และสถานะการสมัครล่าสุด</p>
          </div>
        </div>
        <UiBadge class="shrink-0 self-start" :tone="trackedApplicationStatusMeta[latestApplication.status].tone">
          {{ trackedApplicationStatusMeta[latestApplication.status].label }}
        </UiBadge>
      </div>
      <section class="mb-5 rounded-control border border-divider bg-surface/60 p-4 sm:p-5" aria-labelledby="application-student-heading">
        <h4 id="application-student-heading" class="font-semibold text-ink">ข้อมูลนักศึกษา</h4>
        <dl class="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div><dt class="text-xs text-muted">ชื่อ–นามสกุล</dt><dd class="mt-1 font-semibold text-ink">{{ studentProfile.name }}</dd></div>
          <div><dt class="text-xs text-muted">รหัสนักศึกษา</dt><dd class="mt-1 text-ink">{{ studentProfile.id }}</dd></div>
          <div><dt class="text-xs text-muted">หมู่เรียน</dt><dd class="mt-1 text-ink">{{ studentProfile.section }}</dd></div>
          <div><dt class="text-xs text-muted">รอบการศึกษา</dt><dd class="mt-1 text-ink">{{ studentProfile.cycle }}</dd></div>
        </dl>
      </section>
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <p class="text-xs font-medium text-muted">{{ canCreateApplication ? 'บริษัทล่าสุด' : 'บริษัทที่กำลังดำเนินการ' }}</p>
          <h4 class="mt-1 break-words text-xl font-bold text-ink">{{ latestApplication.companyName }}</h4>
          <p class="mt-1 text-sm text-ink">{{ latestApplication.position }}</p>
        </div>
      </div>
      <div class="mt-5 grid gap-6 border-t border-divider pt-5 lg:grid-cols-2">
      <section class="min-w-0" aria-label="ข้อมูลสถานประกอบการ">
      <h4 class="font-semibold text-ink">สถานประกอบการ</h4>
      <dl class="mt-3 space-y-3 text-sm">
        <div><dt class="text-xs text-muted">ที่อยู่บริษัท</dt><dd class="mt-1 whitespace-pre-line break-words leading-6 text-ink">{{ latestApplication.companyLocation }}</dd></div>
        <div><dt class="text-xs text-muted">จังหวัด</dt><dd class="mt-1 text-ink">{{ latestApplication.province || 'ยังไม่ระบุ' }}</dd></div>
        <div>
          <dt class="sr-only">แผนที่บริษัท</dt>
          <dd v-if="currentMapUrl" class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <a :href="currentMapUrl" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center gap-2 rounded-control border border-divider px-4 font-semibold text-ink hover:bg-surface"><MapPin :size="16" aria-hidden="true" />แสดงแผนที่<span class="sr-only"> (เปิดแท็บใหม่)</span></a>
          </dd>
          <dd v-else class="mt-1 text-muted">ยังไม่มีพิกัด — เพิ่มได้ในแก้ไขข้อมูล</dd>
        </div>
      </dl>
      </section>
      <section class="min-w-0" aria-label="ข้อมูลออกหนังสือ">
        <h4 class="font-semibold text-ink">ข้อมูลออกหนังสือ</h4>
        <dl class="mt-3 space-y-3 text-sm">
          <div><dt class="text-xs text-muted">เรียน (ผู้รับหนังสือ)</dt><dd class="mt-1 break-words leading-6 text-ink">{{ latestApplication.recipientName || 'ยังไม่ระบุ' }}</dd></div>
          <div><dt class="text-xs text-muted">ที่อยู่สำหรับออกหนังสือ</dt><dd class="mt-1 whitespace-pre-line break-words leading-6 text-ink">{{ latestApplication.letterAddress || 'ยังไม่ระบุ' }}</dd></div>
        </dl>
      </section>
      </div>
      <dl class="mt-5 grid gap-4 rounded-control bg-surface p-4 text-sm sm:grid-cols-3">
        <div class="min-w-0"><dt class="text-xs text-muted">เลขที่รายการ</dt><dd class="mt-1 break-all text-ink">{{ latestApplication.id }}</dd></div>
        <div><dt class="text-xs text-muted">วันที่สมัคร</dt><dd class="mt-1 text-ink">{{ formatDate(latestApplication.appliedAt) }}</dd></div>
        <div><dt class="text-xs text-muted">อัปเดตล่าสุด</dt><dd class="mt-1 text-ink">{{ formatUpdatedAt(latestApplication.updatedAt) }}</dd></div>
      </dl>
      <div class="mt-5 flex flex-wrap gap-2 border-t border-divider pt-4">
        <UiButton v-if="!canCreateApplication && !currentRequest" :loading="isSavingStatus" @click="selectionDialogOpen = true">{{ latestApplication.status === 'completed' ? 'ส่งคำร้องขอหนังสือ (ทดลอง)' : 'เลือกบริษัทนี้และส่งคำร้อง (ทดลอง)' }}</UiButton>
        <template v-if="latestApplication.status !== 'completed'">
          <UiButton variant="secondary" :icon="Pencil" @click="openEditDialog(latestApplication)">แก้ไขข้อมูล</UiButton>
          <UiButton variant="secondary" :icon="RefreshCw" @click="openStatusDialog(latestApplication)">อัปเดตผลการสมัคร</UiButton>
        </template>
      </div>
    </UiCard>

    <UiCard v-if="effectiveViewState === 'data' && latestApplication?.status === 'completed'" class="mb-6">
      <div class="flex items-start gap-3 border-b border-divider pb-5">
        <span class="grid size-10 shrink-0 place-items-center rounded-control bg-warning-soft text-warning"><Files :size="20" aria-hidden="true" /></span>
        <div>
          <h3 class="text-lg font-bold text-ink">หนังสือขอความอนุเคราะห์และหนังสือตอบรับ</h3>
          <p class="mt-1 text-sm leading-6 text-muted">ดาวน์โหลดหนังสือที่เจ้าหน้าที่จัดทำ และส่งหนังสือตอบรับจากสถานประกอบการกลับเข้าระบบ</p>
        </div>
      </div>
      <div class="mt-5 divide-y divide-divider">
        <section class="pb-5" aria-labelledby="sample-request-letter-heading">
          <h4 id="sample-request-letter-heading" class="font-semibold text-ink">หนังสือขอความอนุเคราะห์</h4>
          <p class="mt-1 text-sm leading-6 text-muted">ไฟล์ที่เจ้าหน้าที่จัดทำให้นักศึกษานำส่งสถานประกอบการ</p>
          <div class="mt-4 flex flex-col gap-3 rounded-control border border-divider bg-surface/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <p class="text-xs font-medium text-muted">แนบไฟล์</p>
              <p class="mt-1 break-words text-sm font-semibold text-ink">หนังสือขอความอนุเคราะห์เข้ารับนักศึกษาฝึกงาน (ตัวอย่าง).pdf</p>
            </div>
            <a href="/api/mock-documents/หนังสือขอความอนุเคราะห์เข้ารับนักศึกษาฝึกงาน (ตัวอย่าง).pdf" download class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-control border border-divider bg-canvas px-4 text-sm font-semibold text-ink hover:bg-surface">
              <Download :size="17" aria-hidden="true" />ดาวน์โหลดไฟล์
            </a>
          </div>
        </section>
        <section class="pt-5" aria-labelledby="sample-response-letter-heading">
          <h4 id="sample-response-letter-heading" class="font-semibold text-ink">แบบหนังสือตอบรับ</h4>
          <p class="mt-1 text-sm leading-6 text-muted">แนบหนังสือตอบรับที่ได้รับจากสถานประกอบการ</p>
          <label class="mt-4 block text-sm font-semibold text-ink">
            แนบไฟล์
            <input type="file" accept="application/pdf,.pdf" class="mt-2 block w-full min-w-0 rounded-control border border-divider bg-canvas p-3 text-sm" aria-describedby="sample-response-file-help">
          </label>
          <p id="sample-response-file-help" class="mt-2 text-xs leading-5 text-muted">รองรับไฟล์ PDF ขนาดไม่เกิน 5 MB · ช่องแนบตัวอย่างยังไม่ส่งไฟล์จริง</p>
        </section>
      </div>
      <p class="mt-4 text-xs leading-5 text-muted">ข้อมูลและไฟล์ส่วนนี้เป็นข้อมูลตัวอย่างภายใน session เท่านั้น</p>
    </UiCard>

    <UiCard :padded="false">
      <div class="border-b border-divider p-5 sm:p-6">
        <div>
          <h3 class="text-lg font-bold text-ink">ประวัติการสมัคร</h3>
          <p class="mt-1 text-sm leading-6 text-muted">ดูบริษัทที่เคยสมัครและผลการดำเนินการย้อนหลัง</p>
        </div>

        <div class="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <label class="block w-full text-sm font-semibold text-ink sm:max-w-sm lg:w-96 lg:flex-none">
            <span class="sr-only">ค้นหาบริษัทหรือตำแหน่ง</span>
            <span class="relative block">
              <Search :size="18" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input v-model="searchQuery" type="search" class="min-h-11 w-full rounded-control border border-divider bg-canvas pr-3 pl-10 font-normal placeholder:text-gray-400" placeholder="ค้นหาชื่อบริษัทหรือตำแหน่ง">
            </span>
          </label>
          <div class="flex flex-wrap items-center justify-end gap-2 lg:ml-auto lg:flex-nowrap">
            <div class="w-full sm:w-52"><UiSelect v-model="statusFilter" :options="statusOptions" label="กรองตามสถานะ" :label-visible="false" /></div>
            <div class="w-full sm:w-48"><UiSelect v-model="provinceFilter" :options="provinceOptions" label="กรองตามจังหวัด" :label-visible="false" /></div>
            <button type="button" class="inline-grid size-11 shrink-0 place-items-center rounded-control border border-divider bg-canvas text-ink transition-colors hover:bg-surface" aria-label="รีเซ็ตตาราง" title="รีเซ็ตตาราง" @click="resetTable">
              <RotateCcw :size="18" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div v-if="hasActiveFilters" class="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span class="text-muted">ตัวกรองที่ใช้:</span>
          <span v-if="searchQuery" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">คำค้น “{{ searchQuery }}”</span>
          <span v-if="statusFilter !== 'all'" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">{{ activeStatusLabel }}</span>
          <span v-if="provinceFilter !== 'all'" class="inline-flex min-h-8 items-center rounded-full bg-surface px-3 text-ink">{{ provinceFilter }}</span>
          <button type="button" class="inline-flex min-h-8 items-center gap-1 rounded-control px-2 font-semibold text-warning hover:bg-warning-soft" @click="clearFilters"><X :size="15" aria-hidden="true" />ล้างทั้งหมด</button>
        </div>
      </div>

      <div v-if="effectiveViewState === 'loading'" class="space-y-3 p-5 sm:p-6" aria-label="กำลังโหลดรายการการสมัคร">
        <div v-for="row in 5" :key="row" class="grid grid-cols-[2fr_1fr_8rem_9rem_2rem] gap-4 max-md:grid-cols-[1fr_8rem]">
          <UiSkeleton class="h-10" /><UiSkeleton class="h-10 max-md:hidden" /><UiSkeleton class="h-10 max-md:hidden" /><UiSkeleton class="h-10" /><UiSkeleton class="h-10 max-md:hidden" />
        </div>
      </div>
      <div v-else-if="effectiveViewState === 'error'" class="p-5 sm:p-6">
        <AppErrorState title="โหลดรายการการสมัครไม่สำเร็จ" description="เกิดข้อผิดพลาดชั่วคราว กรุณาลองดึงข้อมูลอีกครั้ง" @retry="retry" />
      </div>
      <div v-else-if="!paginatedApplications.length" class="p-5 sm:p-6">
        <AppEmptyState :title="hasActiveFilters ? 'ไม่พบการสมัครที่ตรงกับตัวกรอง' : 'ยังไม่มีรายการการสมัคร'" :description="hasActiveFilters ? 'ลองเปลี่ยนคำค้นหรือล้างตัวกรองที่ใช้อยู่' : 'เพิ่มบริษัทที่คุณสมัครไว้เพื่อเริ่มติดตามสถานะ'">
          <UiButton v-if="hasActiveFilters" variant="secondary" @click="clearFilters">ล้างตัวกรอง</UiButton>
          <UiButton v-else :icon="Plus" @click="openAddDialog">กรอกข้อมูล</UiButton>
        </AppEmptyState>
      </div>

      <template v-else>
        <div class="hidden overflow-hidden xl:block">
          <table class="w-full table-fixed border-collapse text-left text-sm">
            <caption class="sr-only">รายการบริษัทที่นักศึกษาสมัครสหกิจ</caption>
            <colgroup>
              <col class="w-[18%]">
              <col class="w-[19%]">
              <col class="w-[19%]">
              <col class="w-[9%]">
              <col class="w-[10%]">
              <col class="w-[12%]">
              <col class="w-[13%]">
            </colgroup>
            <thead class="bg-surface text-xs font-semibold tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" class="px-4 py-3">บริษัท / ตำแหน่ง</th>
                <th scope="col" class="px-3 py-3">ที่อยู่ / พิกัดบริษัท</th>
                <th scope="col" class="px-3 py-3">ผู้รับหนังสือ / ที่อยู่ออกหนังสือ</th>
                <th scope="col" class="px-3 py-3" :aria-sort="sortDirection === 'asc' ? 'ascending' : 'descending'">
                  <button type="button" class="inline-flex items-center gap-1 font-semibold hover:text-ink" :aria-label="`เรียงวันที่สมัคร${sortDirection === 'asc' ? 'จากใหม่ไปเก่า' : 'จากเก่าไปใหม่'}`" @click="toggleDateSort">
                    วันที่สมัคร <ArrowUp v-if="sortDirection === 'asc'" :size="15" aria-hidden="true" /><ArrowDown v-else :size="15" aria-hidden="true" />
                  </button>
                </th>
                <th scope="col" class="px-3 py-3">สถานะ</th>
                <th scope="col" class="px-3 py-3">อัปเดตล่าสุด</th>
                <th scope="col" class="px-3 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-divider">
              <tr v-for="application in paginatedApplications" :key="application.id" class="transition-colors hover:bg-surface/70">
                <td class="break-words px-4 py-4 align-top"><p class="font-semibold text-ink">{{ application.companyName }}</p><p class="mt-1 text-xs text-muted">{{ application.position }}</p></td>
                <td class="break-words px-3 py-4 align-top text-muted"><p>{{ application.companyLocation }}</p><p class="mt-1 text-xs">จังหวัด: {{ application.province || 'ยังไม่ระบุ' }}</p><a v-if="mapUrl(application)" :href="mapUrl(application)" target="_blank" rel="noopener noreferrer" class="mt-1 inline-flex min-h-9 items-center gap-1 font-semibold text-ink underline"><MapPin :size="15" />แสดงแผนที่<span class="sr-only"> (เปิดแท็บใหม่)</span></a></td>
                <td class="break-words px-3 py-4 align-top"><p class="text-ink">{{ application.recipientName || 'ยังไม่ระบุผู้รับหนังสือ' }}</p><p class="mt-1 text-xs leading-5 text-muted">{{ application.letterAddress || 'ยังไม่ระบุที่อยู่' }}</p></td>
                <td class="break-words px-3 py-4 align-top text-muted">{{ formatDate(application.appliedAt) }}</td>
                <td class="break-words px-3 py-4 align-top"><UiBadge :tone="trackedApplicationStatusMeta[application.status].tone">{{ trackedApplicationStatusMeta[application.status].label }}</UiBadge></td>
                <td class="break-words px-3 py-4 align-top text-xs leading-5 text-muted">{{ formatUpdatedAt(application.updatedAt) }}</td>
                <td class="px-3 py-4 text-right align-top">
                  <div class="flex flex-wrap justify-end gap-1 [&>button]:shrink-0">
                    <button type="button" class="inline-grid size-11 place-items-center rounded-control text-muted hover:bg-surface hover:text-ink" :aria-label="`แก้ไขข้อมูล ${application.companyName}`" title="แก้ไขข้อมูล" @click="openEditDialog(application)"><Pencil :size="18" aria-hidden="true" /></button>
                    <button type="button" class="inline-grid size-11 place-items-center rounded-control text-muted hover:bg-surface hover:text-ink" :aria-label="`อัปเดตสถานะ ${application.companyName}`" title="อัปเดตสถานะ" @click="openStatusDialog(application)"><RefreshCw :size="18" aria-hidden="true" /></button>
                    <button v-if="application.status === 'rejected'" type="button" class="inline-grid size-11 place-items-center rounded-control text-danger hover:bg-danger-soft" :aria-label="`ลบรายการ ${application.companyName}`" title="ลบรายการ" @click="openDeleteDialog(application)"><Trash2 :size="18" aria-hidden="true" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="divide-y divide-divider xl:hidden">
          <article v-for="application in paginatedApplications" :key="application.id" class="p-5">
            <div class="flex flex-col gap-3">
              <div class="min-w-0"><p class="font-semibold leading-6 text-ink">{{ application.companyName }}</p><p class="mt-1 text-sm text-muted">{{ application.position }}</p></div>
              <div class="flex flex-nowrap justify-end gap-1 [&>button]:shrink-0">
                <button type="button" class="inline-grid size-11 place-items-center rounded-control text-muted hover:bg-surface hover:text-ink" :aria-label="`แก้ไขข้อมูล ${application.companyName}`" title="แก้ไขข้อมูล" @click="openEditDialog(application)"><Pencil :size="18" aria-hidden="true" /></button>
                <button type="button" class="inline-grid size-11 place-items-center rounded-control text-muted hover:bg-surface hover:text-ink" :aria-label="`อัปเดตสถานะ ${application.companyName}`" title="อัปเดตสถานะ" @click="openStatusDialog(application)"><RefreshCw :size="18" aria-hidden="true" /></button>
                <button v-if="application.status === 'rejected'" type="button" class="inline-grid size-11 place-items-center rounded-control text-danger hover:bg-danger-soft" :aria-label="`ลบรายการ ${application.companyName}`" title="ลบรายการ" @click="openDeleteDialog(application)"><Trash2 :size="18" aria-hidden="true" /></button>
              </div>
            </div>
            <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
              <dl class="w-full space-y-2 break-words text-sm leading-6 text-muted">
                <div><dt class="text-xs">ที่อยู่บริษัท / จังหวัด</dt><dd>{{ application.companyLocation }} · {{ application.province || 'ยังไม่ระบุ' }}</dd></div>
                <div><dt class="text-xs">ผู้รับหนังสือ</dt><dd>{{ application.recipientName || 'ยังไม่ระบุ' }}</dd></div>
                <div><dt class="text-xs">ที่อยู่สำหรับออกหนังสือ</dt><dd>{{ application.letterAddress || 'ยังไม่ระบุ' }}</dd></div>
                <div><dt class="text-xs">วันที่สมัคร</dt><dd>{{ formatDate(application.appliedAt) }}</dd></div>
                <div><dt class="text-xs">อัปเดตล่าสุด</dt><dd>{{ formatUpdatedAt(application.updatedAt) }}</dd></div>
              </dl>
              <a v-if="mapUrl(application)" :href="mapUrl(application)" target="_blank" rel="noopener noreferrer" class="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink underline"><MapPin :size="16" />แสดงแผนที่<span class="sr-only"> (เปิดแท็บใหม่)</span></a>
              <UiBadge :tone="trackedApplicationStatusMeta[application.status].tone">{{ trackedApplicationStatusMeta[application.status].label }}</UiBadge>
            </div>
          </article>
        </div>

        <div class="flex flex-col gap-3 border-t border-divider px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div class="flex items-center gap-3">
            <p class="whitespace-nowrap text-muted">แสดง {{ resultStart }}–{{ resultEnd }} จาก {{ filteredApplications.length }} รายการ</p>
            <div class="w-20 shrink-0"><UiSelect v-model="pageSize" :options="pageSizeOptions" label="จำนวนรายการต่อหน้า" :label-visible="false" /></div>
          </div>
          <nav class="flex items-center gap-2" aria-label="การแบ่งหน้าตาราง">
            <button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-45" :disabled="currentPage === 1" aria-label="หน้าก่อนหน้า" @click="currentPage--"><ChevronLeft :size="18" aria-hidden="true" /></button>
            <span class="min-w-20 text-center font-semibold text-ink">หน้า {{ currentPage }} / {{ pageCount }}</span>
            <button type="button" class="inline-grid size-10 place-items-center rounded-control border border-divider text-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-45" :disabled="currentPage === pageCount" aria-label="หน้าถัดไป" @click="currentPage++"><ChevronRight :size="18" aria-hidden="true" /></button>
          </nav>
        </div>
      </template>
    </UiCard>

    <UiDialog v-model:open="selectionDialogOpen" title="เลือกบริษัทและส่งคำร้อง" description="ยืนยันว่าบริษัทตอบรับแล้วและคุณเลือกฝึกงานที่นี่ ระบบจะบันทึกผลตอบรับและส่งข้อมูลเข้าคิวเจ้าหน้าที่ทันที หลังยืนยันเปลี่ยนบริษัทเองไม่ได้ ข้อมูลยังเป็นต้นแบบเฉพาะ session นี้">
      <p class="font-semibold text-ink">{{ latestApplication?.companyName }}</p>
      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <UiButton variant="ghost" :disabled="isSavingStatus" @click="selectionDialogOpen = false">กลับ</UiButton>
        <UiButton :loading="isSavingStatus" @click="confirmSelection">ยืนยันและส่งคำร้อง (ทดลอง)</UiButton>
      </div>
    </UiDialog>

    <UiDialog v-model:open="applicationDialogOpen" size="lg" :title="editingId ? 'แก้ไขข้อมูลการสมัคร' : 'บันทึกข้อมูลการสมัคร'" description="บันทึกบริษัทที่สมัครและข้อมูลสำหรับจัดทำหนังสือขอความอนุเคราะห์">
      <form class="grid gap-5 sm:grid-cols-2" novalidate @submit.prevent="submitApplication">
        <div v-if="!editingId" class="flex flex-wrap items-center justify-between gap-3 rounded-control border border-divider bg-surface p-4 sm:col-span-2">
          <div>
            <p class="text-sm font-semibold text-ink">ทดลองกรอกข้อมูลตัวอย่าง</p>
            <p class="mt-1 text-xs leading-5 text-muted">เติมข้อมูลบริษัทและที่อยู่ แล้วกดค้นหาพิกัดจากข้อมูลตัวอย่างด้านล่าง</p>
          </div>
          <UiButton type="button" size="sm" variant="secondary" :icon="Sparkles" @click="fillExampleApplication">เติมข้อมูลตัวอย่าง</UiButton>
        </div>
        <div class="sm:col-span-2"><UiInput v-model="form.companyName" label="ชื่อบริษัท / สถานประกอบการ" placeholder="เช่น บริษัท ตัวอย่าง จำกัด" :error="formErrors.companyName" required /></div>
        <div class="sm:col-span-2"><UiInput v-model="form.position" label="ตำแหน่งที่สมัคร" placeholder="เช่น นักพัฒนาเว็บไซต์" :error="formErrors.position" required /></div>
        <div class="sm:col-span-2"><UiTextarea v-model="form.companyLocation" label="ที่อยู่บริษัท" placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด และรหัสไปรษณีย์" :error="formErrors.companyLocation" required /></div>
        <div class="sm:col-span-2"><UiInput v-model="form.recipientName" label="เรียน (ชื่อหรือตำแหน่งผู้รับหนังสือ)" placeholder="เช่น คุณสมชาย ใจดี หรือผู้จัดการฝ่ายทรัพยากรบุคคล" help="ระบุผู้ที่ต้องการให้เจ้าหน้าที่เรียนถึงในหนังสือ" :error="formErrors.recipientName" required /></div>
        <div class="sm:col-span-2">
          <UiTextarea v-model="form.letterAddress" label="ที่อยู่สำหรับออกหนังสือ" placeholder="ชื่อบริษัท / สาขา เลขที่ ถนน ตำบล อำเภอ จังหวัด และรหัสไปรษณีย์" :error="formErrors.letterAddress" required />
          <UiButton class="mt-2" size="sm" variant="ghost" @click="form.letterAddress = form.companyLocation">ใช้ที่อยู่เดียวกับบริษัท</UiButton>
        </div>
        <div class="sm:col-span-2"><AppLocationPicker :latitude="form.latitude" :longitude="form.longitude" :address="form.letterAddress" address-label="ที่อยู่สำหรับออกหนังสือ" :error="formErrors.latitude || formErrors.longitude" :show-coordinate-inputs="false" @validity="coordinatesValid = $event" @change="Object.assign(form, $event); formErrors.latitude = undefined; formErrors.longitude = undefined" /></div>
        <template v-if="editingId">
          <UiSelect v-model="form.province" :options="formProvinceOptions" label="จังหวัด" placeholder="เลือกจังหวัด" :error="formErrors.province" required />
          <div><UiInput v-model="form.appliedAt" type="date" label="วันที่สมัคร" :error="formErrors.appliedAt" required /></div>
          <div class="sm:col-span-2"><UiSelect v-model="form.status" :options="formStatusOptions" label="สถานะการสมัคร" :error="formErrors.status" required /></div>
        </template>
        <div class="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 border-t border-divider bg-canvas pt-5 sm:col-span-2">
          <UiButton variant="ghost" @click="applicationDialogOpen = false">ยกเลิก</UiButton>
          <UiButton type="submit" :loading="isSubmitting">บันทึกข้อมูล</UiButton>
        </div>
      </form>
    </UiDialog>

    <UiDialog v-model:open="statusDialogOpen" title="อัปเดตสถานะการสมัคร" :description="selectedApplication?.companyName">
      <form class="space-y-5" @submit.prevent="submitStatus">
        <UiSelect v-model="statusValue" :options="formStatusOptions" label="สถานะใหม่" required />
        <div class="flex flex-wrap justify-end gap-2 border-t border-divider pt-5">
          <UiButton variant="ghost" @click="statusDialogOpen = false">ยกเลิก</UiButton>
          <UiButton type="submit" :loading="isSavingStatus">บันทึกสถานะ</UiButton>
        </div>
      </form>
    </UiDialog>

    <UiDialog v-model:open="deleteDialogOpen" title="ลบรายการการสมัคร" :description="selectedApplication ? `ต้องการลบ ${selectedApplication.companyName} ออกจากรายการติดตามหรือไม่` : undefined">
      <template #cancel><UiButton variant="ghost">ยกเลิก</UiButton></template>
      <template #confirm><UiButton variant="danger" @click="confirmDelete">ลบรายการ</UiButton></template>
    </UiDialog>
  </div>
</template>
