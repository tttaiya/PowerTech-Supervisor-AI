<template>
  <div class="ks-slash-intro" :class="{ 'is-cutting': cutting }" role="dialog" aria-label="知识管理系统开场动画">
    <div class="ks-intro-grid" aria-hidden="true"></div>
    <div class="ks-intro-panel ks-intro-panel--top" aria-hidden="true"></div>
    <div class="ks-intro-panel ks-intro-panel--bottom" aria-hidden="true"></div>
    <div class="ks-intro-blade" aria-hidden="true"></div>

    <div class="ks-intro-core">
      <span class="ks-intro-kicker">AI Powered Knowledge Pipeline</span>
      <h1>知识管理系统</h1>
      <p>Enterprise Knowledge Workspace</p>
      <strong>电力行业知识中枢</strong>

      <div class="ks-intro-progress" aria-hidden="true">
        <span></span>
      </div>
      <div class="ks-intro-stage">{{ stageText }}</div>
    </div>

    <button class="ks-intro-skip" type="button" @click="$emit('skip')">跳过开场</button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const stages = ['Initializing Knowledge Engine', 'Loading Vector Space', 'Building Review Workflow', 'Ready']
const stageText = ref(stages[0])
const cutting = ref(false)
let timers: number[] = []

onMounted(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) {
    timers.push(window.setTimeout(() => emitDone(), 220))
    return
  }

  stages.forEach((stage, index) => {
    timers.push(
      window.setTimeout(() => {
        stageText.value = stage
      }, index * 430),
    )
  })
  timers.push(
    window.setTimeout(() => {
      cutting.value = true
    }, 1450),
  )
  timers.push(window.setTimeout(() => emitDone(), 2650))
})

onBeforeUnmount(() => {
  timers.forEach((timer) => window.clearTimeout(timer))
  timers = []
})

const emit = defineEmits<{
  (event: 'done'): void
  (event: 'skip'): void
}>()

function emitDone() {
  emit('done')
}
</script>
