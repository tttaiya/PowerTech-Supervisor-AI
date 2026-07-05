<template>
  <div class="ks-arch">
    <article v-for="node in nodes" :key="node.name" class="ks-arch-node" :class="`ks-arch-node--${node.kind}`" :title="node.desc">
      <span>{{ node.kind }}</span>
      <strong>{{ node.name }}</strong>
      <p>{{ node.desc }}</p>
    </article>
  </div>
</template>

<script setup lang="ts">
const nodes = [
  { kind: 'ui', name: 'knowledge-web', desc: 'Vue 3 前端，承载知识库、审核、检索、统计与展示页。' },
  { kind: 'gw', name: 'Gateway / Nginx', desc: '统一入口、静态资源与接口转发。' },
  { kind: 'adm', name: 'Admin Service', desc: '知识库、文档、配置、统计和审核接口。' },
  { kind: 'wrk', name: 'Worker Service', desc: '异步执行解析、OCR、切片、向量化任务。' },
  { kind: 'ai', name: 'FastAPI AI Service', desc: 'Embedding、Rerank、OCR 与模型能力适配。' },
  { kind: 'vec', name: 'ChromaDB', desc: '向量检索空间，存储 chunk embedding。' },
  { kind: 'data', name: 'MySQL / MinIO / RabbitMQ', desc: '元数据、原文对象存储和任务队列。' },
  { kind: 'search', name: 'km-search-service', desc: '语义检索、重排序和命中证据返回。' },
]
</script>
