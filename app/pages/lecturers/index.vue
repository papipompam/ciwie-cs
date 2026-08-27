<script setup lang="ts">
definePageMeta({ roles: ['LECTURER', 'ADMIN'] })
const definition = useWorkflowDefinition('lecturers')
</script>
<template><WorkflowListPage :definition="definition" /></template>
