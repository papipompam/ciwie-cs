<script setup lang="ts">
const props = defineProps<{ record: Record<string, unknown> }>()
const { user } = useSession()
const { request } = useApiClient()
const toast = useToast()
const busy = ref(false)
const subject = ref<'STUDENT' | 'ORGANIZATION'>('STUDENT')
const visitStudentId = ref('')
const templateVersionId = ref('')

const students = computed(() => Array.isArray(props.record.students) ? props.record.students as Array<Record<string, unknown>> : [])
function studentLabel(member: Record<string, unknown>) {
  const term = member.studentTerm as { student?: { studentCode?: string, firstNameTh?: string, lastNameTh?: string } } | undefined
  const student = term?.student
  return [student?.studentCode, student?.firstNameTh, student?.lastNameTh].filter(Boolean).join(' ') || String(member.studentTermId || member.id)
}

watch(subject, () => { templateVersionId.value = '' })

async function createDraft() {
  if (!templateVersionId.value || (subject.value === 'STUDENT' && !visitStudentId.value)) {
    toast.add({ title: 'ข้อมูลไม่ครบ', description: 'กรุณาเลือกผู้รับการประเมินและแบบประเมิน', color: 'warning' })
    return
  }
  busy.value = true
  try {
    const result = subject.value === 'STUDENT'
      ? await request<{ id: string }>('/api/evaluations', { method: 'POST', body: { visitStudentId: visitStudentId.value, templateVersionId: templateVersionId.value, answers: [] } })
      : await request<{ id: string }>('/api/organization-evaluations', { method: 'POST', body: { visitId: String(props.record.id), templateVersionId: templateVersionId.value, answers: [] } })
    toast.add({ title: 'สร้างแบบประเมินฉบับร่างแล้ว', color: 'primary' })
    await navigateTo(`/evaluations/${result.id}?subjectType=${subject.value}`)
  } catch (cause) {
    toast.add({ title: 'สร้างแบบประเมินไม่สำเร็จ', description: cause instanceof Error ? cause.message : 'โปรดลองอีกครั้ง', color: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section v-if="user?.role === 'LECTURER' && !record.isCoverageProjection" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 class="font-semibold">เริ่มแบบประเมิน</h2>
    <p class="mt-1 text-sm text-slate-500">สร้างฉบับร่างสำหรับนักศึกษาหรือสถานประกอบการในรอบนิเทศนี้</p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2">
      <label><span class="mb-1.5 block text-sm font-medium">หัวข้อการประเมิน</span><select v-model="subject" class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><option value="STUDENT">นักศึกษา</option><option value="ORGANIZATION">สถานประกอบการ</option></select></label>
      <label v-if="subject === 'STUDENT'"><span class="mb-1.5 block text-sm font-medium">นักศึกษา</span><select v-model="visitStudentId" required class="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><option value="">เลือกนักศึกษา</option><option v-for="member in students" :key="String(member.id)" :value="String(member.id)">{{ studentLabel(member) }}</option></select></label>
      <LookupSelect v-model="templateVersionId" resource="EVALUATION_TEMPLATES" label="แบบประเมินฉบับที่เผยแพร่" :context="{ subject }" required />
      <div class="flex items-end sm:justify-end"><UButton icon="i-lucide-clipboard-plus" label="สร้างฉบับร่าง" :loading="busy" @click="createDraft" /></div>
    </div>
  </section>
</template>
