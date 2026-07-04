<template>
  <div class="retrieval-page">
    <header class="retrieval-hero">
      <div class="retrieval-hero-copy">
        <div class="retrieval-eyebrow">KNOWLEDGE RETRIEVAL</div>
        <h1>
          知识检索
          <el-tooltip content="支持跨知识库、标签过滤、语义向量召回与重排序检索。" placement="right">
            <span class="km-info-dot">?</span>
          </el-tooltip>
        </h1>
        <p>用自然语言在已入库内容中检索高相关片段，支持限定知识库、标签过滤与重排序。</p>
        <div class="km-chip-row retrieval-hero-chips">
          <span class="km-capability-chip">跨库检索</span>
          <span class="km-capability-chip">标签过滤</span>
          <span class="km-capability-chip">语义向量</span>
          <span class="km-capability-chip">Rerank 重排序</span>
        </div>
      </div>
    </header>

    <section class="retrieval-capabilities" aria-label="检索能力">
      <el-tooltip content="适合直接输入自然语言问题，系统会召回语义相近的知识切片。" placement="top">
        <div class="capability-card">
          <strong>SEMANTIC</strong>
          <span>语义向量检索，面向自然语言问题</span>
        </div>
      </el-tooltip>
      <el-tooltip content="先向量召回，再用重排序模型对结果做精排。" placement="top">
        <div class="capability-card">
          <strong>VECTOR_RERANK</strong>
          <span>向量召回后重排序，提升结果精度</span>
        </div>
      </el-tooltip>
      <el-tooltip content="可限定知识库、标签、Top K 与阈值，适合演示精确筛选能力。" placement="top">
        <div class="capability-card">
          <strong>FILTERS</strong>
          <span>知识库范围、标签、Top K 与阈值可控</span>
        </div>
      </el-tooltip>
    </section>

    <section class="search-panel" aria-label="知识检索条件">
      <div class="query-row">
        <div class="query-box" :class="{ focused: queryFocused, hasText: Boolean(query.trim()) }">
          <el-input
            v-model="query"
            type="textarea"
            :rows="4"
            resize="none"
            placeholder="输入要检索的问题或关键词"
            class="query-input"
            @focus="queryFocused = true"
            @blur="queryFocused = false"
            @keydown.enter="handleQueryEnter"
          />
          <div v-if="query.trim()" class="query-feedback">
            <span class="keyword-flash">{{ queryKeyword }}</span>
            <span>正在准备语义召回</span>
          </div>
        </div>
        <div class="query-actions">
          <el-button type="primary" :loading="searching" :disabled="searching" @click="submitSearch">
            搜索
          </el-button>
          <el-button text :disabled="searching" @click="resetFilters">重置条件</el-button>
        </div>
      </div>

      <div class="example-row">
        <span>推荐问题 / 快速试问</span>
        <el-skeleton v-if="exampleLoading" :rows="1" animated class="example-loading" />
        <button
          v-for="example in activeExampleQueries"
          :key="example"
          type="button"
          class="example-chip"
          @click="useExampleQuery(example)"
        >
          {{ example }}
        </button>
      </div>

      <div class="search-summary-bar">
        <span class="km-meta-chip">当前范围：{{ scopeSummary }}</span>
        <span class="km-meta-chip">检索模式：{{ mode }}</span>
        <span class="km-meta-chip">Top K：{{ topK }}</span>
        <span class="km-meta-chip">阈值：{{ similarityThreshold }}</span>
        <span class="km-meta-chip">标签：{{ parsedTags.length ? parsedTags.join(' / ') : '未过滤' }}</span>
        <span class="km-meta-chip">命中：{{ hasSearched && !searching ? resultTotal : '-' }}</span>
        <span class="km-meta-chip">耗时：{{ hasSearched && !searching ? `${elapsedMs ?? '-'} ms` : '-' }}</span>
      </div>

      <div class="filter-grid" :class="{ bumped: filterPulse }">
        <div class="filter-field kb-field">
          <label>
            检索范围
            <el-tooltip content="选择一个或多个知识库；留空表示在全部活动知识库中检索。" placement="top">
              <span class="km-info-dot">?</span>
            </el-tooltip>
          </label>
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
          <p v-else class="field-hint">未选择时检索全部知识库；选择知识库后自动刷新推荐问题</p>
        </div>

        <div class="filter-field">
          <label>
            标签
            <el-tooltip content="多个标签可用逗号、空格或中文顿号分隔。" placement="top">
              <span class="km-info-dot">?</span>
            </el-tooltip>
          </label>
          <el-input v-model="tagsInput" clearable placeholder="多个标签用逗号或空格分隔" />
        </div>

        <div class="filter-field mode-field">
          <label>
            检索模式
            <el-tooltip content="语义检索速度更快；重排序模式更适合展示高精度结果。" placement="top">
              <span class="km-info-dot">?</span>
            </el-tooltip>
          </label>
          <el-radio-group v-model="mode" class="mode-group">
            <el-radio-button label="SEMANTIC">语义向量检索</el-radio-button>
            <el-radio-button label="VECTOR_RERANK">向量检索 + 重排序</el-radio-button>
          </el-radio-group>
        </div>

        <div class="filter-field compact-field">
          <label>
            Top K
            <el-tooltip content="控制召回候选结果数量。" placement="top">
              <span class="km-info-dot">?</span>
            </el-tooltip>
          </label>
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
        <div v-if="hasSearched" class="result-summary">
          <span class="km-meta-chip">范围：{{ scopeSummary }}</span>
          <span class="km-meta-chip">模式：{{ modeLabel(effectiveMode || requestedMode || mode) }}</span>
          <span class="km-meta-chip">Top K：{{ topK }}</span>
          <span class="km-meta-chip">阈值：{{ similarityThreshold }}</span>
          <span class="km-meta-chip">命中：{{ resultTotal }}</span>
          <span class="km-meta-chip">耗时：{{ elapsedMs ?? '-' }} ms</span>
          <span v-if="parsedTags.length" class="km-meta-chip">标签：{{ parsedTags.join(' / ') }}</span>
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
        <div class="scan-loader">
          <span></span>
          <strong>正在扫描知识切片</strong>
          <p>向量召回、阈值过滤与结果排序正在进行</p>
        </div>
      </div>

      <div v-else-if="searchError" class="state-box error-state">
        <div class="state-title">检索失败</div>
        <p>{{ searchError }}</p>
        <el-button class="state-action" type="primary" @click="submitSearch">重试</el-button>
      </div>

      <div v-else-if="!records.length" class="state-box">
        <div class="state-title">没有找到匹配结果</div>
        <p>可以降低相似度阈值、扩大知识库范围、换一种问法，或检查文档是否 READY。</p>
        <div class="empty-actions">
          <el-button @click="similarityThreshold = Math.max(0, Number((similarityThreshold - 0.05).toFixed(2)))">降低阈值</el-button>
          <el-button @click="selectedKnowledgeBaseIds = []">扩大知识库范围</el-button>
        </div>
      </div>

      <div v-else class="result-list">
        <RetrievalResultCard
          v-for="(record, index) in records"
          :key="record.chunkId ?? `${record.docId || 'doc'}-${index}`"
          :result="record"
          :rank="index + 1"
          :style="{ '--reveal-delay': `${index * 55}ms` }"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchDocumentChunks, fetchDocuments } from '@/api/modules/document'
