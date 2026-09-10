<script setup lang="ts">
import { Download, FileSpreadsheet, RotateCcw, Upload } from '@lucide/vue'
import type { PeopleFileFormat, PeopleImportCredential, PeopleImportRow } from '~/composables/usePeopleImport'
import type { PersonPrefix, PersonType } from '~/composables/usePeopleDirectory'

const props = defineProps<{ personType: PersonType }>()
const emit = defineEmits<{ updated: [], close: [] }>()
const { people, persistImportPeople } = usePeopleDirectory()
const { parseFile, downloadTemplate, downloadInvalidRows, downloadTemporaryCredentials } = usePeopleImport()
const { showToast } = useToast()
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const stage = ref<'upload' | 'preview' | 'complete'>('upload')
const rows = ref<PeopleImportRow[]>([])
const parseError = ref('')
const isProcessing = ref(false)
const isImporting = ref(false)
const credentials = ref<PeopleImportCredential[]>([])
const result = ref({ created: 0, updated: 0, invalid: 0 })
const context = computed(() => props.personType === 'student' ? { plural: 'นักศึกษา', idLabel: 'รหัสนักศึกษา' } : { plural: 'อาจารย์', idLabel: 'รหัสอาจารย์' })
const importableRows = computed(() => rows.value.filter((row): row is PeopleImportRow & { prefix: PersonPrefix } => row.status !== 'invalid' && row.prefix !== ''))
const summary = computed(() => ({ new: rows.value.filter(row => row.status === 'new').length, invalid: rows.value.filter(row => row.status === 'invalid').length }))
const reset = () => { selectedFile.value = null; rows.value = []; parseError.value = ''; credentials.value = []; result.value = { created: 0, updated: 0, invalid: 0 }; stage.value = 'upload'; if (fileInput.value) fileInput.value.value = '' }
const validateFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase()
  if (!extension || !['csv', 'xlsx'].includes(extension)) return 'รองรับเฉพาะไฟล์ CSV หรือ Excel (.xlsx)'
  if (file.size > 5 * 1024 * 1024) return 'ไฟล์ต้องมีขนาดไม่เกิน 5 MB'
  return ''
}
const processFile = async (file: File) => {
  parseError.value = validateFile(file)
  if (parseError.value) return
  selectedFile.value = file; isProcessing.value = true
  try {
    const existingIds = new Set(people.value.filter(person => person.type === props.personType).map(person => person.id))
    rows.value = await parseFile(file, props.personType, existingIds)
    stage.value = 'preview'
  } catch (error) { console.error(error); parseError.value = 'อ่านข้อมูลจากไฟล์ไม่สำเร็จ กรุณาตรวจชื่อคอลัมน์และรูปแบบไฟล์แล้วลองอีกครั้ง' } finally { isProcessing.value = false }
}
const handleFileChange = async (event: Event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (file) await processFile(file) }
const handleDownloadTemplate = async (format: PeopleFileFormat) => { try { await downloadTemplate(props.personType, format); showToast({ title: 'ดาวน์โหลดไฟล์ตัวอย่างแล้ว', description: `ไฟล์ ${format.toUpperCase()} สำหรับข้อมูล${context.value.plural}` }) } catch { showToast({ title: 'ดาวน์โหลดไฟล์ไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' }) } }
const handleDownloadCredentials = async () => { try { await downloadTemporaryCredentials(credentials.value, props.personType); showToast({ title: 'ดาวน์โหลดรหัสผ่านชั่วคราวแล้ว', description: 'ส่งมอบไฟล์ผ่านช่องทางภายนอกและลบไฟล์หลังใช้งาน' }) } catch { showToast({ title: 'ดาวน์โหลดไฟล์ไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' }) } }
const handleDownloadErrors = async () => { try { await downloadInvalidRows(rows.value, props.personType); showToast({ title: 'ดาวน์โหลดรายการไม่สำเร็จแล้ว', description: `${summary.value.invalid} รายการ พร้อมเหตุผล` }) } catch { showToast({ title: 'ดาวน์โหลดไฟล์ไม่สำเร็จ', description: 'กรุณาลองอีกครั้ง' }) } }
const handleImport = async () => {
  if (!importableRows.value.length || isImporting.value) return
  isImporting.value = true
  try {
    const imported = await persistImportPeople(props.personType, importableRows.value.map(row => ({ id: row.id, prefix: row.prefix, firstName: row.firstName, lastName: row.lastName, ...(row.phone ? { phone: row.phone } : {}), ...(row.email ? { email: row.email } : {}), ...(row.cohortYear ? { cohortYear: row.cohortYear } : {}), ...(row.cycle ? { cycle: row.cycle } : {}), ...(row.section ? { section: row.section } : {}) })))
    result.value = { created: imported.created, updated: imported.updated, invalid: summary.value.invalid }; credentials.value = imported.credentials; stage.value = 'complete'
    showToast({ title: 'นำเข้าข้อมูลสำเร็จ', description: `ดำเนินการแล้ว ${imported.created + imported.updated} รายการ` }); emit('updated')
  } catch (error) { console.error(error); showToast({ title: 'นำเข้าข้อมูลไม่สำเร็จ', description: 'ข้อมูลยังไม่ถูกเปลี่ยนแปลง กรุณาลองอีกครั้ง' }) } finally { isImporting.value = false }
}
</script>

