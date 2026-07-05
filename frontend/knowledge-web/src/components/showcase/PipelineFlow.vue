<template>
  <div ref="flowEl" class="ks-pipeline" :class="{ 'is-live': live }">
    <article
      v-for="(node, index) in nodes"
      :key="node.title"
      class="ks-pipeline-node"
      :class="{ 'is-active': live && index <= activeIndex }"
      :style="{ '--delay': `${index * 110}ms` }"
      :title="node.detail"
    >
      <div class="ks-pipeline-node__icon">{{ node.icon }}</div>
      <div>
        <strong>{{ node.title }}</strong>
        <p>{{ node.summary }}</p>
      </div>
      <span>{{ String(index + 1).padStart(2, '0') }}</span>
    </article>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const nodes = [
  {
    icon: 'UP',
    title: '上传文档',
    summary: 'PDF、DOCX、PPTX、XLSX、MD、TXT、图片统一接入。',
    detail: '多格式文档进入知识库，保留来源、标签、上传人和处理状态。',
  },
  {
    icon: 'OCR',
    title: 'OCR / 文档解析',
    summary: '扫描件和常规文档进入文本抽取链路。',
    detail: '扫描版 PDF 可通过 OCR 提取文本，解析失败会保留错误阶段便于追踪。',
  },
  {
    icon: 'CUT',
    title: '语义切片',
    summary: '按知识库策略生成可审核知识片段。',
    detail: '保留页码、章节路径、字符数等上下文，支持后续编辑、拆分、合并。',
  },
  {
    icon: 'VEC',
    title: 'Embedding 向量化',
    summary: '每个切片生成独立向量并记录 vectorId。',
    detail: '向量状态独立追踪，为语义检索、重排序和阈值过滤提供基础。',
  },
  {
    icon: 'DB',
    title: 'ChromaDB 入库',
    summary: '向量与元数据写入可检索空间。',
    detail: '文档元数据、切片内容和向量库状态形成可追溯知识资产。',
  },
  {
    icon: 'QA',
    title: '人工审核',
    summary: '编辑、拆分、合并、删除，质量闭环确认。',
    detail: '审核通过后才进入 READY，可查看历史记录和处理意见。',
  },
  {
    icon: 'OK',
    title: 'READY',
    summary: '通过审核的知识进入稳定可检索状态。',
    detail: 'READY 文档对检索侧开放，避免低质量片段直接影响召回。',
  },
  {
    icon: 'HIT',
    title: '检索命中',
    summary: '语义检索 + 向量检索 + 重排序展示来源证据。',
    detail: '结果携带文档名、知识库、相似度、页码、chunkId 和命中摘要。',
  },
]

const flowEl = ref<HTMLElement | null>(null)
const live = ref(false)
const activeIndex = ref(0)
let observer: IntersectionObserver | null = null
let timer = 0

onMounted(() => {
  if (!flowEl.value) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    live.value = true
    activeIndex.value = nodes.length - 1
    return
  }
  observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return
      live.value = true
      timer = window.setInterval(() => {
        activeIndex.value = (activeIndex.value + 1) % nodes.length
      }, 950)
      observer?.disconnect()
    },
    { threshold: 0.24 },
  )
  observer.observe(flowEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (timer) window.clearInterval(timer)
})
</script>
