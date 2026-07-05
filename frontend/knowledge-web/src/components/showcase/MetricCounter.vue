<template>
  <article ref="cardEl" class="ks-metric-card">
    <span class="ks-metric-card__scan" aria-hidden="true"></span>
    <div class="ks-metric-card__label">{{ label }}</div>
    <div class="ks-metric-card__value">
      <template v-if="isNumeric">{{ displayValue.toLocaleString() }}{{ suffix }}</template>
      <template v-else>{{ value }}</template>
    </div>
    <p>{{ description }}</p>
    <small v-if="source">{{ source }}</small>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    value: number | string
    description: string
    suffix?: string
    source?: string
  }>(),
  {
    suffix: '',
    source: '',
  },
)

const cardEl = ref<HTMLElement | null>(null)
const displayValue = ref(0)
const isNumeric = computed(() => typeof props.value === 'number' && Number.isFinite(props.value))
let observer: IntersectionObserver | null = null
let frame = 0

function animateCounter() {
  if (!isNumeric.value) return
  const target = Math.max(0, Number(props.value))
  const duration = 950
  const start = performance.now()

  function tick(now: number) {
    const progress = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    displayValue.value = Math.round(target * eased)
    if (progress < 1) {
      frame = window.requestAnimationFrame(tick)
    }
  }

  frame = window.requestAnimationFrame(tick)
}

onMounted(() => {
  if (!cardEl.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    displayValue.value = isNumeric.value ? Number(props.value) : 0
    return
  }
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        animateCounter()
        observer?.disconnect()
      }
    },
    { threshold: 0.42 },
  )
  observer.observe(cardEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (frame) window.cancelAnimationFrame(frame)
})
</script>
