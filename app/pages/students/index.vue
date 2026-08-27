<script setup lang="ts">
definePageMeta({ roles: ['LECTURER', 'ADMIN'] })
const definition = useWorkflowDefinition('students')
const { user } = useSession()
const { request } = useApiClient()
const summary = ref({ total: 0, active: 0, pending: 0, suspended: 0 })

onMounted(async () => {
  if (user.value?.role !== 'ADMIN') return
  try { summary.value = await request<typeof summary.value>('/api/students/summary') } catch { summary.value = { total: 0, active: 0, pending: 0, suspended: 0 } }
})
</script>
<template>
  <WorkflowListPage :definition="definition">
    <template v-if="user?.role === 'ADMIN'" #summary>
      <section class="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="สรุปสถานะบัญชีนักศึกษา">
        <MetricCard label="นักศึกษาทั้งหมด" :value="summary.total" icon="i-lucide-users" to="/students" tone="primary" helper="บัญชีทั้งหมดในระบบ" />
        <MetricCard label="เปิดใช้งานแล้ว" :value="summary.active" icon="i-lucide-circle-check-big" to="/students?status=ACTIVE" tone="success" :helper="summary.total ? `${((summary.active / summary.total) * 100).toFixed(2)}%` : '0.00%'" />
        <MetricCard label="ระงับบัญชี" :value="summary.suspended" icon="i-lucide-circle-pause" to="/students?status=SUSPENDED" tone="error" :helper="summary.total ? `${((summary.suspended / summary.total) * 100).toFixed(2)}%` : '0.00%'" />
      </section>
    </template>
  </WorkflowListPage>
</template>
