<script setup lang="ts">
const route = useRoute()
const { request } = useApiClient()
const { user } = useSession()
const toast = useToast()
const resource = computed(() => String(route.params.resource))
const loading = ref(false)
const file = ref<File | null>(null)
const evidenceFiles = ref<File[]>([])
interface ResourceForm {
  [key: string]: string
  coopTermId: string
  studentTermId: string
  organizationId: string
  workSiteId: string
  contactId: string
  applicationId: string
  visitId: string
  round: string
  travelDays: string
  travelAmount: string
  lodgingAmount: string
  mealAmount: string
  note: string
  positionTitle: string
  appliedAt: string
}
const form = reactive<ResourceForm>({
  coopTermId: '', studentTermId: '', organizationId: '', workSiteId: '', contactId: '', applicationId: '', visitId: '', round: '1', travelDays: '1',
  travelAmount: '0.00', lodgingAmount: '0.00', mealAmount: '0.00', note: '', positionTitle: '', appliedAt: new Date().toISOString().slice(0, 10)
})
const companyEditorVisible = ref(false)
const duplicateSuggestions = ref<Array<{ id: string, nameTh: string, taxId?: string | null }>>([])
const allowNewDuplicate = ref(false)
const company = reactive({ nameTh: '', nameEn: '', taxId: '', workSiteName: '', addressLine: '', province: '', region: '', postalCode: '', contactName: '', contactPosition: '', contactEmail: '', contactPhone: '' })

const config = computed(() => {
  const configs: Record<string, { title: string, description: string, endpoint: string, file?: boolean, fields: Array<{ key: string, label: string, type?: string, required?: boolean }> }> = {
    students: { title: 'นำเข้ารายชื่อนักศึกษา', description: 'รองรับ CSV UTF-8 และ XLSX สูงสุด 5,000 แถว ระบบจะแสดง preview ก่อนยืนยัน', endpoint: '/api/imports/students', file: true, fields: [] },
    applications: { title: 'เพิ่มใบสมัครงาน', description: 'ระบุตำแหน่ง วันสมัคร สถานที่ปฏิบัติงาน และหลักฐาน PDF', endpoint: '/api/applications', fields: [{ key: 'studentTermId', label: 'รหัสภาคสหกิจของนักศึกษา', required: true }, { key: 'workSiteId', label: 'รหัสสถานที่ปฏิบัติงาน', required: true }, { key: 'positionTitle', label: 'ตำแหน่งที่สมัคร', required: true }, { key: 'appliedAt', label: 'วันที่สมัคร', type: 'date', required: true }, { key: 'contactId', label: 'รหัสผู้ติดต่อ' }, { key: 'note', label: 'หมายเหตุ' }] },
    documents: { title: 'สร้างคำขอเอกสาร', description: 'คำขอนี้เป็นของนักศึกษารายคน และสามารถถูกรวมเป็นชุดเอกสารภายหลัง', endpoint: '/api/document-requests', fields: [{ key: 'applicationId', label: 'รหัสใบสมัคร', required: true }, { key: 'note', label: 'หมายเหตุ' }] },
    visits: { title: 'จัดตารางนิเทศ', description: 'ระบบจะตรวจ conflict ของนักศึกษา อาจารย์ และสถานที่ใน transaction', endpoint: '/api/visits', fields: [{ key: 'round', label: 'รอบนิเทศ', type: 'number', required: true }, { key: 'visitDate', label: 'วันที่นิเทศ', type: 'date', required: true }, { key: 'period', label: 'ช่วงเวลา', required: true }, { key: 'workSiteId', label: 'รหัสสถานที่', required: true }] },
    expenses: { title: 'เพิ่มค่าใช้จ่าย', description: 'เพิ่มได้หลายรายการต่อรอบ และยอดรวมคำนวณฝั่ง Server', endpoint: '/api/expenses', fields: [{ key: 'visitId', label: 'รหัสการนิเทศ', required: true }, { key: 'round', label: 'รอบนิเทศ', type: 'number', required: true }, { key: 'travelDays', label: 'จำนวนวันเดินทาง', type: 'number', required: true }, { key: 'travelAmount', label: 'ค่าเดินทาง', type: 'number', required: true }, { key: 'lodgingAmount', label: 'ค่าที่พัก', type: 'number', required: true }, { key: 'mealAmount', label: 'ค่าอาหาร', type: 'number', required: true }, { key: 'note', label: 'หมายเหตุ' }] }
  }
  return configs[resource.value]
})
const visibleFields = computed(() => config.value?.fields.filter(field => resource.value !== 'applications' || !['workSiteId', 'contactId'].includes(field.key)) ?? [])

