<template>
  <article class="retrieval-card">
    <div class="rank-badge">#{{ rank }}</div>

    <div class="card-body">
      <header class="card-header">
        <div class="title-group">
          <h3>{{ result.docName || '未命名文档' }}</h3>
          <div class="source-line">
            <span>{{ result.kbName || fallbackKbName }}</span>
            <span v-if="result.chapterPath">{{ result.chapterPath }}</span>
          </div>
        </div>

        <div class="score-group">
          <span class="score-pill">相似度 {{ formatScore(result.similarityScore) }}</span>
          <span v-if="hasRerankScore" class="score-pill rerank">
            重排序 {{ formatScore(result.rerankScore) }}
          </span>
        </div>
      </header>

      <div v-if="visibleTags.length" class="tag-row">
        <el-tag
          v-for="tag in visibleTags"
          :key="tag"
          size="small"
          effect="plain"
          round
          class="result-tag"
        >
          {{ tag }}
        </el-tag>
      </div>

      <p class="content" :class="{ collapsed: shouldCollapse && !expanded }">
        {{ contentText }}
      </p>

      <button v-if="shouldCollapse" class="expand-button" type="button" @click="expanded = !expanded">
        {{ expanded ? '收起' : '展开' }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RetrievalSearchRecord } from '@/api/modules/retrieval'

const props = defineProps<{
  result: RetrievalSearchRecord
  rank: number
}>()

const expanded = ref(false)

const contentText = computed(() => props.result.content?.trim() || '暂无命中正文')
const shouldCollapse = computed(() => contentText.value.length > 360)
const visibleTags = computed(() => (props.result.tags || []).filter(Boolean))
const fallbackKbName = computed(() => (props.result.kbId ? `知识库 ${props.result.kbId}` : '未知知识库'))
const hasRerankScore = computed(() => props.result.rerankScore !== null && props.result.rerankScore !== undefined)

function formatScore(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-'
  }
  return Number(value).toFixed(4)
}
</script>

<style scoped>
.retrieval-card {
  position: relative;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(217, 217, 221, 0.84);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: var(--km-shadow-soft);
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(0, 60, 51, 0.1);
  border-radius: 14px;
  color: var(--km-green);
  background: rgba(237, 252, 233, 0.72);
  font-weight: 720;
}

.card-body {
  min-width: 0;
}

.card-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.title-group {
  min-width: 0;
}

.title-group h3 {
  margin: 0;
  overflow: hidden;
  color: var(--km-ink);
  font-size: 17px;
  font-weight: 680;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 6px;
  color: var(--km-muted);
  font-size: 13px;
}

.source-line span + span::before {
  margin-right: 12px;
  color: var(--km-border);
  content: "/";
}

.score-group {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  max-width: 280px;
}

.score-pill {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--km-green);
  background: rgba(237, 252, 233, 0.72);
  font-size: 12px;
  font-weight: 640;
  white-space: nowrap;
}

.score-pill.rerank {
  color: #8a3d2d;
  background: rgba(255, 119, 89, 0.12);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.result-tag {
  border-color: rgba(0, 60, 51, 0.14);
  color: var(--km-green);
  background: rgba(255, 255, 255, 0.68);
  font-weight: 560;
}

.content {
  margin: 14px 0 0;
  color: var(--km-text);
  font-size: 14px;
  line-height: 1.72;
  white-space: pre-wrap;
  word-break: break-word;
}

.content.collapsed {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 5;
}

.expand-button {
  margin-top: 10px;
  padding: 0;
  border: 0;
  color: var(--km-focus);
  background: transparent;
  cursor: pointer;
  font-weight: 620;
}

@media (max-width: 768px) {
  .retrieval-card {
    grid-template-columns: 1fr;
  }

  .card-header {
    flex-direction: column;
  }

  .score-group {
    justify-content: flex-start;
    max-width: none;
  }
}
</style>
