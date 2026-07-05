<template>
  <section ref="sectionEl" class="ks-section" :class="{ 'is-visible': visible }" :id="id">
    <div class="ks-section__header" :class="{ 'ks-section__header--center': center }">
      <span class="ks-eyebrow">{{ eyebrow }}</span>
      <h2>{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

withDefaults(
  defineProps<{
    id?: string
    eyebrow: string
    title: string
    description?: string
    center?: boolean
  }>(),
  {
    id: undefined,
    description: '',
    center: false,
  },
)

const sectionEl = ref<HTMLElement | null>(null)
const visible = ref(false)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!sectionEl.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    visible.value = true
    return
  }
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        visible.value = true
        observer?.disconnect()
      }
    },
    { threshold: 0.18 },
  )
  observer.observe(sectionEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>