import { listKnowledgeBases, type KnowledgeBaseVO } from '@/api/modules/knowledge-base'
import {
  searchRetrieval,
  type RetrievalMode,
  type RetrievalSearchRecord,
  type RetrievalSearchRequest,
} from '@/api/modules/retrieval'
import RetrievalResultCard from '@/components/knowledge/RetrievalResultCard.vue'
import { friendlyErrorMessage } from '@/utils/error'

const route = useRoute()
const query = ref('')
const tagsInput = ref('')
const mode = ref<RetrievalMode>('SEMANTIC')
const topK = ref(10)
const similarityThreshold = ref(0.3)
const rerankTopN = ref(10)
const rerankThreshold = ref(0)
const selectedKnowledgeBaseIds = ref<number[]>([])
const queryFocused = ref(false)
const filterPulse = ref(false)
const exampleLoading = ref(false)
const scopedExampleQueries = ref<string[]>([])

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

const exampleQueries = [
  '锅炉安全阀有什么设置要求？',
  '文档中关于运行维护有哪些要求？',
  '有哪些和检验规则相关的条款？',
]

const activeExampleQueries = computed(() =>
  selectedKnowledgeBaseIds.value.length && scopedExampleQueries.value.length ? scopedExampleQueries.value : exampleQueries,
)

const queryKeyword = computed(() => {
  const text = query.value.trim().replace(/\s+/g, ' ')
  return text.length > 18 ? `${text.slice(0, 18)}...` : text
})

