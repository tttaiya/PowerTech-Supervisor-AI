<template>
  <RouterView v-if="isReportRoute" />
  <KnowledgeLayout v-else>
    <RouterView />
  </KnowledgeLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import KnowledgeLayout from '@/layout/KnowledgeLayout.vue'

const route = useRoute()
const isReportRoute = computed(() => route.matched.some((record) => record.meta.fullscreen))
</script>
