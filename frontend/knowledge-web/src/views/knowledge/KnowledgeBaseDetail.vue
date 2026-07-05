<template>
  <div class="kb-space-page">
    <button type="button" class="space-back" @click="goBack">返回知识库</button>

    <section v-loading="loading" class="space-hero">
      <div v-if="detail" class="space-hero-copy">
        <p class="space-kicker">Knowledge Space</p>
        <h1>{{ detail.name }}</h1>
        <p>{{ detail.description || '这个知识库暂未填写描述，可在空间内补充业务范围和使用说明。' }}</p>
        <div class="km-chip-row">
          <span class="km-capability-chip">{{ categoryLabel(detail.category) }}</span>
          <span class="km-capability-chip">{{ strategyLabel(detail.retrievalStrategy) }}</span>
          <span class="km-capability-chip">{{ chunkStrategyLabel(detail.chunkStrategy) }}</span>
          <span class="km-capability-chip">策略 v{{ detail.strategyVersion }}</span>
        </div>
      </div>
      <div v-if="detail" class="space-hero-actions">
        <el-button type="primary" @click="goDocuments">文档管理</el-button>
        <el-button @click="goSearch">开始检索</el-button>
        <el-button @click="openEdit">编辑信息</el-button>
      </div>
    </section>

    <section v-if="detail" class="km-stat-grid">
      <article class="km-stat-card">
        <span class="km-stat-label">文档数</span>
        <div class="km-stat-value">{{ detail.documentCount }}</div>
        <p class="km-stat-desc">当前空间内入库文档</p>
      </article>
      <article class="km-stat-card">
        <span class="km-stat-label">切片数</span>
        <div class="km-stat-value">{{ chunkTotal }}</div>
        <p class="km-stat-desc">来自当前页真实文档统计</p>
      </article>
      <article class="km-stat-card">
        <span class="km-stat-label">待审核</span>
        <div class="km-stat-value">{{ pendingReviewCount }}</div>
        <p class="km-stat-desc">需要人工确认的文档</p>
      </article>
      <article class="km-stat-card">
        <span class="km-stat-label">已就绪</span>
        <div class="km-stat-value">{{ readyCount }}</div>
        <p class="km-stat-desc">已经进入检索范围</p>
      </article>
    </section>

    <el-tabs v-if="detail" v-model="activeTab" class="space-tabs">
      <el-tab-pane label="概览" name="overview">
        <section class="space-grid">
          <article class="space-panel">
            <h3>空间概览</h3>
            <dl>
              <div><dt>ID</dt><dd>{{ detail.id }}</dd></div>
              <div><dt>创建人</dt><dd>{{ detail.createdByName || 'anonymous' }}</dd></div>
              <div><dt>创建时间</dt><dd>{{ detail.createdAt }}</dd></div>
              <div><dt>最近更新</dt><dd>{{ detail.updatedAt || '-' }}</dd></div>
            </dl>
          </article>
          <article class="space-panel">
            <h3>快捷入口</h3>
            <div class="space-action-grid">
              <el-button type="primary" @click="goDocuments">进入文档</el-button>
              <el-button @click="goReview">前往审核</el-button>
              <el-button @click="goSearch">开始检索</el-button>
              <el-button type="warning" plain @click="openEdit">策略变更</el-button>
            </div>
          </article>
        </section>
      </el-tab-pane>

      <el-tab-pane label="文档" name="documents">
        <section class="space-panel">
          <div class="panel-head">
            <h3>最近文档</h3>
            <el-button @click="goDocuments">查看全部文档</el-button>
          </div>
          <div class="doc-mini-list">
            <article v-for="doc in documents" :key="doc.id" class="doc-mini-card">
              <strong>{{ doc.originalName }}</strong>
              <span>{{ doc.status }} · {{ doc.chunkCount || 0 }} 个切片</span>
            </article>
            <el-empty v-if="!documents.length" description="暂无文档" />
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="切片" name="chunks">
        <section class="space-panel">
          <h3>切片概览</h3>
          <p class="space-muted">当前空间已统计到 {{ chunkTotal }} 个切片。进入文档管理可查看每篇文档的切片详情、向量状态与内容摘要。</p>
          <el-button type="primary" @click="goDocuments">查看切片预览</el-button>
        </section>
      </el-tab-pane>

      <el-tab-pane label="策略" name="strategy">
        <section class="space-panel">
          <h3>策略配置</h3>
          <dl>
            <div><dt>检索策略</dt><dd>{{ strategyLabel(detail.retrievalStrategy) }}</dd></div>
            <div><dt>切片策略</dt><dd>{{ chunkStrategyLabel(detail.chunkStrategy) }}</dd></div>
            <div><dt>切片参数</dt><dd>{{ detail.chunkSize }} / {{ detail.chunkOverlap }}</dd></div>
            <div><dt>分隔符</dt><dd>{{ detail.separators?.length ? detail.separators.map((s) => JSON.stringify(s)).join('、') : '默认' }}</dd></div>
          </dl>
          <div class="space-action-row">
            <el-button @click="openEdit">编辑策略</el-button>
            <el-button type="warning" plain @click="confirmReprocess">策略变更并重处理</el-button>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="审核记录/活动" name="activity">
        <section class="space-panel">
          <h3>活动入口</h3>
          <p class="space-muted">审核记录按文档维度展示。进入审核工作台可查看待审核文档、切片编辑日志与审核轨迹。</p>
          <div class="space-action-row">
            <el-button type="primary" @click="goReview">前往审核工作台</el-button>
            <el-button type="danger" plain @click="confirmDelete">删除知识库</el-button>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>

    <KnowledgeBaseFormDialog
      v-model:visible="dialogVisible"
      :kb="detail"
      mode="edit"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  deleteKnowledgeBase,
  getKnowledgeBaseDetail,
  reprocessKnowledgeBase,
  type KnowledgeBaseDetailVO,
} from '@/api/modules/knowledge-base'
import { fetchDocuments } from '@/api/modules/document'
import type { DocumentItem } from '@/types/knowledge'
import {
  KB_CATEGORIES,
  KB_CHUNK_STRATEGIES,
  KB_RETRIEVAL_STRATEGIES,
} from '@/types/knowledge-base'
import KnowledgeBaseFormDialog from '@/components/knowledge/KnowledgeBaseFormDialog.vue'
import { friendlyEnvelopeMessage, friendlyErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()

const kbId = ref<number>(Number(route.params.kbId))
const detail = ref<KnowledgeBaseDetailVO | null>(null)
const documents = ref<DocumentItem[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const activeTab = ref('overview')

const chunkTotal = computed(() => documents.value.reduce((sum, doc) => sum + (doc.chunkCount || 0), 0))
const pendingReviewCount = computed(() => documents.value.filter((doc) => doc.status === 'PENDING_REVIEW').length)
const readyCount = computed(() => documents.value.filter((doc) => doc.status === 'READY').length)

async function fetchDetail() {
  loading.value = true
  try {
    const resp = await getKnowledgeBaseDetail(kbId.value)
    if (resp.code !== 0) {
      ElMessage.error(friendlyEnvelopeMessage(resp.message, '加载知识库详情失败'))
      detail.value = null
      return
    }
    detail.value = resp.data
    await loadDocuments()
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error, '加载知识库详情失败'))
  } finally {
    loading.value = false
  }
}