<template>
  <div>
    <template v-if="stage === 'upload'">
      <p class="mb-4 text-sm leading-6 text-muted">เลือกไฟล์ CSV หรือ Excel ระบบจะจับคู่ข้อมูลจากชื่อหัวคอลัมน์ และตรวจสอบข้อมูลก่อนนำเข้า</p>
      <div class="flex flex-wrap gap-2"><UiButton variant="secondary" :icon="Download" @click="handleDownloadTemplate('csv')">ไฟล์ตัวอย่าง CSV</UiButton><UiButton variant="secondary" :icon="FileSpreadsheet" @click="handleDownloadTemplate('xlsx')">ไฟล์ตัวอย่าง Excel</UiButton></div>
      <label for="people-import-file-modal" class="mt-5 block text-sm font-semibold text-ink">ไฟล์ข้อมูล <span class="text-danger" aria-hidden="true">*</span></label>
      <input id="people-import-file-modal" ref="fileInput" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="mt-1.5 block w-full rounded-control border border-divider bg-canvas text-sm text-muted file:mr-4 file:min-h-11 file:border-0 file:border-r file:border-divider file:bg-surface file:px-4 file:font-semibold file:text-ink" @change="handleFileChange">
      <p class="mt-1.5 text-xs text-muted">รองรับ CSV และ Excel (.xlsx) ขนาดไม่เกิน 5 MB</p><p v-if="parseError" class="mt-1.5 text-xs font-medium text-danger">{{ parseError }}</p>
      <div v-if="isProcessing" class="mt-5"><UiSkeleton class="h-12" /></div>
    </template>
    <template v-else-if="stage === 'preview'">
      <p class="text-sm text-muted">{{ selectedFile?.name }} · ทั้งหมด {{ rows.length }} รายการ</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-3"><div class="rounded-control bg-success-soft p-3"><p class="text-xs text-muted">พร้อมเพิ่ม/อัปเดต</p><p class="mt-1 text-xl font-bold text-success">{{ importableRows.length }}</p></div><div class="rounded-control bg-danger-soft p-3"><p class="text-xs text-muted">ไม่ถูกต้อง</p><p class="mt-1 text-xl font-bold text-danger">{{ summary.invalid }}</p></div></div>
      <p class="mt-4 max-h-40 overflow-y-auto rounded-control border border-divider p-3 text-sm leading-6 text-muted">{{ rows.slice(0, 8).map(row => `${row.id || '—'} · ${row.reason}`).join('\n') }}<span v-if="rows.length > 8">\n… และรายการอื่น</span></p>
      <div class="mt-5 flex flex-wrap justify-end gap-2"><UiButton v-if="summary.invalid" variant="secondary" @click="handleDownloadErrors">ดาวน์โหลดรายการไม่สำเร็จ</UiButton><UiButton variant="ghost" :icon="RotateCcw" @click="reset">เลือกไฟล์ใหม่</UiButton><UiButton :icon="Upload" :loading="isImporting" :disabled="!importableRows.length" @click="handleImport">ยืนยันนำเข้า {{ importableRows.length }} รายการ</UiButton></div>
    </template>
    <template v-else>
      <UiAlert tone="success" title="นำเข้าข้อมูลสำเร็จ">เพิ่มข้อมูลใหม่ {{ result.created }} รายการ และอัปเดตข้อมูลเดิม {{ result.updated }} รายการ</UiAlert>
      <UiButton v-if="credentials.length" class="mt-4" variant="secondary" :icon="FileSpreadsheet" @click="handleDownloadCredentials">ดาวน์โหลดรหัสผ่านชั่วคราว (Excel)</UiButton>
      <div class="mt-5 flex justify-end"><UiButton @click="emit('close')">ปิด</UiButton></div>
    </template>
  </div>
</template>
