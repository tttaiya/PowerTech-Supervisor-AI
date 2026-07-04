<template>
  <div class="km-route-scan" :class="{ active: routeScanActive }"></div>
  <RouterView v-if="isReportRoute" v-slot="{ Component, route }">
    <Transition name="km-page-fade" mode="out-in" @before-enter="kickRouteScan">
      <component :is="Component" :key="route.fullPath" />
    </Transition>
  </RouterView>
  <KnowledgeLayout v-else>
    <RouterView v-slot="{ Component, route }">
      <Transition name="km-page-fade" mode="out-in" @before-enter="kickRouteScan">
        <component :is="Component" :key="route.fullPath" />
      </Transition>
    </RouterView>
  </KnowledgeLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import KnowledgeLayout from '@/layout/KnowledgeLayout.vue'

const route = useRoute()
const isReportRoute = computed(() => route.matched.some((record) => record.meta.fullscreen))
const routeScanActive = ref(false)

function kickRouteScan() {
  routeScanActive.value = false
  window.requestAnimationFrame(() => {
    routeScanActive.value = true
    window.setTimeout(() => {
      routeScanActive.value = false
    }, 520)
  })
}
</script>

<style>
.km-route-scan {
  position: fixed;
  top: 76px;
  left: 264px;
  z-index: 80;
  width: calc(100vw - 264px);
  height: 2px;
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(90deg, transparent, rgba(114, 239, 182, 0.92), rgba(113, 215, 255, 0.72), transparent);
  filter: drop-shadow(0 0 12px rgba(114, 239, 182, 0.42));
  transform: translateX(-100%);
}

.km-route-scan.active {
  opacity: 1;
  animation: km-route-scan 520ms var(--km-ease-out) both;
}

@keyframes km-route-scan {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(100%);
  }
}

@media (max-width: 768px) {
  .km-route-scan {
    top: 66px;
    left: 0;
    width: 100vw;
  }
}
</style>