async function loadDocuments() {
  const pageSize = 100
  const firstPage = await fetchDocuments({ kbId: kbId.value, page: 1, pageSize })
  const records = [...(firstPage.records || [])]
  const pageCount = Math.ceil((firstPage.total || records.length) / pageSize)
  for (let page = 2; page <= pageCount; page += 1) {
    const data = await fetchDocuments({ kbId: kbId.value, page, pageSize })
    records.push(...(data.records || []))
  }
  documents.value = records
}

function goBack() {
  router.push({ name: 'KnowledgeBaseList' })
}

function goDocuments() {
  router.push({ name: 'DocumentList', params: { kbId: String(kbId.value) } })
}

function goReview() {
  router.push('/review')
}

function goSearch() {
  router.push('/search')
}

function openEdit() {
  dialogVisible.value = true
}

function onSaved() {
  dialogVisible.value = false
  fetchDetail()
}

async function confirmDelete() {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(
      `确定删除知识库「${detail.value.name}」？关联文档将一并放入回收站。`,
      '确认删除',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    const resp = await deleteKnowledgeBase(kbId.value)
    if (resp.code === 0) {
      ElMessage.success('知识库已删除')
      goBack()
    } else {
      ElMessage.error(friendlyEnvelopeMessage(resp.message, '删除失败，请稍后重试'))
    }
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error, '删除失败，请稍后重试'))
  }
}

