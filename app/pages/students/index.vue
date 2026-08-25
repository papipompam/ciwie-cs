<script setup lang="ts">
definePageMeta({ roles: ['LECTURER', 'ADMIN'] })
const definition = useWorkflowDefinition('students')
</script>
<template><WorkflowListPage :definition="definition" /></template>

