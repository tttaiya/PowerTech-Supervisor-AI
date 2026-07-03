<template>
  <div class="retrieval-page">
    <header class="retrieval-hero">
      <div class="retrieval-hero-copy">
        <div class="retrieval-eyebrow">KNOWLEDGE RETRIEVAL</div>
        <h1>知识检索</h1>
        <p>用自然语言在已入库内容中检索高相关片段，支持限定知识库、标签过滤与重排序。</p>
      </div>
    </header>

    <section class="search-panel" aria-label="知识检索条件">
      <div class="query-row">
        <el-input
          v-model="query"
          type="textarea"
          :rows="4"
          resize="none"
          placeholder="输入要检索的问题或关键词"
          class="query-input"
          @keydown.enter="handleQueryEnter"
        />
        <div class="query-actions">
          <el-button type="primary" :loading="searching" :disabled="searching" @click="submitSearch">
            搜索
          </el-button>
          <el-button text :disabled="searching" @click="resetFilters">重置条件</el-button>
        </div>
      </div>

      <div class="filter-grid">
        <div class="filter-field kb-field">
          <label>检索范围</label>
          <el-select
            v-model="selectedKnowledgeBaseIds"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            clearable
            :loading="kbLoading"
            placeholder="全部知识库"
            class="wide-control"
          >
            <el-option
              v-for="kb in knowledgeBases"
              :key="kb.id"
              :label="kb.name"
              :value="kb.id"
            />
          </el-select>
          <p v-if="kbError" class="field-hint error">{{ kbError }}</p>
          <p v-else class="field-hint">未选择时检索全部知识库</p>
        </div>

        <div class="filter-field">
          <label>标签</label>
          <el-input v-model="tagsInput" clearable placeholder="多个标签用逗号或空格分隔" />
        </div>

        <div class="filter-field mode-field">
          <label>检索模式</label>
          <el-radio-group v-model="mode" class="mode-group">
            <el-radio-button label="VECTOR">语义向量检索</el-radio-button>
            <el-radio-button label="VECTOR_RERANK">向量检索 + 重排序</el-radio-button>
          </el-radio-group>
        </div>

        <div class="filter-field compact-field">
          <label>Top K</label>
          <el-input-number v-model="topK" :min="1" :max="100" :step="1" controls-position="right" />
        </div>

        <div class="filter-field compact-field">
          <label>相似度阈值</label>
          <el-input-number
            v-model="similarityThreshold"
            :min="0"
            :max="1"
            :step="0.05"
            :precision="2"
            controls-position="right"
          />
        </div>

        <template v-if="mode === 'VECTOR_RERANK'">
          <div class="filter-field compact-field">
            <label>Rerank Top N</label>
            <el-input-number v-model="rerankTopN" :min="1" :max="100" :step="1" controls-position="right" />
          </div>

          <div class="filter-field compact-field">
            <label>重排序阈值</label>
            <el-input-number
              v-model="rerankThreshold"
              :min="0"
              :max="1"
              :step="0.05"
              :precision="2"
              controls-position="right"
            />
          </div>
        </template>
      </div>
    </section>

    <section class="result-panel" aria-label="检索结果">
      <div class="result-toolbar">
        <div>
          <h2>结果</h2>
          <span v-if="hasSearched && !searching && !searchError">
            {{ resultTotal }} 条结果
            <template v-if="elapsedMs !== null"> · {{ elapsedMs }} ms</template>
          </span>
          <span v-else>输入问题后开始检索</span>
        </div>
      </div>

      <el-alert
        v-if="degradedMode"
        title="当前检索已降级"
        type="warning"
        :closable="false"
        show-icon
        class="result-alert"
      />

      <el-alert
        v-if="effectiveModeNotice"
        :title="effectiveModeNotice"
        type="info"
        :closable="false"
        show-icon
        class="result-alert"
      />

      <div v-if="!hasSearched && !searching" class="state-box">
        <div class="state-title">开始一次知识检索</div>
        <p>输入自然语言问题，按 Enter 或点击搜索。Shift + Enter 可在搜索框内换行。</p>
      </div>

      <div v-else-if="searching" class="state-box">
        <el-skeleton :rows="6" animated />
      </div>

      <div v-else-if="searchError" class="state-box error-state">
        <div class="state-title">检索失败</div>
        <p>{{ searchError }}</p>
      </div>

      <div v-else-if="!records.length" class="state-box">
        <div class="state-title">没有找到匹配结果</div>
        <p>可以放宽阈值、减少标签条件，或换一种表述重新检索。</p>
      </div>

      <div v-else class="result-list">
        <RetrievalResultCard
          v-for="(record, index) in records"
          :key="record.chunkId ?? `${record.docId || 'doc'}-${index}`"
          :result="record"
          :rank="index + 1"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listKnowledgeBases, type KnowledgeBaseVO } from '@/api/modules/knowledge-base'