if (!config.value) throw createError({ statusCode: 404, statusMessage: 'ไม่พบหน้าที่ต้องการ' })

watchEffect(() => {
  if (resource.value === 'applications' && user.value && user.value.role !== 'STUDENT') void navigateTo('/forbidden')
  if (resource.value === 'applications' && !form.studentTermId && user.value?.studentTermId) form.studentTermId = user.value.studentTermId
})

function requestBody(evidenceFileVersionIds: string[] = []): Record<string, unknown> {
  if (resource.value === 'applications') return {
    studentTermId: form.studentTermId.trim(), workSiteId: form.workSiteId.trim(),
    positionTitle: form.positionTitle.trim(), appliedAt: form.appliedAt,
    ...(form.contactId.trim() ? { contactId: form.contactId.trim() } : {}), ...(form.note.trim() ? { note: form.note.trim() } : {}),
    ...(evidenceFileVersionIds.length ? { evidenceFileVersionIds } : {})
  }
  if (resource.value === 'documents') return { applicationId: form.applicationId.trim() }
  if (resource.value === 'expenses') return {
    visitId: form.visitId.trim(), round: Number(form.round), travelDays: Number(form.travelDays), travelAmount: Number(form.travelAmount),
    lodgingAmount: Number(form.lodgingAmount), mealAmount: Number(form.mealAmount), ...(form.note.trim() ? { note: form.note.trim() } : {})
  }
  return {}
}

function chooseFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] || null
}

function chooseEvidence(event: Event) {
  evidenceFiles.value = Array.from((event.target as HTMLInputElement).files || [])
}

async function uploadEvidence(): Promise<string[]> {
  const result: string[] = []
  for (const evidence of evidenceFiles.value) {
    const body = new FormData()
    body.append('file', evidence)
    const stored = await request<{ fileVersionId: string }>('/api/files', { method: 'POST', body })
    result.push(stored.fileVersionId)
  }
  return result
}

async function createOrganizationAndWorkSite() {
  let organizationId = form.organizationId.trim()
  if (!organizationId) {
    duplicateSuggestions.value = await request<Array<{ id: string, nameTh: string, taxId?: string | null }>>('/api/organizations/duplicate-suggestions', { query: { name: company.nameTh.trim(), ...(company.taxId.trim() ? { taxId: company.taxId.trim() } : {}) } })
    if (duplicateSuggestions.value.length && !allowNewDuplicate.value) {
      toast.add({ title: 'พบสถานประกอบการที่อาจซ้ำ', description: 'เลือกข้อมูลเดิมด้านล่าง หรือยืนยันว่าต้องการสร้างใหม่', color: 'warning' })
      return
    }
    organizationId = (await request<{ id: string }>('/api/organizations', { method: 'POST', body: { nameTh: company.nameTh.trim(), ...(company.nameEn.trim() ? { nameEn: company.nameEn.trim() } : {}), ...(company.taxId.trim() ? { taxId: company.taxId.trim() } : {}) } })).id
    form.organizationId = organizationId
  }
  const contact = company.contactName.trim() ? { name: company.contactName.trim(), ...(company.contactPosition.trim() ? { position: company.contactPosition.trim() } : {}), ...(company.contactEmail.trim() ? { email: company.contactEmail.trim() } : {}), ...(company.contactPhone.trim() ? { phone: company.contactPhone.trim() } : {}) } : undefined
  const site = await request<{ id: string, contactId?: string }>('/api/work-sites', { method: 'POST', body: { organizationId, name: company.workSiteName.trim(), addressLine: company.addressLine.trim(), province: company.province.trim(), region: company.region.trim(), ...(company.postalCode.trim() ? { postalCode: company.postalCode.trim() } : {}), ...(contact ? { contact } : {}) } })
  form.workSiteId = site.id
  form.contactId = site.contactId || ''
  companyEditorVisible.value = false
  toast.add({ title: 'เพิ่มสถานที่ปฏิบัติงานแล้ว', description: 'ระบบเลือกสถานที่ใหม่นี้ในใบสมัครแล้ว', color: 'primary' })
}