async function confirmReprocess() {
  if (!detail.value) return
  try {
    await ElMessageBox.confirm(
      `将触发对「${detail.value.name}」下所有文档的策略变更（切片+向量化重做）。确认？`,
      '策略变更',
      { type: 'warning' },
    )
  } catch {
    return
  }
  try {
    const resp = await reprocessKnowledgeBase(kbId.value)
    if (resp.code === 0) {
      ElMessage.success(resp.data.message || '已触发策略重处理')
      await fetchDetail()
    } else {
      ElMessage.error(friendlyEnvelopeMessage(resp.message, '触发失败'))
    }
  } catch (error) {
    ElMessage.error(friendlyErrorMessage(error, '触发失败'))
  }
}

function categoryLabel(v: string) {
  return KB_CATEGORIES.find((c) => c.value === v)?.label || v
}
function strategyLabel(v: string) {
  return KB_RETRIEVAL_STRATEGIES.find((s) => s.value === v)?.label || v
}
function chunkStrategyLabel(v: string) {
  return KB_CHUNK_STRATEGIES.find((s) => s.value === v)?.label || v
}

watch(
  () => route.params.kbId,
  (v) => {
    if (v) {
      kbId.value = Number(v)
      fetchDetail()
    }
  },
)

onMounted(() => fetchDetail())
</script>

<style scoped>
.kb-space-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-width: 0;
}

.space-back {
  width: max-content;
  padding: 9px 15px;
  border: 1px solid var(--km-border-light);
  border-radius: 999px;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.055);
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, color 160ms ease;
}

.space-back:hover {
  color: var(--km-green-strong);
  border-color: rgba(114, 239, 182, 0.34);
  transform: translateX(-2px);
}

.space-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 32px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.18), rgba(113, 215, 255, 0.06), rgba(255, 143, 112, 0.065)),
    rgba(12, 22, 19, 0.74);
  box-shadow: var(--km-shadow-card);
}

.space-hero-copy {
  max-width: 820px;
}

.space-kicker {
  margin: 0 0 10px;
  color: var(--km-green-strong);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
  font-weight: 760;
}

.space-hero h1 {
  margin: 0;
  color: var(--km-ink);
  font-size: clamp(36px, 5vw, 56px);
  line-height: 1.05;
}

.space-hero p {
  margin: 14px 0 18px;
  color: var(--km-text);
  font-size: 16px;
  line-height: 1.7;
}

.space-hero-actions,
.space-action-row,
.space-action-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.space-hero-actions {
  align-content: flex-start;
  justify-content: flex-end;
}

.space-tabs {
  min-width: 0;
}

.space-tabs :deep(.el-tabs__item) {
  color: var(--km-muted);
  font-size: 15px;
  font-weight: 650;
}

.space-tabs :deep(.el-tabs__item.is-active) {
  color: var(--km-green-strong);
}

.space-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.7fr);
  gap: 16px;
}

.space-panel {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: var(--km-shadow-soft);
}

.space-panel h3 {
  margin: 0 0 14px;
  color: var(--km-ink);
  font-size: 22px;
}

.space-panel dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.space-panel dl div,
.doc-mini-card {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-md);
  background: rgba(0, 0, 0, 0.16);
}

.space-panel dt {
  color: var(--km-muted);
  font-size: 12px;
}

.space-panel dd {
  margin: 6px 0 0;
  color: var(--km-text);
  word-break: break-word;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}

.doc-mini-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 12px;
}

.doc-mini-card strong,
.doc-mini-card span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-mini-card strong {
  color: var(--km-ink);
}

.doc-mini-card span,
.space-muted {
  color: var(--km-muted);
  line-height: 1.65;
}

.space-action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 860px) {
  .space-hero,
  .space-grid,
  .space-panel dl {
    grid-template-columns: 1fr;
  }

  .space-hero {
    flex-direction: column;
  }

  .space-hero-actions {
    justify-content: flex-start;
  }
}
</style>