import {
  searchRetrieval,
  type RetrievalMode,
  type RetrievalSearchRecord,
  type RetrievalSearchRequest,
} from '@/api/modules/retrieval'
import RetrievalResultCard from '@/components/knowledge/RetrievalResultCard.vue'

const query = ref('')
const tagsInput = ref('')
const mode = ref<RetrievalMode>('VECTOR')
const topK = ref(10)
const similarityThreshold = ref(0.3)
const rerankTopN = ref(10)
const rerankThreshold = ref(0)
const selectedKnowledgeBaseIds = ref<number[]>([])

const knowledgeBases = ref<KnowledgeBaseVO[]>([])
const kbLoading = ref(false)
const kbError = ref('')

const searching = ref(false)
const hasSearched = ref(false)
const searchError = ref('')
const records = ref<RetrievalSearchRecord[]>([])
const resultTotal = ref(0)
const elapsedMs = ref<number | null>(null)
const effectiveMode = ref<string | null>(null)
const modeSource = ref<string | null>(null)
const degradedMode = ref(false)
const requestedMode = ref<RetrievalMode | null>(null)

const parsedTags = computed(() =>
  tagsInput.value
    .split(/[\s,，;；]+/)
    .map((tag) => tag.trim())
    .filter(Boolean),
)

const effectiveModeNotice = computed(() => {
  if (!hasSearched.value || !effectiveMode.value || !requestedMode.value) return ''
  if (effectiveMode.value === requestedMode.value) return ''
  const source = modeSource.value ? `，来源：${modeSource.value}` : ''
  return `实际检索模式：${modeLabel(effectiveMode.value)}${source}`
})

onMounted(() => {
  loadKnowledgeBases()
})

async function loadKnowledgeBases() {
  kbLoading.value = true
  kbError.value = ''
  try {
    const resp = await listKnowledgeBases({
      isDeleted: 0,
      pageNum: 1,
      pageSize: 200,
    })
    if (resp.code !== 0) {
      kbError.value = resp.message || '知识库列表加载失败'
      knowledgeBases.value = []
      return
    }
    knowledgeBases.value = resp.data?.records || []
  } catch (error) {
    kbError.value = errorMessage(error, '知识库列表加载失败')
    knowledgeBases.value = []
  } finally {
    kbLoading.value = false
  }
}

function handleQueryEnter(event: KeyboardEvent) {
  if (event.shiftKey) return
  event.preventDefault()
  submitSearch()
}

async function submitSearch() {
  const trimmedQuery = query.value.trim()
  if (!trimmedQuery) {
    ElMessage.warning('请输入检索内容')
    return
  }
  if (searching.value) return

  topK.value = normalizeNumber(topK.value, 10, 1, 100)
  similarityThreshold.value = normalizeNumber(similarityThreshold.value, 0.3, 0, 1)
  rerankTopN.value = normalizeNumber(rerankTopN.value, 10, 1, 100)
  rerankThreshold.value = normalizeNumber(rerankThreshold.value, 0, 0, 1)

  const payload: RetrievalSearchRequest = {
    query: trimmedQuery,
    mode: mode.value,
    topK: topK.value,
    similarityThreshold: similarityThreshold.value,
  }

  if (selectedKnowledgeBaseIds.value.length) {
    payload.knowledgeBaseIds = [...selectedKnowledgeBaseIds.value]
  }
  if (parsedTags.value.length) {
    payload.tags = parsedTags.value
  }
  if (mode.value === 'VECTOR_RERANK') {
    payload.rerankTopN = rerankTopN.value
    payload.rerankThreshold = rerankThreshold.value
  }

  searching.value = true
  hasSearched.value = true
  searchError.value = ''
  requestedMode.value = mode.value
  degradedMode.value = false
  effectiveMode.value = null
  modeSource.value = null

  try {
    const data = await searchRetrieval(payload)
    records.value = data?.records || []
    resultTotal.value = data?.total ?? records.value.length
    elapsedMs.value = data?.elapsedMs ?? null
    effectiveMode.value = data?.effectiveMode || null
    modeSource.value = data?.modeSource || null
    degradedMode.value = Boolean(data?.degradedMode)
  } catch (error) {
    records.value = []
    resultTotal.value = 0
    elapsedMs.value = null
    searchError.value = errorMessage(error, '检索请求失败')
  } finally {
    searching.value = false
  }
}

