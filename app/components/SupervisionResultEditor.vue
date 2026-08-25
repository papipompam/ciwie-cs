<script setup lang="ts">
interface VisitMember {
  studentTermId: string
  studentTerm?: { student?: { studentCode?: string, firstNameTh?: string, lastNameTh?: string } }
  result?: { outcome?: string, summary?: string, version?: number } | null
}

const props = defineProps<{ record: Record<string, unknown> }>()
const emit = defineEmits<{ reload: [] }>()
const { request } = useApiClient()
const { user } = useSession()
const toast = useToast()
const busy = ref('')
const values = reactive<Record<string, { outcome: 'COMPLETED' | 'ABSENT' | 'MAKEUP_REQUIRED', summary: string, reason: string }>>({})
const members = computed(() => Array.isArray(props.record.students) ? props.record.students as VisitMember[] : [])
const editable = computed(() => user.value?.role === 'LECTURER' && String(props.record.status) !== 'CANCELLED')

watch(members, rows => {
  for (const row of rows) values[row.studentTermId] ||= { outcome: (row.result?.outcome as 'COMPLETED' | 'ABSENT' | 'MAKEUP_REQUIRED') || 'COMPLETED', summary: row.result?.summary || '', reason: '' }
}, { immediate: true })

async function save(member: VisitMember) {
  if (!editable.value || busy.value) return
  const value = values[member.studentTermId]!
  if (member.result && value.reason.trim().length < 3) {
    toast.add({ title: 'ต้องระบุเหตุผลการแก้ไข', color: 'warning' }); return
  }
  busy.value = member.studentTermId
  try {
    await request(`/api/visits/${props.record.id}/student-results/${member.studentTermId}`, { method: 'PUT', body: {
      outcome: value.outcome, ...(value.summary.trim() ? { summary: value.summary.trim() } : {}),
      ...(member.result ? { expectedVersion: member.result.version, reason: value.reason.trim() } : {})
    } })
    toast.add({ title: 'บันทึกผลนิเทศแล้ว', color: 'primary' }); emit('reload')
  } finally { busy.value = '' }
}
</script>

<template>
  <section v-if="members.length" class="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 class="font-semibold">ผลนิเทศรายนักศึกษา</h2>
    <div class="mt-4 space-y-4">
      <div v-for="member in members" :key="member.studentTermId" class="grid gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-4">
        <div><p class="font-medium">{{ member.studentTerm?.student?.firstNameTh }} {{ member.studentTerm?.student?.lastNameTh }}</p><p class="text-xs text-slate-500">{{ member.studentTerm?.student?.studentCode }}</p></div>
        <template v-if="editable">
          <select v-model="values[member.studentTermId]!.outcome" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700"><option value="COMPLETED">เสร็จสิ้น</option><option value="ABSENT">ขาด</option><option value="MAKEUP_REQUIRED">ต้องนัดชดเชย</option></select>
          <input v-model="values[member.studentTermId]!.summary" class="min-h-11 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700" placeholder="สรุปผล">
          <div class="flex gap-2"><input v-if="member.result" v-model="values[member.studentTermId]!.reason" class="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700" placeholder="เหตุผลแก้ไข"><UButton :loading="busy === member.studentTermId" label="บันทึก" @click="save(member)" /></div>
        </template>
        <template v-else>
          <p class="text-sm">{{ values[member.studentTermId]!.outcome }}</p>
          <p class="text-sm text-slate-600 dark:text-slate-300">{{ values[member.studentTermId]!.summary || 'ไม่มีสรุปผล' }}</p>
        </template>
      </div>
    </div>
  </section>
</template>