const scopeSummary = computed(() => {
  if (!selectedKnowledgeBaseIds.value.length) return '全部知识库'
  const names = selectedKnowledgeBaseIds.value
    .map((id) => knowledgeBases.value.find((kb) => kb.id === id)?.name || `知识库 ${id}`)
    .slice(0, 3)
  const suffix = selectedKnowledgeBaseIds.value.length > 3 ? ` 等 ${selectedKnowledgeBaseIds.value.length} 个` : ''
  return `${names.join(' / ')}${suffix}`
})

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
  applyRouteScope()
  loadKnowledgeBases()
})

function applyRouteScope() {
  const routeKbId = Number(route.query.kbId)
  if (Number.isFinite(routeKbId) && routeKbId > 0) {
    selectedKnowledgeBaseIds.value = [routeKbId]
    loadScopedExamples()
  }
}

watch([selectedKnowledgeBaseIds, mode, tagsInput, topK, similarityThreshold], () => {
  pulseFilters()
})

watch(selectedKnowledgeBaseIds, () => {
  loadScopedExamples()
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

function useExampleQuery(example: string) {
  query.value = example
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
  mode.value = 'SEMANTIC'
  topK.value = 10
  similarityThreshold.value = 0.3
  rerankTopN.value = 10
  rerankThreshold.value = 0
  searchError.value = ''
}

async function loadScopedExamples() {
  const kbId = selectedKnowledgeBaseIds.value[0]
  scopedExampleQueries.value = []
  if (!kbId) return
  exampleLoading.value = true
  try {
    const docs = await fetchDocuments({ kbId, status: 'READY', page: 1, pageSize: 5 })
    const examples: string[] = []
    for (const doc of docs.records || []) {
      if (examples.length >= 3) break
      const chunks = await fetchDocumentChunks(doc.id, 1, 2)
      for (const chunk of chunks.records || []) {
        const phrase = extractQuestionPhrase(chunk.content)
        if (phrase && !examples.includes(phrase)) examples.push(phrase)
        if (examples.length >= 3) break
      }
    }
    scopedExampleQueries.value = examples
  } catch {
    scopedExampleQueries.value = []
  } finally {
    exampleLoading.value = false
  }
}

function extractQuestionPhrase(content?: string) {
  const sentence = (content || '')
    .replace(/\s+/g, ' ')
    .split(/[。！？.!?；;]/)
    .map((part) => part.trim())
    .find((part) => part.length >= 8)
  if (!sentence) return ''
  const core = sentence.length > 26 ? sentence.slice(0, 26) : sentence
  return `这个知识库中关于${core}有什么要求？`
}

function pulseFilters() {
  filterPulse.value = true
  window.setTimeout(() => {
    filterPulse.value = false
  }, 220)
}

function modeLabel(value: string) {
  const map: Record<string, string> = {
    SEMANTIC: '语义向量检索',
    VECTOR_ONLY: '向量检索',
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
  return friendlyErrorMessage(error, fallback)
}
</script>

<style scoped>
.retrieval-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.retrieval-hero {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0;
  padding: 30px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.18), rgba(255, 255, 255, 0.04) 45%, rgba(255, 143, 112, 0.08)),
    rgba(12, 22, 19, 0.72);
  box-shadow: var(--km-shadow-card);
  backdrop-filter: blur(18px);
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

.retrieval-hero-chips {
  margin-top: 18px;
}

.retrieval-capabilities {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.capability-card {
  padding: 16px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: var(--km-shadow-soft);
  cursor: help;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.capability-card:hover {
  border-color: rgba(114, 239, 182, 0.32);
  background: rgba(79, 214, 154, 0.07);
  transform: translateY(-2px);
}

.capability-card strong {
  display: block;
  color: var(--km-green-strong);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
}

.capability-card span {
  display: block;
  margin-top: 8px;
  color: var(--km-muted);
  font-size: 13px;
}

.search-panel {
  position: relative;
  margin-bottom: 0;
  padding: 20px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: var(--km-shadow-soft);
}

.search-panel::after {
  position: absolute;
  right: 22px;
  bottom: 22px;
  width: 84px;
  height: 84px;
  border: 1px solid rgba(113, 215, 255, 0.12);
  border-radius: 20px;
  pointer-events: none;
  content: "";
  transform: rotate(18deg);
}

.query-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 18px;
}

.query-box {
  min-width: 0;
  transition:
    transform 180ms var(--km-ease-out),
    filter 180ms var(--km-ease-out);
}

.query-box.focused {
  filter: drop-shadow(0 0 18px rgba(79, 214, 154, 0.16));
  transform: scale(1.008);
}

.query-input :deep(.el-textarea__inner) {
  min-height: 116px !important;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.055);
  box-shadow: 0 0 0 1px var(--km-border-light) inset;
}

.query-box.hasText .query-input :deep(.el-textarea__inner) {
  animation: query-border-pulse 1.6s ease-in-out infinite;
}

.query-feedback {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  color: var(--km-muted);
  font-size: 12px;
}

.keyword-flash {
  display: inline-flex;
  max-width: 240px;
  padding: 3px 8px;
  overflow: hidden;
  border: 1px solid rgba(114, 239, 182, 0.28);
  border-radius: 999px;
  color: var(--km-green-strong);
  background: rgba(79, 214, 154, 0.1);
  text-overflow: ellipsis;
  white-space: nowrap;
  animation: keyword-flash 800ms ease-out;
}

@keyframes query-border-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 1px rgba(114, 239, 182, 0.36) inset;
  }

  50% {
    box-shadow: 0 0 0 1px rgba(114, 239, 182, 0.74) inset, 0 0 0 4px rgba(79, 214, 154, 0.08);
  }
}