function resetFilters() {
  selectedKnowledgeBaseIds.value = []
  tagsInput.value = ''
  mode.value = 'VECTOR'
  topK.value = 10
  similarityThreshold.value = 0.3
  rerankTopN.value = 10
  rerankThreshold.value = 0
  searchError.value = ''
}

function modeLabel(value: string) {
  const map: Record<string, string> = {
    VECTOR: '语义向量检索',
    VECTOR_RERANK: '向量检索 + 重排序',
  }
  return map[value] || value
}

function normalizeNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(Math.max(numeric, min), max)
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}
</script>

<style scoped>
.retrieval-page {
  width: 100%;
}

.retrieval-hero {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 34px;
}

.retrieval-hero-copy {
  max-width: 760px;
}

.retrieval-eyebrow {
  margin-bottom: 10px;
  color: var(--km-green);
  font-family: "SF Mono", "Cascadia Mono", "Roboto Mono", Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.retrieval-hero h1 {
  margin: 0;
  color: var(--km-ink);
  font-size: clamp(32px, 4vw, 40px);
  font-weight: 720;
  line-height: 1.08;
  letter-spacing: 0;
}

.retrieval-hero p {
  max-width: 660px;
  margin: 14px 0 0;
  color: var(--km-muted);
  font-size: 15px;
}

.search-panel {
  margin-bottom: 28px;
  padding: 18px 0 22px;
  border-top: 1px solid rgba(217, 217, 221, 0.72);
  border-bottom: 1px solid rgba(217, 217, 221, 0.72);
}

.query-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 18px;
}

.query-input :deep(.el-textarea__inner) {
  min-height: 116px !important;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 0 0 1px var(--km-border-light) inset;
}

.query-input :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px var(--km-focus) inset, 0 0 0 4px rgba(76, 110, 230, 0.1);
}

.query-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.query-actions :deep(.el-button) {
  width: 100%;
  min-height: 42px;
  margin-left: 0;
}

.filter-grid {
  display: grid;
  grid-template-columns: minmax(260px, 1.45fr) minmax(220px, 1fr) minmax(300px, 1.1fr) repeat(2, minmax(140px, 0.56fr));
  gap: 16px;
  align-items: start;
}

.filter-field {
  min-width: 0;
}

.filter-field label {
  display: block;
  margin-bottom: 8px;
  color: var(--km-muted);
  font-size: 12px;
  font-weight: 640;
  line-height: 1.2;
}

.wide-control,
.filter-field :deep(.el-input-number) {
  width: 100%;
}

.mode-field {
  min-width: 300px;
}

.mode-group {
  display: flex;
  width: 100%;
}

.mode-group :deep(.el-radio-button) {
  flex: 1;
}

.mode-group :deep(.el-radio-button__inner) {
  width: 100%;
  border-color: var(--km-border-light);
  font-weight: 560;
}

.mode-group :deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 12px 0 0 12px;
}

.mode-group :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 12px 12px 0;
}

.field-hint {
  margin: 7px 0 0;
  color: var(--km-muted);
  font-size: 12px;
}

.field-hint.error {
  color: #b53b2d;
}

.result-panel {
  padding-top: 2px;
}

.result-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 14px;
}

.result-toolbar h2 {
  margin: 0;
  color: var(--km-ink);
  font-size: 22px;
  font-weight: 680;
  line-height: 1.2;
}

.result-toolbar span {
  display: inline-block;
  margin-top: 4px;
  color: var(--km-muted);
  font-size: 13px;
}

.result-alert {
  margin-bottom: 12px;
  border-radius: 14px;
}

.state-box {
  padding: 58px 20px;
  border: 1px solid rgba(217, 217, 221, 0.84);
  border-radius: 18px;
  color: var(--km-muted);
  background: rgba(255, 255, 255, 0.68);
  box-shadow: var(--km-shadow-soft);
  text-align: center;
}

.state-title {
  margin-bottom: 8px;
  color: var(--km-ink);
  font-size: 18px;
  font-weight: 680;
}

.state-box p {
  margin: 0;
  font-size: 14px;
}

.error-state {
  border-color: rgba(181, 59, 45, 0.24);
  background: rgba(181, 59, 45, 0.04);
}

.error-state .state-title {
  color: #b53b2d;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (max-width: 1280px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .kb-field,
  .mode-field {
    min-width: 0;
  }
}

@media (max-width: 768px) {
  .retrieval-hero {
    margin-bottom: 26px;
  }

  .query-row,
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .query-actions {
    flex-direction: row;
  }

  .mode-group {
    flex-direction: column;
  }

  .mode-group :deep(.el-radio-button__inner) {
    border-radius: 12px !important;
    border-left: 1px solid var(--km-border-light);
  }
}
</style>