function selectSuggestedOrganization(item: { id: string }) {
  form.organizationId = item.id
  duplicateSuggestions.value = []
  allowNewDuplicate.value = false
}

async function submit() {
  if (!config.value) return
  loading.value = true
  try {
    if (config.value.file) {
      if (!file.value) throw new Error('กรุณาเลือกไฟล์ CSV หรือ XLSX')
      const coopTermId = form.coopTermId?.trim() || ''
      if (!coopTermId) throw new Error('กรุณาระบุภาคสหกิจ')
      const body = new FormData()
      body.append('file', file.value)
      body.append('coopTermId', coopTermId)
      const result = await request<{ id?: string, previewHash?: string, data?: { id?: string, previewHash?: string } }>(config.value.endpoint, { method: 'POST', body })
      const id = result.id || result.data?.id
      const previewHash = result.previewHash || result.data?.previewHash
      toast.add({ title: 'อัปโหลดสำเร็จ', description: 'กรุณาตรวจสอบ preview ก่อนยืนยัน', color: 'primary' })
      await navigateTo(id ? `/students/imports/${id}?coopTermId=${encodeURIComponent(coopTermId)}${previewHash ? `&previewHash=${encodeURIComponent(previewHash)}` : ''}` : '/students')
      return
    }
    const evidenceFileVersionIds = resource.value === 'applications' ? await uploadEvidence() : []
    await request(config.value.endpoint, { method: 'POST', body: requestBody(evidenceFileVersionIds) })
    toast.add({ title: 'บันทึกสำเร็จ', color: 'primary' })
    await navigateTo(`/${resource.value}`)
  } catch (error) {
    toast.add({ title: 'บันทึกไม่สำเร็จ', description: error instanceof Error ? error.message : 'โปรดลองอีกครั้ง', color: 'error' })
  } finally { loading.value = false }
}
</script>