@keyframes keyword-flash {
  from {
    color: #03110c;
    background: rgba(114, 239, 182, 0.86);
  }

  to {
    color: var(--km-green-strong);
    background: rgba(79, 214, 154, 0.1);
  }
}

.example-row {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  align-items: center;
  margin: -2px 0 18px;
}

.example-row span {
  color: var(--km-muted);
  font-size: 12px;
  font-weight: 680;
}

.example-loading {
  width: 180px;
}

.example-chip {
  min-height: 30px;
  padding: 5px 12px;
  border: 1px solid var(--km-border-light);
  border-radius: 999px;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.045);
  cursor: pointer;
  font-size: 12px;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.example-chip:hover {
  color: var(--km-green-strong);
  border-color: rgba(114, 239, 182, 0.52);
  background: rgba(79, 214, 154, 0.12);
  box-shadow: 0 0 18px rgba(79, 214, 154, 0.14), inset 0 0 0 1px rgba(114, 239, 182, 0.12);
  transform: translateY(-2px);
}

.search-summary-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 18px;
  padding: 12px;
  border: 1px solid rgba(114, 239, 182, 0.18);
  border-radius: var(--km-radius-md);
  background:
    linear-gradient(90deg, rgba(79, 214, 154, 0.08), rgba(113, 215, 255, 0.035)),
    rgba(0, 0, 0, 0.12);
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
  transition: transform 180ms var(--km-ease-out);
}

.filter-grid.bumped {
  transform: scale(1.006);
}

.filter-field {
  min-width: 0;
}

.filter-field label {
  display: flex;
  align-items: center;
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
  gap: 16px;
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

.result-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  max-width: 680px;
}

.result-summary .km-meta-chip {
  margin-top: 0;
}

.result-alert {
  margin-bottom: 12px;
  border-radius: 14px;
}

.state-box {
  position: relative;
  padding: 58px 20px;
  overflow: hidden;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  color: var(--km-muted);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: var(--km-shadow-soft);
  text-align: center;
}

.state-box::before {
  position: absolute;
  top: 28px;
  right: 10%;
  width: 72px;
  height: 72px;
  border: 1px solid rgba(114, 239, 182, 0.18);
  border-radius: 18px;
  content: "";
  transform: rotate(18deg);
  animation: float-geometry 4s ease-in-out infinite;
}

@keyframes float-geometry {
  0%,
  100% {
    transform: translateY(0) rotate(18deg);
  }

  50% {
    transform: translateY(-8px) rotate(23deg);
  }
}

.scan-loader {
  position: relative;
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 180px;
}

.scan-loader span {
  width: min(520px, 86%);
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--km-green-strong), var(--km-cyan), transparent);
  background-size: 220% 100%;
  animation: scan-line 1.2s linear infinite;
}

.scan-loader strong {
  color: var(--km-ink);
  font-size: 18px;
}

.scan-loader p {
  color: var(--km-muted);
}

@keyframes scan-line {
  from {
    background-position: 0% 50%;
  }

  to {
    background-position: 220% 50%;
  }
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

.state-action,
.empty-actions {
  margin-top: 18px;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
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

.result-list :deep(.retrieval-card) {
  opacity: 0;
  animation: result-reveal 360ms var(--km-ease-out) var(--reveal-delay, 0ms) forwards;
}

@keyframes result-reveal {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
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
    padding: 22px;
  }

  .retrieval-capabilities {
    grid-template-columns: 1fr;
  }

  .query-row,
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .result-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .result-summary {
    justify-content: flex-start;
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
