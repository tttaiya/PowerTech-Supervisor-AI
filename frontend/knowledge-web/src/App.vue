<template>
  <div class="km-route-scan" :class="{ active: routeScanActive || routeLoading, fullscreen: isFullscreenRoute }"></div>
  <div v-if="routeLoading" class="km-route-loading" :class="{ fullscreen: isFullscreenRoute }" aria-live="polite">
    <div class="km-route-loading__card">
      <span class="km-route-loading__scan"></span>
      <strong>正在进入工作台</strong>
      <p>正在加载页面资源与数据，请稍候。</p>
      <div class="km-route-loading__skeleton">
        <i></i>
        <i></i>
        <i></i>
      </div>
    </div>
  </div>
  <div v-if="routeError" class="km-route-error" :class="{ fullscreen: isFullscreenRoute }" role="alert">
    <div class="km-route-error__card">
      <span>ROUTE ERROR</span>
      <h1>数据加载失败，请重试</h1>
      <p>{{ routeError }}</p>
      <div class="km-route-error__actions">
        <button type="button" @click="retryRoute">重试</button>
        <a href="/">返回智能问答</a>
        <a href="/knowledge/bases">返回知识管理</a>
      </div>
    </div>
  </div>
  <RouterView v-if="isFullscreenRoute" v-slot="{ Component, route }">
    <Transition name="km-page-fade" mode="out-in" @before-enter="kickRouteScan">
      <Suspense>
        <component :is="Component" :key="route.fullPath" />
        <template #fallback>
          <div class="km-route-fallback fullscreen">
            <div class="km-route-loading__card">
              <span class="km-route-loading__scan"></span>
              <strong>页面加载中</strong>
              <p>正在准备展示内容。</p>
            </div>
          </div>
        </template>
      </Suspense>
    </Transition>
  </RouterView>
  <KnowledgeLayout v-else>
    <RouterView v-slot="{ Component, route }">
      <Transition name="km-page-fade" mode="out-in" @before-enter="kickRouteScan">
        <Suspense>
          <component :is="Component" :key="route.fullPath" />
          <template #fallback>
            <div class="km-route-fallback">
              <div class="km-route-loading__card">
                <span class="km-route-loading__scan"></span>
                <strong>页面加载中</strong>
                <p>正在准备知识管理内容。</p>
              </div>
            </div>
          </template>
        </Suspense>
      </Transition>
    </RouterView>
  </KnowledgeLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onErrorCaptured, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KnowledgeLayout from '@/layout/KnowledgeLayout.vue'

const route = useRoute()
const router = useRouter()
const isFullscreenRoute = computed(() => route.matched.some((record) => record.meta.fullscreen))
const routeScanActive = ref(false)
const routeLoading = ref(false)
const routeError = ref('')

let removeBeforeEach: (() => void) | undefined
let removeAfterEach: (() => void) | undefined
let removeOnError: (() => void) | undefined

function kickRouteScan() {
  routeScanActive.value = false
  window.requestAnimationFrame(() => {
    routeScanActive.value = true
    window.setTimeout(() => {
      routeScanActive.value = false
    }, 520)
  })
}

function finishRouteLoading() {
  nextTick(() => {
    routeLoading.value = false
  })
}

function retryRoute() {
  routeError.value = ''
  routeLoading.value = true
  router.replace(route.fullPath).finally(finishRouteLoading)
}

onMounted(() => {
  removeBeforeEach = router.beforeEach((to, from) => {
    if (to.fullPath !== from.fullPath) {
      routeError.value = ''
      routeLoading.value = true
      kickRouteScan()
    }
  })
  removeAfterEach = router.afterEach(() => {
    finishRouteLoading()
  })
  removeOnError = router.onError((error) => {
    routeLoading.value = false
    routeError.value = error instanceof Error ? error.message : '页面资源加载失败'
  })
})

onBeforeUnmount(() => {
  removeBeforeEach?.()
  removeAfterEach?.()
  removeOnError?.()
})

onErrorCaptured((error) => {
  routeLoading.value = false
  routeError.value = error instanceof Error ? error.message : '页面渲染失败'
  return false
})
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

.km-route-scan.fullscreen {
  top: 0;
  left: 0;
  width: 100vw;
}

.km-route-loading,
.km-route-error,
.km-route-fallback {
  position: fixed;
  top: 76px;
  right: 0;
  bottom: 0;
  left: 264px;
  z-index: 79;
  display: grid;
  place-items: center;
  pointer-events: none;
  background:
    radial-gradient(circle at 38% 24%, rgba(114, 239, 182, 0.1), transparent 28%),
    rgba(5, 8, 7, 0.44);
  backdrop-filter: blur(4px);
}

.km-route-loading.fullscreen,
.km-route-error.fullscreen,
.km-route-fallback.fullscreen {
  top: 0;
  left: 0;
}

.km-route-loading__card,
.km-route-error__card {
  position: relative;
  width: min(460px, calc(100vw - 32px));
  padding: 24px;
  overflow: hidden;
  border: 1px solid rgba(193, 227, 212, 0.14);
  border-radius: 24px;
  color: #dbe7e1;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025)),
    rgba(10, 22, 18, 0.86);
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.36), 0 18px 54px rgba(79, 214, 154, 0.14);
  pointer-events: auto;
}

.km-route-loading__scan {
  position: absolute;
  top: 0;
  left: 0;
  width: 48%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(114, 239, 182, 0.95), transparent);
  animation: km-route-card-scan 1.35s linear infinite;
}

.km-route-loading__card strong,
.km-route-error__card h1 {
  display: block;
  margin: 0;
  color: #f4fbf7;
  font-size: 22px;
  font-weight: 760;
  letter-spacing: 0;
}

.km-route-loading__card p,
.km-route-error__card p {
  margin: 8px 0 0;
  color: #a9bbb4;
}

.km-route-loading__skeleton {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.km-route-loading__skeleton i {
  display: block;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04), rgba(114, 239, 182, 0.14), rgba(255, 255, 255, 0.04));
  background-size: 220% 100%;
  animation: km-route-skeleton 1.35s linear infinite;
}

.km-route-loading__skeleton i:nth-child(2) {
  width: 78%;
}

.km-route-loading__skeleton i:nth-child(3) {
  width: 58%;
}

.km-route-error {
  z-index: 90;
  pointer-events: auto;
}

.km-route-error__card {
  border-color: rgba(255, 109, 98, 0.24);
}

.km-route-error__card span {
  display: inline-flex;
  margin-bottom: 8px;
  color: #ffaaa3;
  font-size: 11px;
  font-weight: 760;
  letter-spacing: 0.16em;
}

.km-route-error__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.km-route-error__actions button,
.km-route-error__actions a {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(114, 239, 182, 0.32);
  border-radius: 999px;
  color: #72efb6;
  background: rgba(79, 214, 154, 0.1);
  text-decoration: none;
  cursor: pointer;
  font-weight: 680;
}

@keyframes km-route-scan {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(100%);
  }
}

@keyframes km-route-card-scan {
  from {
    transform: translateX(-120%);
  }

  to {
    transform: translateX(230%);
  }
}

@keyframes km-route-skeleton {
  from {
    background-position: 0% 50%;
  }

  to {
    background-position: 220% 50%;
  }
}

@media (max-width: 768px) {
  .km-route-scan {
    top: 66px;
    left: 0;
    width: 100vw;
  }

  .km-route-loading,
  .km-route-error,
  .km-route-fallback {
    top: 66px;
    left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .km-route-scan.active,
  .km-route-loading__scan,
  .km-route-loading__skeleton i {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
  }
}
</style>
