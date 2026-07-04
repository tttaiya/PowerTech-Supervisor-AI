<template>
  <div class="kb-list-page">
    <header class="kb-hero">
      <div class="kb-hero-copy">
        <div class="kb-eyebrow">KNOWLEDGE BASES</div>
        <h1>
          知识库
          <el-tooltip content="统一管理知识资产、策略版本、文档规模与回收站流转。" placement="right">
            <span class="km-info-dot">?</span>
          </el-tooltip>
        </h1>
        <p>集中管理企业知识资产、检索策略与文档规模，保持内容结构清晰可控。</p>
        <div class="km-chip-row kb-hero-chips">
          <span class="km-capability-chip">多知识库治理</span>
          <span class="km-capability-chip">切片策略可控</span>
          <span class="km-capability-chip">检索策略版本化</span>
          <span class="km-capability-chip">审核与回收站</span>
        </div>
      </div>
      <div class="kb-hero-actions">
        <el-button type="primary" class="kb-create-button" @click="openCreate">新建知识库</el-button>
        <el-button
          class="kb-danger-button"
          :disabled="!selectedIds.length || batchDeleting"
          :loading="batchDeleting"
          @click="batchDelete"
        >
          批量删除{{ selectedIds.length ? ` (${selectedIds.length})` : '' }}
        </el-button>
        <el-tooltip content="从这里进入知识库创建、文档入库、策略变更和回收管理。" placement="bottom">
          <el-button class="kb-guide-button">功能导览</el-button>
        </el-tooltip>
      </div>
    </header>

    <section class="km-stat-grid kb-overview" aria-label="知识库概览">
      <el-tooltip v-for="card in overviewCards" :key="card.label" :content="card.desc" placement="top">
        <article class="km-stat-card">
          <span class="km-stat-label">{{ card.label }}</span>
          <div class="km-stat-value">{{ card.value }}</div>
          <p class="km-stat-desc">{{ card.desc }}</p>
        </article>
      </el-tooltip>
    </section>

    <section class="kb-capability-strip km-lift-card" aria-label="知识库能力说明">
      <span>能力外显</span>
      <strong>文档入库、自动切片、向量化、人工审核、跨库检索与策略重处理已串成完整闭环。</strong>
      <el-button text @click="router.push('/search')">开始检索</el-button>
    </section>

    <section class="kb-filter-panel" aria-label="知识库筛选">
      <el-form :inline="true" :model="filter" class="kb-filter-form">
        <el-form-item label="分类">
          <el-select v-model="filter.category" placeholder="全部分类" clearable class="kb-filter-control">
            <el-option v-for="c in KB_CATEGORIES" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="filter.nameKeyword" placeholder="模糊匹配" clearable class="kb-search-control" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filter.isDeleted" placeholder="全部" clearable class="kb-status-control">
            <el-option label="活动" :value="0" />
            <el-option label="已删除" :value="1" />
          </el-select>
        </el-form-item>
        <el-form-item class="kb-filter-actions">
          <el-button class="kb-query-button" @click="reload">查询</el-button>
          <el-button text class="kb-reset-button" @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </section>

    <section class="kb-data-panel" aria-label="知识库列表">
      <div class="kb-table-toolbar">
        <div>
          <h2>列表</h2>
          <span>{{ total }} 个知识库</span>
        </div>
        <span class="kb-toolbar-hint">支持文档入库、切片策略、检索策略与回收站管理</span>
      </div>

      <div class="kb-table-wrap">
        <el-table v-loading="loading" :data="rows" row-key="id" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="48" :selectable="canSelectRow" />
          <el-table-column prop="id" label="ID" width="72" />
          <el-table-column prop="name" label="名称" min-width="220">
            <template #default="{ row }">
              <div class="kb-name-cell">
                <span class="kb-name">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="132">
            <template #default="{ row }">
              <span class="kb-soft-label">{{ categoryLabel(row.category) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="104">
            <template #default="{ row }">
              <el-tag
                size="small"
                effect="plain"
                round
                :type="isDeleted(row) ? 'info' : 'success'"
                class="kb-status-tag"
              >
                {{ isDeleted(row) ? '已删除' : '活动' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="documentCount" label="文档数" width="92" />
          <el-table-column label="切片数" width="92">
            <template #default>进入空间查看</template>
          </el-table-column>
          <el-table-column prop="strategyVersion" label="策略版本" width="104" />
          <el-table-column prop="updatedAt" label="最近更新" min-width="160">
            <template #default="{ row }">{{ row.updatedAt || row.createdAt }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <div class="kb-actions">
                <el-button v-if="!isDeleted(row)" type="primary" @click="goDetail(row)">进入空间</el-button>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <div class="kb-empty-state">
              <div class="kb-empty-title">暂无知识库</div>
              <p>调整筛选条件，或新建一个知识库开始整理内容。</p>
            </div>
          </template>
        </el-table>
      </div>

      <el-pagination
        v-model:current-page="pageNum"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @current-change="reload"
        @size-change="reload"
        class="pagination"
      />
    </section>

    <KnowledgeBaseFormDialog
      v-model:visible="dialogVisible"
      :kb="editing"
      :mode="dialogMode"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  batchDeleteKnowledgeBases,
  deleteKnowledgeBase,
  getKnowledgeBaseDetail,
  listKnowledgeBases,
  reprocessKnowledgeBase,
  type KnowledgeBaseDetailVO,
  type KnowledgeBaseVO,
} from '@/api/modules/knowledge-base'
import {
  KB_CATEGORIES,
  KB_CHUNK_STRATEGIES,
  KB_RETRIEVAL_STRATEGIES,
} from '@/types/knowledge-base'
import KnowledgeBaseFormDialog from '@/components/knowledge/KnowledgeBaseFormDialog.vue'
import { fetchStatsOverview, type StatsOverview } from '@/api/modules/stats'

const router = useRouter()

const filter = reactive<{ category?: string; nameKeyword?: string; isDeleted?: number }>({})
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const rows = ref<KnowledgeBaseVO[]>([])
const loading = ref(false)
const selectedIds = ref<number[]>([])
const batchDeleting = ref(false)
const overview = ref<StatsOverview | null>(null)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editing = ref<KnowledgeBaseVO | null>(null)

const overviewCards = computed(() => [
  {
    label: '知识库总数',
    value: formatNumber(overview.value?.knowledgeBaseTotal ?? total.value),
    desc: '可用于组织不同业务域的知识资产',
  },
  {
    label: '文档总数',
    value: formatNumber(overview.value?.documentTotal ?? rows.value.reduce((sum, row) => sum + (row.documentCount || 0), 0)),
    desc: '上传、解析、审核链路中的文档规模',
  },
  {
    label: '切片总数',
    value: formatNumber(overview.value?.chunkTotal ?? 0),
    desc: '已拆分并可进入向量化的知识片段',
  },
  {
    label: '待审核',
    value: formatNumber(overview.value?.documentPendingReview ?? 0),
    desc: '需要人工确认的文档与切片',
  },
])

async function reload() {
  loading.value = true
  try {
    const resp = await listKnowledgeBases({
      ...filter,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    if (resp.code !== 0) {
      ElMessage.error(resp.message || '查询失败')
      rows.value = []
      total.value = 0
      return
    }
    rows.value = (resp.data.records || []).map((r) => ({ ...r, _isDeleted: r._isDeleted || r.isDeleted }))
    total.value = resp.data.total
    pageNum.value = resp.data.page
    pageSize.value = resp.data.pageSize
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '查询失败')
  } finally {
    loading.value = false
  }
}

function resetFilter() {
  filter.category = undefined
  filter.nameKeyword = undefined
  filter.isDeleted = undefined
  pageNum.value = 1
  reload()
}

function openCreate() {
  dialogMode.value = 'create'
  editing.value = null
  dialogVisible.value = true
}

async function openEdit(row: KnowledgeBaseVO) {
  loading.value = true
  try {
    const resp = await getKnowledgeBaseDetail(row.id)
    if (resp.code !== 0) {
      ElMessage.error(resp.message || '加载知识库详情失败')
      return
    }
    dialogMode.value = 'edit'
    editing.value = resp.data as KnowledgeBaseDetailVO
    dialogVisible.value = true
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '加载知识库详情失败')
  } finally {
    loading.value = false
  }
}

function onSaved() {
  dialogVisible.value = false
  reload()
}

function goDetail(row: KnowledgeBaseVO) {
  router.push({ name: 'KnowledgeBaseDetail', params: { kbId: String(row.id) } })
}

function goDocuments(row: KnowledgeBaseVO) {
  router.push({ name: 'DocumentList', params: { kbId: String(row.id) } })
}

async function loadOverview() {
  try {
    overview.value = await fetchStatsOverview(30)
  } catch {
    overview.value = null
  }
}

function handleSelectionChange(selection: KnowledgeBaseVO[]) {
  selectedIds.value = selection.filter((row) => !isDeleted(row)).map((row) => row.id)
}

function canSelectRow(row: KnowledgeBaseVO) {
  return !isDeleted(row)
}

async function confirmDelete(row: KnowledgeBaseVO) {
  try {
    await ElMessageBox.confirm(
      `确定删除知识库「${row.name}」？关联文档将一并放入回收站。`,
      '确认删除',
      { type: 'warning' },
    )
  } catch {
    return
  }
  const resp = await deleteKnowledgeBase(row.id)
  if (resp.code === 0) {
    ElMessage.success('已删除')
    reload()
  } else {
    ElMessage.error(resp.message || '删除失败')
  }
}

async function batchDelete() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先选择要删除的知识库')
    return
  }
  const count = selectedIds.value.length
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${count} 个知识库？关联文档将一并放入回收站。`,
      '批量删除知识库',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  batchDeleting.value = true
  try {
    const resp = await batchDeleteKnowledgeBases([...selectedIds.value])
    if (resp.code === 0) {
      ElMessage.success(`已删除 ${count} 个知识库`)
      selectedIds.value = []
      await reload()
    } else {
      ElMessage.error(resp.message || '批量删除失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '批量删除失败')
  } finally {
    batchDeleting.value = false
  }
}

async function confirmReprocess(row: KnowledgeBaseVO) {
  try {
    await ElMessageBox.confirm(
      `将触发对「${row.name}」下所有文档的策略变更（切片+向量化重做）。确认？`,
      '策略变更',
      { type: 'warning' },
    )
  } catch {
    return
  }
  const resp = await reprocessKnowledgeBase(row.id)
  if (resp.code === 0) {
    const taskCount = resp.data?.taskCount || 0
    const strategyVersion = resp.data?.strategyVersion
    const message =
      taskCount > 0
        ? `已创建 ${taskCount} 个 REPROCESS 任务${strategyVersion ? `（策略版本 v${strategyVersion}）` : ''}`
        : (resp.data.message || '当前没有可重处理文档')
    ElMessage.success(message)
    reload()
  } else {
    ElMessage.error(resp.message || '触发失败')
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

function isDeleted(row: KnowledgeBaseVO) {
  return row.isDeleted === 1 || row._isDeleted === 1
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString('zh-CN') : '0'
}

onMounted(() => {
  reload()
  loadOverview()
})
</script>

<style scoped>
.kb-list-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.kb-hero {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0;
  padding: 28px;
  overflow: hidden;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.16), rgba(255, 255, 255, 0.045) 42%, rgba(255, 143, 112, 0.07)),
    rgba(12, 22, 19, 0.72);
  box-shadow: var(--km-shadow-card);
  backdrop-filter: blur(18px);
}
.kb-hero-copy {
  max-width: 720px;
}
.kb-eyebrow {
  margin-bottom: 10px;
  color: var(--km-green);
  font-family: "SF Mono", "Cascadia Mono", "Roboto Mono", Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}
.kb-hero h1 {
  margin: 0;
  color: var(--km-ink);
  font-size: clamp(32px, 4vw, 40px);
  font-weight: 720;
  line-height: 1.08;
  letter-spacing: 0;
}
.kb-hero p {
  max-width: 620px;
  margin: 14px 0 0;
  color: var(--km-muted);
  font-size: 15px;
}
.kb-hero-chips {
  margin-top: 18px;
}
.kb-hero-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}
.kb-create-button {
  flex: 0 0 auto;
  min-width: 124px;
  height: 42px;
  padding: 0 20px;
}
.kb-danger-button {
  min-width: 116px;
}
.kb-guide-button {
  min-width: 104px;
  color: var(--km-green-strong);
}
.kb-overview {
  margin-top: -2px;
}
.kb-capability-strip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 15px 18px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.11), rgba(113, 215, 255, 0.045)),
    rgba(255, 255, 255, 0.035);
  box-shadow: var(--km-shadow-soft);
}
.kb-capability-strip span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--km-green-strong);
  background: rgba(79, 214, 154, 0.12);
  font-size: 12px;
  font-weight: 700;
}
.kb-capability-strip strong {
  color: var(--km-text);
  font-size: 13px;
  font-weight: 620;
}
.kb-filter-panel {
  margin-bottom: 0;
  padding: 18px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: var(--km-shadow-soft);
}
.kb-filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 16px;
  align-items: flex-end;
}
.kb-filter-form :deep(.el-form-item) {
  margin: 0;
}
.kb-filter-form :deep(.el-form-item__label) {
  height: auto;
  padding: 0 0 8px;
  color: var(--km-muted);
  font-size: 12px;
  font-weight: 640;
  line-height: 1.2;
}
.kb-filter-control {
  width: 174px;
}
.kb-search-control {
  width: min(260px, 100%);
}
.kb-status-control {
  width: 132px;
}
.kb-filter-actions {
  align-self: flex-end;
}
.kb-query-button {
  min-width: 82px;
  border-color: var(--km-border);
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.055);
}
.kb-query-button:hover {
  border-color: var(--km-green);
  color: var(--km-green-strong);
  background: rgba(79, 214, 154, 0.1);
}
.kb-reset-button {
  color: var(--km-muted);
}
.kb-data-panel {
  padding: 2px 0 0;
}
.kb-table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 14px;
}
.kb-table-toolbar h2 {
  margin: 0;
  color: var(--km-ink);
  font-size: 22px;
  font-weight: 680;
  line-height: 1.2;
}
.kb-table-toolbar span {
  display: inline-block;
  margin-top: 4px;
  color: var(--km-muted);
  font-size: 13px;
}
.kb-table-wrap {
  width: 100%;
  overflow-x: hidden;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: var(--km-shadow-soft);
  backdrop-filter: blur(18px);
}
.kb-table-wrap :deep(.el-table) {
  width: 100%;
  background: transparent;
}
.kb-table-wrap :deep(.el-table__inner-wrapper::before) {
  display: none;
}
.kb-table-wrap :deep(.el-table th.el-table__cell) {
  background: rgba(255, 255, 255, 0.045);
}
.kb-table-wrap :deep(.el-table td.el-table__cell) {
  border-bottom-color: var(--km-border-light);
}
.kb-table-wrap :deep(.el-table__fixed-right::before),
.kb-table-wrap :deep(.el-table__fixed::before) {
  display: none;
}
.kb-name-cell {
  display: flex;
  min-width: 0;
  align-items: center;
}
.kb-name {
  overflow: hidden;
  color: var(--km-ink);
  font-weight: 640;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kb-soft-label {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  padding: 4px 9px;
  overflow: hidden;
  border-radius: 999px;
  color: var(--km-green-strong);
  background: rgba(79, 214, 154, 0.11);
  font-size: 12px;
  font-weight: 620;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kb-soft-label.blue {
  color: var(--km-cyan);
  background: var(--km-blue-soft);
}
.kb-toolbar-hint {
  color: var(--km-muted);
  font-size: 13px;
}
.kb-status-tag {
  border-color: transparent;
  font-weight: 620;
}
.kb-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.kb-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}
.kb-empty-state {
  padding: 58px 20px;
  color: var(--km-muted);
  text-align: center;
}
.kb-empty-title {
  margin-bottom: 8px;
  color: var(--km-ink);
  font-size: 18px;
  font-weight: 680;
}
.kb-empty-state p {
  margin: 0;
  font-size: 14px;
}
.pagination {
  margin-top: 18px;
  justify-content: flex-end;
}

@media (max-width: 1024px) {
  .kb-hero {
    align-items: stretch;
  }
  .kb-search-control {
    width: 220px;
  }
}

@media (max-width: 768px) {
  .kb-hero {
    flex-direction: column;
    gap: 18px;
    padding: 22px;
  }
  .kb-hero-actions {
    width: 100%;
  }
  .kb-capability-strip {
    grid-template-columns: 1fr;
  }
  .kb-create-button {
    flex: 1;
  }
  .kb-danger-button {
    flex: 1;
  }
  .kb-filter-form {
    display: grid;
    grid-template-columns: 1fr;
  }
  .kb-filter-control,
  .kb-search-control,
  .kb-status-control {
    width: 100%;
  }
  .kb-filter-actions :deep(.el-form-item__content) {
    display: flex;
    width: 100%;
  }
  .kb-query-button,
  .kb-reset-button {
    flex: 1;
  }
  .kb-table-toolbar {
    align-items: flex-start;
  }
  .pagination {
    justify-content: flex-start;
    overflow-x: auto;
    padding-bottom: 4px;
  }
}
</style>