<template>
  <div v-if="config" class="max-w-3xl">
    <PageHeader :title="config.title" :description="config.description" icon="i-lucide-square-pen" />
    <form class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6" @submit.prevent="submit">
      <div v-if="config.file" class="space-y-4"><label class="block"><span class="mb-1.5 block text-sm font-medium">ภาคสหกิจ *</span><input v-model="form.coopTermId" required class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"></label><label class="grid min-h-44 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-teal-500 dark:border-slate-700"><span><UIcon name="i-lucide-file-up" class="mx-auto size-10 text-teal-600" /><span class="mt-3 block font-medium">{{ file?.name || 'เลือกไฟล์ CSV หรือ XLSX' }}</span><span class="mt-1 block text-sm text-slate-500">ระบบจะยังไม่เขียนข้อมูลจนกว่าจะยืนยัน preview</span></span><input class="sr-only" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" @change="chooseFile"></label></div>
      <div v-else class="grid gap-5 lg:grid-cols-2">
        <template v-if="resource === 'applications'">
          <LookupSelect v-model="form.organizationId" resource="ORGANIZATIONS" label="สถานประกอบการ" />
          <LookupSelect v-model="form.workSiteId" resource="WORK_SITES" label="สถานที่ปฏิบัติงาน" :context="{ organizationId: form.organizationId || undefined }" required />
          <LookupSelect v-model="form.contactId" resource="CONTACTS" label="ผู้ติดต่อ" :context="{ workSiteId: form.workSiteId || undefined }" />
          <div class="flex items-end"><UButton type="button" color="neutral" variant="outline" icon="i-lucide-building-2" label="เพิ่มสถานประกอบการ/สถานที่ใหม่" @click="companyEditorVisible = !companyEditorVisible" /></div>
          <section v-if="companyEditorVisible" class="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700 lg:col-span-2">
            <p class="font-medium">ข้อมูลสถานประกอบการและสถานที่ใหม่</p>
            <div class="grid gap-4 sm:grid-cols-2"><input v-model="company.nameTh" :required="!form.organizationId" placeholder="ชื่อสถานประกอบการ (ไทย)" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><input v-model="company.nameEn" placeholder="ชื่อภาษาอังกฤษ" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><input v-model="company.taxId" placeholder="เลขประจำตัวผู้เสียภาษี" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><input v-model="company.workSiteName" required placeholder="ชื่อสถานที่ปฏิบัติงาน" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><input v-model="company.addressLine" required placeholder="ที่อยู่" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700 sm:col-span-2"><input v-model="company.province" required placeholder="จังหวัด" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><input v-model="company.region" required placeholder="ภูมิภาค" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><input v-model="company.postalCode" pattern="\d{5}" placeholder="รหัสไปรษณีย์" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><input v-model="company.contactName" placeholder="ชื่อผู้ติดต่อ" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><input v-model="company.contactPosition" placeholder="ตำแหน่งผู้ติดต่อ" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><input v-model="company.contactEmail" type="email" placeholder="อีเมลผู้ติดต่อ" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><input v-model="company.contactPhone" placeholder="โทรศัพท์ผู้ติดต่อ" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"></div>
            <div v-if="duplicateSuggestions.length" class="rounded-lg bg-amber-50 p-3 dark:bg-amber-950"><p class="text-sm font-medium">รายการที่อาจซ้ำ</p><div class="mt-2 flex flex-wrap gap-2"><UButton v-for="suggestion in duplicateSuggestions" :key="suggestion.id" color="neutral" variant="outline" :label="suggestion.nameTh" @click="selectSuggestedOrganization(suggestion)" /></div><label class="mt-3 flex items-center gap-2 text-sm"><input v-model="allowNewDuplicate" type="checkbox">ตรวจสอบแล้วและต้องการสร้างรายการใหม่</label></div>
            <div class="flex justify-end"><UButton type="button" icon="i-lucide-save" label="ตรวจชื่อซ้ำและใช้สถานที่นี้" @click="createOrganizationAndWorkSite" /></div>
          </section>
        </template>
        <label v-for="field in visibleFields" :key="field.key" class="block" :class="field.key === 'note' && 'lg:col-span-2'">
          <span class="mb-1.5 block text-sm font-medium">{{ field.label }} <span v-if="field.required" class="text-rose-600">*</span></span>
          <textarea v-if="field.key === 'note'" v-model="form[field.key]" rows="4" class="w-full rounded-lg border border-slate-300 bg-transparent p-3 dark:border-slate-700" />
          <input v-else v-model="form[field.key]" :type="field.type || 'text'" :required="field.required" step="0.01" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700" >
        </label>
        <label v-if="resource === 'applications'" class="block lg:col-span-2"><span class="mb-1.5 block text-sm font-medium">หลักฐานการสมัคร (PDF)</span><input type="file" multiple accept=".pdf,application/pdf" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700" @change="chooseEvidence"><span class="mt-1 block text-xs text-slate-500">เลือกได้หลายไฟล์ ระบบจะตรวจ MIME, magic byte และ malware ก่อนนำไปใช้</span></label>
      </div>
      <div class="mt-6 flex flex-wrap justify-end gap-2"><UButton color="neutral" variant="outline" label="ยกเลิก" :to="`/${resource}`" /><UButton type="submit" :loading="loading" label="บันทึก" icon="i-lucide-save" /></div>
    </form>
  </div>
</template>
