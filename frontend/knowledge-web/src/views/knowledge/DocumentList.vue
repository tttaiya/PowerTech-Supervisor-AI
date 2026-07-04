<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Grid, List } from '@element-plus/icons-vue'
import DocumentStatusTag from '@/components/knowledge/DocumentStatusTag.vue'
import UploadDocumentDialog from '@/components/knowledge/UploadDocumentDialog.vue'
import {
  batchDeleteDocuments,
  deleteDocument,
  fetchDocumentChunks,
  fetchDocumentTasks,
  fetchDocuments,
  normalizeTags,
  retryDocument,
  updateDocumentTags,
  validateTags,
  type DocumentTask,
} from '@/api/modules/document'
import type { DocumentChunk, DocumentItem, DocumentStatus } from '@/types/knowledge'
import { friendlyErrorMessage } from '@/utils/error'

const route = useRoute()
const router = useRouter()

const kbId = ref<number>(Number(route.params.kbId))
const loading = ref(false)
const documents = ref<DocumentItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const statusFilter = ref<DocumentStatus | ''>('')
const keyword = ref('')
const selectedIds = ref<number[]>([])
const viewMode = ref<'card' | 'list'>('card')
const uploadVisible = ref(false)
const deletingDocId = ref<number | null>(null)
const batchDeleting = ref(false)
const tagDialogVisible = ref(false)
const editingDoc = ref<DocumentItem | null>(null)
const tagEditTags = ref<string[]>([])
const tagSaving = ref(false)

const chunkDialogVisible = ref(false)
const chunkLoading = ref(false)
const chunkDialogDoc = ref<DocumentItem | null>(null)
const chunks = ref<DocumentChunk[]>([])
const chunkKeyword = ref('')
const chunkStatusFilter = ref('')
const chunkPageNoFilter = ref<number | undefined>()
const chunkPage = ref(1)
const chunkPageSize = ref(20)
const chunkTotal = ref(0)
const expandedVectorIds = ref<Set<number>>(new Set())
const previewChunks = ref<Record<number, DocumentChunk | null>>({})
const previewLoadingIds = ref<Set<number>>(new Set())

const taskDrawerVisible = ref(false)
const taskDrawerDoc = ref<DocumentItem | null>(null)
const taskDrawerHighlightFailed = ref(false)
const taskLoading = ref(false)
const tasks = ref<DocumentTask[]>([])
const retryingDocId = ref<number | null>(null)
const monitorVisible = ref(false)
const monitorDocs = ref<DocumentItem[]>([])
const monitorTimer = ref<number | null>(null)

const latestTask = computed(() => tasks.value[0])
const selectedIdSet = computed(() => new Set(selectedIds.value))
const chunkStats = computed(() => {
  const ready = chunks.value.filter((chunk) => (chunk.vectorStatus || '').toUpperCase() === 'READY').length
  return {
    total: chunkTotal.value || chunks.value.length,
    ready,
    edited: chunks.value.filter((chunk) => chunk.isEdited).length,
  }
})

const statusCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const doc of documents.value) {
    counts[doc.status] = (counts[doc.status] || 0) + 1
  }
  return counts
})

const documentOverviewCards = computed(() => [
  {
    label: '当前文档',
    value: total.value,
    desc: '当前知识库下的文档总量',
  },
  {
    label: '待审核',
    value: statusCounts.value.PENDING_REVIEW || 0,
    desc: '需要进入审核工作台确认',
  },
  {
    label: '可检索',
    value: statusCounts.value.READY || 0,
    desc: '已完成向量化并可被检索',
  },
  {
    label: '处理失败',
    value: statusCounts.value.FAILED || 0,
    desc: '支持查看原因并重新发起处理',
  },
])

const tagSuggestions = computed(() => {
  const defaults = ['制度', '流程', '产品', '培训', 'FAQ', '案例', '规范', '待复核']
  const seen = new Set<string>()
  for (const doc of documents.value) {
    for (const tag of doc.tags || []) {
      const normalized = tag.trim()
      if (normalized) seen.add(normalized)
    }
  }
  for (const tag of defaults) seen.add(tag)
  return [...seen].filter((tag) => !tagEditTags.value.includes(tag)).slice(0, 12)
})

const processSteps = [
  { status: 'UPLOADED', title: '已上传', desc: '文件已进入知识库' },
  { status: 'PARSING', title: '解析中', desc: '抽取正文与结构' },
  { status: 'CHUNKING', title: '切片中', desc: '生成可审核片段' },
  { status: 'VECTORIZING', title: '向量化中', desc: '写入检索向量' },
  { status: 'PENDING_REVIEW', title: '待审核', desc: '人工确认质量' },
  { status: 'READY', title: '就绪', desc: '支持语义检索' },
]

const monitorSteps = [
  { key: 'UPLOADED', title: '上传完成' },
  { key: 'QUEUED', title: '等待处理' },
  { key: 'PARSING', title: '解析 / OCR' },
  { key: 'CHUNKING', title: '切片' },
  { key: 'VECTORIZING', title: '向量化' },
  { key: 'PENDING_REVIEW', title: '待审核' },
  { key: 'READY', title: '就绪 / 失败' },
]

const taskDisplayState = computed<'empty' | 'processing' | 'success' | 'failed'>(() => {
  const status = latestTask.value?.taskStatus
  if (status === 'FAILED') return 'failed'
  if (status === 'QUEUED' || status === 'RUNNING') return 'processing'
  if (status === 'SUCCESS') return 'success'
  return 'empty'
})

const taskStateHint = computed(() => {
  switch (taskDisplayState.value) {
    case 'processing':
      return '最新任务进行中，请稍后刷新列表查看文档状态。'
    case 'success':
      return '最新任务已成功完成，文档状态以列表中的 document_status 为准。'
    case 'failed':
      return '最新任务失败，请查看失败阶段与原因，必要时联系管理员重试。'
    default:
      return '该文档暂无处理任务记录（可能尚未通过 Gateway 上传或未创建 PROCESS 任务）。'
  }
})

const statusOptions = [
  { label: '全部', value: '' },
  { label: '已上传', value: 'UPLOADED' },
  { label: '解析中', value: 'PARSING' },
  { label: '切片中', value: 'CHUNKING' },
  { label: '向量化中', value: 'VECTORIZING' },
  { label: '待审核', value: 'PENDING_REVIEW' },
  { label: '就绪', value: 'READY' },
  { label: '审核未通过', value: 'REVIEW_REJECTED' },
  { label: '失败', value: 'FAILED' },
]

const processingStatusLabels: Record<string, string> = {
  UPLOADED: '已上传',
  PARSING: '解析中',
  CHUNKING: '切片中',
  VECTORIZING: '向量化中',
}

const documentEmptyDescription = computed(() => {
  if (!statusFilter.value) return '暂无文档'
  return '当前筛选条件下暂无文档，可切换为全部状态查看处理中的文档'
})

const filteredChunks = computed(() => {
  return chunks.value.filter((chunk) => {
    const statusMatched = !chunkStatusFilter.value || (chunk.vectorStatus || '').toUpperCase() === chunkStatusFilter.value
    const pageMatched = !chunkPageNoFilter.value || Number(chunk.pageNo) === Number(chunkPageNoFilter.value)
    return statusMatched && pageMatched
  })
})

async function loadDocuments() {
  if (!kbId.value || Number.isNaN(kbId.value)) {
    return
  }
  loading.value = true
  try {
    const data = await fetchDocuments({
      kbId: kbId.value,
      status: statusFilter.value || undefined,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    documents.value = data.records
    total.value = data.total
    syncMonitorDocs(data.records)
    loadPreviewChunks(data.records)
  } catch (error: any) {
    documents.value = []
    total.value = 0
    const message = friendlyErrorMessage(error, '加载文档列表失败')
    if (message.includes('无法连接') || message.includes('未找到')) {
      ElMessage.warning(message)
    } else {
      ElMessage.error(message)
    }
  } finally {
    loading.value = false
  }
}

function toggleSelection(row: DocumentItem, checked: boolean) {
  if (checked) {
    selectedIds.value = Array.from(new Set([...selectedIds.value, row.id]))
    return
  }
  selectedIds.value = selectedIds.value.filter((id) => id !== row.id)
}

function onCardSelectionChange(row: DocumentItem, checked: string | number | boolean) {
  toggleSelection(row, Boolean(checked))
}

function clearSelection() {
  selectedIds.value = []
}

function setStatusFilter(status: string) {
  statusFilter.value = status as DocumentStatus
  page.value = 1
}

/** US3.7 删除单个文档：二次确认 → 逻辑删除 → 刷新列表 */
async function handleDelete(row: DocumentItem) {
  const riskText = buildProcessingDeleteRiskText([row])
  const confirmProcessing = Boolean(riskText)
  try {
    await ElMessageBox.confirm(
      `确定删除文档「${row.originalName}」？\n\n` +
        riskText +
        '· 文档将从列表中移除并进入回收站（保留 30 天）\n' +
        '· 检索侧将通过 is_deleted 过滤，不再返回该文档',
      riskText ? '确认删除处理中文档' : '确认删除',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  deletingDocId.value = row.id
  try {
    await deleteDocument(row.id, confirmProcessing)
    ElMessage.success('文档已删除，已从列表移除')
    if (selectedIds.value.includes(row.id)) {
      selectedIds.value = selectedIds.value.filter((id) => id !== row.id)
    }
    await loadDocuments()
  } catch (error: any) {
    ElMessage.error(friendlyErrorMessage(error, '删除失败'))
  } finally {
    deletingDocId.value = null
  }
}

/** US3.8 批量删除：勾选多篇 → 确认 → 一次性逻辑删除 */
async function handleBatchDelete() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先勾选要删除的文档')
    return
  }

  const count = selectedIds.value.length
  const selectedDocs = documents.value.filter((doc) => selectedIds.value.includes(doc.id))
  const riskText = buildProcessingDeleteRiskText(selectedDocs)
  const confirmProcessing = Boolean(riskText)
  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${count} 篇文档？\n\n` +
        riskText +
        '· 文档将从列表中移除并进入回收站（保留 30 天）\n' +
        '· 检索侧将通过 is_deleted 过滤，不再返回这些文档',
      riskText ? '确认批量删除处理中文档' : '批量删除',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  batchDeleting.value = true
  try {
    await batchDeleteDocuments([...selectedIds.value], confirmProcessing)
    ElMessage.success(`已成功删除 ${count} 篇文档`)
    selectedIds.value = []
    await loadDocuments()
  } catch (error: any) {
    ElMessage.error(friendlyErrorMessage(error, '批量删除失败'))
  } finally {
    batchDeleting.value = false
  }
}

function openTagDialog(row: DocumentItem) {
  editingDoc.value = row
  tagEditTags.value = row.tags?.length ? [...row.tags] : []
  tagDialogVisible.value = true
}

function addTagSuggestion(tag: string) {
  if (tagSaving.value || tagEditTags.value.includes(tag)) return
  tagEditTags.value = normalizeTags([...tagEditTags.value, tag])
}

async function saveTags() {
  if (!editingDoc.value) return

  const tags = normalizeTags(tagEditTags.value)
  if (!tags.length) {
    ElMessage.warning('请输入至少一个标签，或取消编辑')
    return
  }
  const validationError = validateTags(tags)
  if (validationError) {
    ElMessage.warning(validationError)
    return
  }

  tagSaving.value = true
  try {
    await updateDocumentTags(editingDoc.value.id, tags)
    ElMessage.success('标签已更新，检索时将按新标签过滤')
    tagDialogVisible.value = false
    await loadDocuments()
  } catch (error: any) {
    ElMessage.error(friendlyErrorMessage(error, '标签保存失败'))
  } finally {
    tagSaving.value = false
  }
}

function closeTagDialog() {
  if (tagSaving.value) return
  tagDialogVisible.value = false
  editingDoc.value = null
  tagEditTags.value = []
}

async function openChunkDialog(row: DocumentItem) {
  chunkDialogDoc.value = row
  chunkDialogVisible.value = true
  chunkPage.value = 1
  await loadChunks()
}

async function loadChunks() {
  if (!chunkDialogDoc.value) return
  chunkLoading.value = true
  chunks.value = []
  try {
    const data = await fetchDocumentChunks(
      chunkDialogDoc.value.id,
      chunkPage.value,
      chunkPageSize.value,
      chunkKeyword.value,
    )
    chunks.value = data.records
    chunkTotal.value = data.total
  } catch (error: any) {
    ElMessage.error(friendlyErrorMessage(error, '加载切片失败'))
  } finally {
    chunkLoading.value = false
  }
}

function resetChunkFilters() {
  chunkKeyword.value = ''
  chunkStatusFilter.value = ''
  chunkPageNoFilter.value = undefined
  chunkPage.value = 1
  loadChunks()
}

async function handleRetry(row: DocumentItem) {
  try {
    await ElMessageBox.confirm(
      `确认重试文档「${row.originalName}」的处理任务？`,
      '重试处理',
      { type: 'warning', confirmButtonText: '确认重试', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  retryingDocId.value = row.id
  try {
    const data = await retryDocument(row.id)
    ElMessage.success(data?.taskId ? `已创建重试任务 #${data.taskId}` : '已创建重试任务')
    await loadDocuments()
    if (taskDrawerDoc.value?.id === row.id) {
      await loadTasks()
    }
  } catch (error: any) {
    ElMessage.error(friendlyErrorMessage(error, '重试失败'))
  } finally {
    retryingDocId.value = null
  }
}

function loadPreviewChunks(rows: DocumentItem[]) {
  const candidates = rows.filter((row) => (row.chunkCount || 0) > 0)
  for (const row of candidates) {
    if (previewChunks.value[row.id] !== undefined || previewLoadingIds.value.has(row.id)) continue
    previewLoadingIds.value = new Set([...previewLoadingIds.value, row.id])
    fetchDocumentChunks(row.id, 1, 1)
      .then((data) => {
        previewChunks.value = { ...previewChunks.value, [row.id]: data.records?.[0] || null }
      })
      .catch(() => {
        previewChunks.value = { ...previewChunks.value, [row.id]: null }
      })
      .finally(() => {
        const next = new Set(previewLoadingIds.value)
        next.delete(row.id)
        previewLoadingIds.value = next
      })
  }
}

function previewFor(row: DocumentItem) {
  return previewChunks.value[row.id]
}

function isPreviewLoading(row: DocumentItem) {
  return previewLoadingIds.value.has(row.id)
}

function chunkSummary(content?: string) {
  const normalized = (content || '').replace(/\s+/g, ' ').trim()
  return normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized
}

function isChapterMissing(chapterPath?: string | null) {
  const normalized = (chapterPath || '').trim()
  return !normalized || normalized === '-' || normalized === '未识别章节路径'
}

function chapterDisplay(chapterPath?: string | null, content?: string) {
  if (!isChapterMissing(chapterPath)) return chapterPath as string
  const firstLine = (content || '').split(/\r?\n/).map((line) => line.trim()).find(Boolean)
  if (firstLine && firstLine.length <= 32 && !/[。！？.!?]$/.test(firstLine)) return `原文片段：${firstLine}`
  return '章节暂未识别'
}

function isOcrSuspect(content?: string) {
  const text = (content || '').trim()
  if (!text) return true
  const oddChars = (text.match(/[�□■◆◇●○★☆]{2,}|[^\u4e00-\u9fa5a-zA-Z0-9\s，。；：、,.!?;:()（）《》“”"'-]/g) || []).length
  const ratio = oddChars / Math.max(text.length, 1)
  return text.length < 12 || ratio > 0.12 || /[A-Za-z0-9]{20,}[\u4e00-\u9fa5]{1,}|[\u4e00-\u9fa5][A-Za-z0-9]{20,}/.test(text)
}

function toggleVector(chunk: DocumentChunk) {
  const id = chunk.id || chunk.chunkIndex
  const next = new Set(expandedVectorIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedVectorIds.value = next
}

function isVectorExpanded(chunk: DocumentChunk) {
  return expandedVectorIds.value.has(chunk.id || chunk.chunkIndex)
}

function taskStatusLabel(status?: string) {
  const map: Record<string, string> = {
    QUEUED: '排队中',
    RUNNING: '处理中',
    SUCCESS: '成功',
    FAILED: '失败',
  }
  return status ? map[status] ?? status : '-'
}

function taskTypeLabel(type?: string) {
  const map: Record<string, string> = {
    PROCESS: '首次处理',
    RETRY: '重试',
    REPROCESS: '重新处理',
    REEMBED: '重向量化',
    PURGE: '永久清理',
  }
  return type ? map[type] ?? type : '-'
}

function isProcessingStatus(status?: string) {
  return status === 'UPLOADED' || status === 'PARSING' || status === 'CHUNKING' || status === 'VECTORIZING'
}

function buildProcessingDeleteRiskText(rows: DocumentItem[]) {
  const processingDocs = rows.filter((doc) => isProcessingStatus(doc.status))
  if (!processingDocs.length) return ''

  const statusSummary = processingDocs
    .map((doc) => `「${doc.originalName}」(${processingStatusLabels[doc.status] || doc.status})`)
    .slice(0, 3)
    .join('、')
  const more = processingDocs.length > 3 ? `等 ${processingDocs.length} 篇` : ''

  return (
    `· 风险提示：${statusSummary}${more} 仍在处理流程中\n` +
    '· 确认删除后，后台处理任务可能仍会继续运行，但该文档会立即进入回收站并从检索结果中排除\n'
  )
}

function isTaskHighlighted(task: DocumentTask) {
  if (!taskDrawerHighlightFailed.value) return false
  return latestTask.value?.taskStatus === 'FAILED' && latestTask.value.id === task.id
}

async function loadTasks() {
  const docId = taskDrawerDoc.value?.id
  if (!docId) {
    tasks.value = []
    return
  }
  taskLoading.value = true
  try {
    tasks.value = await fetchDocumentTasks(docId)
  } catch (error: any) {
    tasks.value = []
    ElMessage.error(friendlyErrorMessage(error, '加载任务详情失败'))
  } finally {
    taskLoading.value = false
  }
}

function openTaskDrawer(row: DocumentItem, highlightFailed = false) {
  taskDrawerDoc.value = row
  taskDrawerHighlightFailed.value = highlightFailed
  taskDrawerVisible.value = true
}

function closeTaskDrawer() {
  taskDrawerVisible.value = false
  tasks.value = []
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function processStepIndex(status?: string) {
  const current = (status || '').toUpperCase()
  if (current === 'FAILED' || current === 'REVIEW_REJECTED') return monitorSteps.length - 1
  const index = monitorSteps.findIndex((step) => step.key === current)
  if (index >= 0) return index
  return current === 'UPLOADED' ? 0 : 1
}

function isTerminalStatus(status?: string) {
  return ['PENDING_REVIEW', 'READY', 'FAILED', 'REVIEW_REJECTED'].includes((status || '').toUpperCase())
}

function monitorStepClass(doc: DocumentItem, index: number) {
  const status = (doc.status || '').toUpperCase()
  const current = processStepIndex(status)
  return {
    done: index < current || status === 'READY',
    current: index === current && !isTerminalStatus(status),
    failed: status === 'FAILED' && index === monitorSteps.length - 1,
  }
}

function syncMonitorDocs(rows: DocumentItem[]) {
  if (!monitorDocs.value.length) return
  const byId = new Map(rows.map((row) => [row.id, row]))
  monitorDocs.value = monitorDocs.value.map((doc) => byId.get(doc.id) || doc)
  if (monitorDocs.value.every((doc) => isTerminalStatus(doc.status))) {
    stopMonitorPolling()
  }
}

function startMonitorPolling() {
  stopMonitorPolling()
  monitorTimer.value = window.setInterval(() => {
    loadDocuments()
  }, 3000)
}

function stopMonitorPolling() {
  if (monitorTimer.value !== null) {
    window.clearInterval(monitorTimer.value)
    monitorTimer.value = null
  }
}

function closeMonitor(background = false) {
  monitorVisible.value = false
  stopMonitorPolling()
  if (!background) {
    loadDocuments()
  }
}

function goReviewWorkbench() {
  router.push('/review')
}

function goRecycleBin() {
  router.push(`/bases/${kbId.value}/recycle-bin`)
}

function onUploadSuccess(uploadedDocs: DocumentItem[] = []) {
  monitorDocs.value = uploadedDocs
  monitorVisible.value = true
  startMonitorPolling()
  if (statusFilter.value) {
    ElMessage.info('已切换为全部状态，便于查看上传后处理中和待审核的文档')
  } else {
    ElMessage.success('上传成功，可在处理监控中观察解析与切片进度')
  }
  statusFilter.value = ''
  page.value = 1
  loadDocuments()
}

watch([page, pageSize, statusFilter], () => loadDocuments())

watch(
  () => [taskDrawerVisible.value, taskDrawerDoc.value?.id] as const,
  ([visible, docId]) => {
    if (visible && docId) {
      loadTasks()
    }
    if (!visible) {
      tasks.value = []
    }
  },
)

onMounted(loadDocuments)
onBeforeUnmount(stopMonitorPolling)
</script>

<template>
  <div class="document-list-page">
    <div class="page-header document-hero">
      <div>
        <p class="eyebrow">DOCUMENT PIPELINE</p>
        <h2>
          文档管理
          <el-tooltip content="展示文档从上传、解析、切片、向量化到审核就绪的完整处理链路。" placement="right">
            <span class="km-info-dot">?</span>
          </el-tooltip>
        </h2>
        <p class="subtitle">知识库 ID：{{ kbId }} · 支持上传、重试、标签编辑、切片查看与任务追踪</p>
        <div class="km-chip-row document-hero-chips">
          <span class="km-capability-chip">多格式上传</span>
          <span class="km-capability-chip">任务可追踪</span>
          <span class="km-capability-chip">标签影响检索</span>
          <span class="km-capability-chip">READY 后可查看切片</span>
        </div>
      </div>
      <div class="actions">
        <el-button @click="goRecycleBin">回收站</el-button>
        <el-button type="primary" @click="uploadVisible = true">上传文档</el-button>
      </div>
    </div>

    <section class="km-stat-grid document-overview" aria-label="文档概览">
      <el-tooltip v-for="card in documentOverviewCards" :key="card.label" :content="card.desc" placement="top">
        <article class="km-stat-card">
          <span class="km-stat-label">{{ card.label }}</span>
          <div class="km-stat-value">{{ card.value }}</div>
          <p class="km-stat-desc">{{ card.desc }}</p>
        </article>
      </el-tooltip>
    </section>

    <section class="pipeline-panel" aria-label="文档处理链路">
      <div class="pipeline-head">
        <div>
          <h3 class="km-section-title">文档处理全链路</h3>
          <p class="km-section-subtitle">上传、解析、切片、向量化、审核与检索状态集中可视化</p>
        </div>
      </div>
      <div class="km-flow">
        <div
          v-for="step in processSteps"
          :key="step.status"
          class="km-flow-step"
          :class="{ active: statusFilter === step.status, hot: (statusCounts[step.status] || 0) > 0 }"
          @click="setStatusFilter(step.status)"
        >
          <el-tooltip :content="step.desc" placement="top">
            <div>
              <strong>{{ step.title }}</strong>
              <span>{{ step.desc }}</span>
              <em>{{ statusCounts[step.status] || 0 }}</em>
            </div>
          </el-tooltip>
        </div>
      </div>
    </section>

    <section class="chunk-capability-strip km-lift-card">
      <strong>切片能力</strong>
      <span>系统已将文档解析为可检索切片，每个切片独立向量化，可支持语义检索、重排序和人工审校。</span>
    </section>

    <el-card shadow="never" class="document-card">
      <div class="toolbar">
        <el-select
          v-model="statusFilter"
          placeholder="状态筛选"
          clearable
          style="width: 160px"
        >
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-input
          v-model="keyword"
          placeholder="搜索文件名"
          clearable
          style="width: 220px"
          @keyup.enter="loadDocuments"
        />
        <el-button @click="loadDocuments">查询</el-button>
        <el-button
          type="danger"
          plain
          :disabled="!selectedIds.length || batchDeleting"
          :loading="batchDeleting"
          @click="handleBatchDelete"
        >
          批量删除{{ selectedIds.length ? ` (${selectedIds.length})` : '' }}
        </el-button>
        <div class="toolbar-spacer"></div>
        <div class="view-switch" aria-label="视图切换">
          <el-tooltip content="卡片视图" placement="top">
            <button type="button" :class="{ active: viewMode === 'card' }" @click="viewMode = 'card'">
              <el-icon><Grid /></el-icon>
            </button>
          </el-tooltip>
          <el-tooltip content="列表视图" placement="top">
            <button type="button" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
              <el-icon><List /></el-icon>
            </button>
          </el-tooltip>
        </div>
      </div>

      <div v-if="statusFilter && !loading && !documents.length" class="filter-empty-hint">
        当前筛选条件下暂无文档，可切换为全部状态查看处理中的文档
        <el-button text @click="setStatusFilter('')">切换为全部状态</el-button>
      </div>

      <div v-if="viewMode === 'card'" v-loading="loading" class="document-card-grid">
        <article v-for="row in documents" :key="row.id" class="doc-card km-lift-card">
          <div class="doc-card-head">
            <el-checkbox
              :model-value="selectedIdSet.has(row.id)"
              @change="onCardSelectionChange(row, $event)"
            />
            <div class="doc-title-block">
              <h3>{{ row.originalName }}</h3>
              <p>{{ row.createdAt || '-' }} · {{ formatSize(row.fileSize || 0) }}</p>
            </div>
            <div class="status-cell">
              <span v-if="isProcessingStatus(row.status)" class="processing-dot" />
              <DocumentStatusTag :status="row.status" />
            </div>
          </div>

          <div class="doc-tags">
            <el-tag v-for="tag in row.tags" :key="tag" size="small" type="info">{{ tag }}</el-tag>
            <span v-if="!row.tags?.length" class="muted">暂无标签</span>
          </div>

          <button
            type="button"
            class="chunk-preview-card"
            :class="{ disabled: !(row.chunkCount || 0) }"
            @click="(row.chunkCount || 0) > 0 && openChunkDialog(row)"
          >
            <div class="chunk-preview-top">
              <span>切片预览</span>
              <el-tag size="small" type="success">{{ row.chunkCount || 0 }} 块</el-tag>
            </div>
            <el-skeleton v-if="isPreviewLoading(row)" :rows="2" animated />
            <template v-else-if="previewFor(row)">
              <div class="chunk-preview-meta">
                <span>#{{ previewFor(row)?.chunkIndex }}</span>
                <span>页码 {{ previewFor(row)?.pageNo ?? '-' }}</span>
                <el-tooltip
                  v-if="isChapterMissing(previewFor(row)?.chapterPath)"
                  content="该文档未解析到明确标题层级，可通过切片内容继续检索和审核。"
                  placement="top"
                >
                  <span>{{ chapterDisplay(previewFor(row)?.chapterPath, previewFor(row)?.content) }}</span>
                </el-tooltip>
                <span v-else>{{ chapterDisplay(previewFor(row)?.chapterPath, previewFor(row)?.content) }}</span>
                <span>{{ previewFor(row)?.charCount || 0 }} 字符</span>
                <el-tag size="small" :type="previewFor(row)?.vectorStatus === 'READY' ? 'success' : 'warning'">
                  {{ previewFor(row)?.vectorStatus || 'UNKNOWN' }}
                </el-tag>
              </div>
              <p class="chunk-preview-path">
                切片 #{{ previewFor(row)?.chunkIndex }} · {{ chapterDisplay(previewFor(row)?.chapterPath, previewFor(row)?.content) }}
              </p>
              <p class="chunk-preview-text">{{ chunkSummary(previewFor(row)?.content) }}</p>
            </template>
            <p v-else class="chunk-preview-empty">
              {{ (row.chunkCount || 0) > 0 ? '切片预览暂不可用，可展开查看全部切片' : '文档尚未产生切片' }}
            </p>
            <span class="chunk-expand-hint">点击查看全部切片</span>
          </button>

          <div class="doc-card-actions">
            <el-button @click="openTaskDrawer(row)">任务详情</el-button>
            <el-button v-if="row.status === 'FAILED'" type="danger" plain @click="openTaskDrawer(row, true)">
              查看失败原因
            </el-button>
            <el-button
              v-if="row.status === 'FAILED'"
              type="warning"
              plain
              :loading="retryingDocId === row.id"
              @click="handleRetry(row)"
            >
              重试
            </el-button>
            <el-button @click="openTagDialog(row)">编辑标签</el-button>
            <el-button v-if="row.status === 'READY'" type="primary" @click="openChunkDialog(row)">
              查看切片
            </el-button>
            <el-button
              type="danger"
              plain
              :loading="deletingDocId === row.id"
              :disabled="deletingDocId !== null && deletingDocId !== row.id"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </div>
        </article>
        <el-empty v-if="!loading && !documents.length" :description="documentEmptyDescription" class="doc-empty" />
      </div>

      <div v-else v-loading="loading" class="document-table-wrap">
        <el-table :data="documents" row-key="id" class="document-table">
          <el-table-column width="48">
            <template #default="{ row }">
              <el-checkbox
                :model-value="selectedIdSet.has(row.id)"
                @change="onCardSelectionChange(row, $event)"
              />
            </template>
          </el-table-column>
          <el-table-column label="文档" min-width="220">
            <template #default="{ row }">
              <div class="table-doc-name">{{ row.originalName }}</div>
              <div class="table-doc-sub">{{ row.createdAt || '-' }} · {{ formatSize(row.fileSize || 0) }}</div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="130">
            <template #default="{ row }">
              <div class="status-cell">
                <span v-if="isProcessingStatus(row.status)" class="processing-dot" />
                <DocumentStatusTag :status="row.status" />
              </div>
            </template>
          </el-table-column>
          <el-table-column label="标签" min-width="150">
            <template #default="{ row }">
              <div class="table-tags">
                <el-tag v-for="tag in row.tags?.slice(0, 3)" :key="tag" size="small" type="info">{{ tag }}</el-tag>
                <span v-if="!row.tags?.length" class="muted">暂无标签</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="切片 / 检索" width="130">
            <template #default="{ row }">
              <div class="table-doc-sub">
                <strong>{{ row.chunkCount || 0 }}</strong> 块
                <span>{{ row.status === 'READY' ? '可检索' : '未就绪' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="最新处理" min-width="150">
            <template #default="{ row }">{{ row.updatedAt || row.createdAt || '-' }}</template>
          </el-table-column>
          <el-table-column label="操作" min-width="260">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link @click="openTaskDrawer(row)">任务</el-button>
                <el-button link @click="openTagDialog(row)">标签</el-button>
                <el-button link :disabled="!(row.chunkCount || 0)" @click="openChunkDialog(row)">切片</el-button>
                <el-button v-if="row.status === 'FAILED'" link type="warning" :loading="retryingDocId === row.id" @click="handleRetry(row)">重试</el-button>
                <el-button link type="danger" :loading="deletingDocId === row.id" @click="handleDelete(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && !documents.length" :description="documentEmptyDescription" class="doc-empty" />
      </div>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
        />
      </div>
    </el-card>

    <UploadDocumentDialog
      :visible="uploadVisible"
      :kb-id="kbId"
      @update:visible="uploadVisible = $event"
      @success="onUploadSuccess"
    />

    <el-drawer
      v-model="monitorVisible"
      title="文档处理监控"
      size="min(860px, 94vw)"
      class="upload-monitor-drawer"
      @close="closeMonitor(true)"
    >
      <div class="monitor-intro">
        <p class="drawer-kicker">Processing Pipeline</p>
        <h3>上传后的实时处理状态</h3>
        <p>基于后端返回的文档状态刷新，不伪造细粒度阶段；进入待审核、就绪或失败后自动停止轮询。</p>
      </div>
      <div v-if="monitorDocs.length" class="monitor-doc-list">
        <article v-for="doc in monitorDocs" :key="doc.id" class="monitor-doc-card">
          <div class="monitor-doc-head">
            <div>
              <strong>{{ doc.originalName }}</strong>
              <span>当前状态：{{ doc.status }}</span>
            </div>
            <DocumentStatusTag :status="doc.status" />
          </div>
          <div class="monitor-flow">
            <div
              v-for="(step, index) in monitorSteps"
              :key="step.key"
              class="monitor-step"
              :class="monitorStepClass(doc, index)"
            >
              <span class="monitor-dot">{{ monitorStepClass(doc, index).done ? '✓' : '' }}</span>
              <em>{{ step.title }}</em>
            </div>
          </div>
          <el-alert
            v-if="doc.status === 'FAILED'"
            type="error"
            :closable="false"
            show-icon
            :title="doc.errorMessage || doc.errorStage || '处理失败，请查看任务详情'"
          />
        </article>
      </div>
      <el-empty v-else description="暂无上传文档监控记录" />
      <template #footer>
        <div class="monitor-footer">
          <el-button @click="closeMonitor(true)">后台运行，返回文档列表</el-button>
          <el-button @click="closeMonitor(false)">查看文档列表</el-button>
          <el-button type="primary" @click="goReviewWorkbench">前往审核工作台</el-button>
        </div>
      </template>
    </el-drawer>

    <el-dialog
      v-model="tagDialogVisible"
      title="编辑文档标签"
      width="780px"
      class="tag-editor-dialog"
      destroy-on-close
      @close="closeTagDialog"
    >
      <div v-if="editingDoc" class="tag-dialog-body">
        <section class="tag-editor-hero">
          <div>
            <span class="tag-editor-kicker">Metadata Editor</span>
            <h3>{{ editingDoc.originalName }}</h3>
            <p>标签保存后会参与知识检索中的标签过滤，建议使用稳定、可复用的业务词。</p>
          </div>
          <div class="tag-editor-meta">
            <span class="km-meta-chip">状态：{{ editingDoc.status }}</span>
            <span class="km-meta-chip">切片：{{ editingDoc.chunkCount || 0 }}</span>
            <span class="km-meta-chip">大小：{{ formatSize(editingDoc.fileSize || 0) }}</span>
          </div>
        </section>

        <section class="tag-editor-section">
          <div class="tag-editor-title">
            <strong>当前标签</strong>
            <span>可输入新标签后按 Enter 创建，也可点击推荐标签快速加入。</span>
          </div>
          <el-select
            v-model="tagEditTags"
            multiple
            filterable
            allow-create
            default-first-option
            :reserve-keyword="false"
            placeholder="输入标签后回车，或从列表选择"
            class="tag-select"
            :disabled="tagSaving"
          >
            <el-option
              v-for="tag in normalizeTags([...tagEditTags, ...tagSuggestions])"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </section>

        <section class="tag-editor-section">
          <div class="tag-editor-title">
            <strong>推荐 / 最近使用</strong>
            <span>基于当前列表已有标签与常用业务标签生成，不新增后端依赖。</span>
          </div>
          <div class="km-chip-row">
            <button
              v-for="tag in tagSuggestions"
              :key="tag"
              type="button"
              class="tag-suggestion"
              @click="addTagSuggestion(tag)"
            >
              + {{ tag }}
            </button>
          </div>
        </section>

        <div class="tag-preview-panel">
          <span class="preview-label">保存预览</span>
          <div v-if="normalizeTags(tagEditTags).length" class="tag-preview">
            <el-tag
              v-for="tag in normalizeTags(tagEditTags)"
              :key="tag"
              size="large"
              effect="plain"
            >
              {{ tag }}
            </el-tag>
          </div>
          <p v-else>当前没有标签，保存后检索侧将无法通过标签命中该文档。</p>
        </div>
      </div>
      <template #footer>
        <div class="tag-dialog-footer">
          <span>保存后立即更新该文档的元数据标签。</span>
          <div>
            <el-button :disabled="tagSaving" @click="closeTagDialog">取消</el-button>
            <el-button type="primary" :loading="tagSaving" @click="saveTags">保存标签</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-drawer
      v-model="taskDrawerVisible"
      title="任务详情"
      size="520px"
      destroy-on-close
      @close="closeTaskDrawer"
    >
      <div v-if="taskDrawerDoc?.originalName" class="task-doc-name">
        文档：{{ taskDrawerDoc.originalName }}
      </div>
      <el-alert
        :closable="false"
        :type="taskDisplayState === 'failed' ? 'error' : 'info'"
        show-icon
      >
        {{ taskStateHint }}
      </el-alert>
      <el-skeleton v-if="taskLoading" :rows="6" animated style="margin-top: 16px" />
      <el-empty v-else-if="!tasks.length" description="暂无任务记录" style="margin-top: 24px" />
      <div v-else class="task-list">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="task-card"
          :class="{ highlighted: isTaskHighlighted(task) }"
        >
          <div class="task-head">
            <strong>{{ taskTypeLabel(task.taskType) }}</strong>
            <el-tag
              size="small"
              :type="task.taskStatus === 'FAILED' ? 'danger' : task.taskStatus === 'SUCCESS' ? 'success' : 'info'"
            >
              {{ taskStatusLabel(task.taskStatus) }}
            </el-tag>
          </div>
          <dl class="task-meta">
            <div><dt>触发来源</dt><dd>{{ task.triggerSource || '-' }}</dd></div>
            <div><dt>处理进度</dt><dd>{{ task.progress ?? 0 }}%</dd></div>
            <div><dt>重试次数</dt><dd>{{ task.retryCount ?? 0 }}</dd></div>
            <div><dt>失败阶段</dt><dd>{{ task.errorStage || '-' }}</dd></div>
            <div class="full"><dt>失败原因</dt><dd>{{ task.errorMessage || '-' }}</dd></div>
            <div><dt>创建时间</dt><dd>{{ task.createdAt || '-' }}</dd></div>
            <div><dt>开始时间</dt><dd>{{ task.startedAt || '-' }}</dd></div>
            <div><dt>结束时间</dt><dd>{{ task.finishedAt || '-' }}</dd></div>
          </dl>
        </div>
      </div>
    </el-drawer>

    <el-drawer
      v-model="chunkDialogVisible"
      title="切片详情"
      size="min(1180px, 94vw)"
      class="chunk-detail-drawer"
      destroy-on-close
    >
      <div class="chunk-drawer-layout">
        <aside class="chunk-drawer-side">
          <p class="drawer-kicker">Chunk Intelligence</p>
          <h3>{{ chunkDialogDoc?.originalName }}</h3>
          <p>系统已将文档解析为可检索切片，每个切片独立向量化，可支持语义检索、重排序和人工审校。</p>
          <div class="chunk-side-stats">
            <div><span>切片总数</span><strong>{{ chunkStats.total }}</strong></div>
            <div><span>就绪切片</span><strong>{{ chunkStats.ready }}</strong></div>
            <div><span>人工编辑</span><strong>{{ chunkStats.edited }}</strong></div>
          </div>
          <div class="chunk-side-meta">
            <span>文档 ID：{{ chunkDialogDoc?.id }}</span>
            <span>状态：{{ chunkDialogDoc?.status }}</span>
            <span>大小：{{ formatSize(chunkDialogDoc?.fileSize || 0) }}</span>
          </div>
        </aside>

        <main class="chunk-drawer-main">
          <div class="chunk-toolbar">
            <el-input
              v-model="chunkKeyword"
              placeholder="搜索切片内容"
              clearable
              @keyup.enter="loadChunks"
              @clear="loadChunks"
            />
            <el-select v-model="chunkStatusFilter" clearable placeholder="向量状态" style="width: 150px">
              <el-option label="READY" value="READY" />
              <el-option label="PENDING" value="PENDING" />
              <el-option label="FAILED" value="FAILED" />
            </el-select>
            <el-input-number
              v-model="chunkPageNoFilter"
              :min="1"
              controls-position="right"
              placeholder="页码"
              style="width: 130px"
            />
            <el-button :loading="chunkLoading" @click="loadChunks">查询</el-button>
            <el-button @click="resetChunkFilters">重置</el-button>
          </div>
          <el-skeleton v-if="chunkLoading" :rows="5" animated />
          <div v-else class="chunk-list">
            <div v-for="chunk in filteredChunks" :key="chunk.id || chunk.chunkIndex" class="chunk-item">
              <div class="chunk-head">
                <strong>#{{ chunk.chunkIndex }}</strong>
                <span>{{ chunk.charCount }} 字符</span>
              </div>
              <div class="chunk-meta">
                <span>页码：{{ chunk.pageNo ?? '-' }}</span>
                <el-tooltip
                  v-if="isChapterMissing(chunk.chapterPath)"
                  content="该文档未解析到明确标题层级，可通过切片内容继续检索和审核。"
                  placement="top"
                >
                  <span>章节：{{ chapterDisplay(chunk.chapterPath, chunk.content) }}</span>
                </el-tooltip>
                <span v-else>章节：{{ chapterDisplay(chunk.chapterPath, chunk.content) }}</span>
                <el-tag size="small" :type="chunk.vectorStatus === 'READY' ? 'success' : 'warning'">
                  {{ chunk.vectorStatus || 'UNKNOWN' }}
                </el-tag>
                <el-tag v-if="isOcrSuspect(chunk.content)" size="small" type="warning">疑似 OCR 异常</el-tag>
              </div>
              <pre class="chunk-content">{{ chunk.content }}</pre>
              <button v-if="chunk.vectorId" type="button" class="vector-toggle" @click="toggleVector(chunk)">
                {{ isVectorExpanded(chunk) ? '收起 vectorId' : '展开 vectorId' }}
              </button>
              <code v-if="chunk.vectorId && isVectorExpanded(chunk)" class="vector-id">{{ chunk.vectorId }}</code>
            </div>
            <el-empty v-if="!filteredChunks.length" description="暂无符合筛选条件的切片" />
          </div>
          <div class="chunk-pagination">
            <el-pagination
              v-model:current-page="chunkPage"
              v-model:page-size="chunkPageSize"
              :total="chunkTotal"
              :page-sizes="[20, 50, 100]"
              layout="total, sizes, prev, pager, next"
              @current-change="loadChunks"
              @size-change="loadChunks"
            />
          </div>
        </main>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.document-list-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.document-hero {
  padding: 28px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.16), rgba(255, 255, 255, 0.04) 46%, rgba(244, 184, 96, 0.07)),
    rgba(12, 22, 19, 0.72);
  box-shadow: var(--km-shadow-card);
  backdrop-filter: blur(18px);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--km-green-strong);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
  font-weight: 720;
}

.page-header h2 {
  margin: 0;
  color: var(--km-ink);
  font-size: clamp(30px, 4vw, 40px);
  line-height: 1.1;
}

.subtitle {
  margin: 10px 0 0;
  color: var(--km-muted);
  font-size: 13px;
}

.document-hero-chips {
  margin-top: 18px;
}

.actions {
  display: flex;
  gap: 8px;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
  align-items: center;
}

.toolbar-spacer {
  flex: 1 1 auto;
}

.view-switch {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--km-border-light);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.16);
}

.view-switch button {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: 999px;
  color: var(--km-muted);
  background: transparent;
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
}

.view-switch button:hover,
.view-switch button.active {
  color: var(--km-green-strong);
  border-color: rgba(114, 239, 182, 0.34);
  background: rgba(79, 214, 154, 0.12);
  box-shadow: 0 0 18px rgba(79, 214, 154, 0.12);
  transform: translateY(-1px);
}

.document-card {
  border-radius: var(--km-radius-xl);
}

.chunk-capability-strip {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px 18px;
  border: 1px solid rgba(114, 239, 182, 0.24);
  border-radius: var(--km-radius-lg);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.13), rgba(113, 215, 255, 0.055)),
    rgba(255, 255, 255, 0.035);
}

.chunk-capability-strip strong {
  flex: 0 0 auto;
  color: var(--km-green-strong);
}

.chunk-capability-strip span {
  color: var(--km-text);
  line-height: 1.6;
}

.document-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr));
  gap: 16px;
  min-height: 180px;
}

.filter-empty-hint {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(244, 184, 96, 0.22);
  border-radius: var(--km-radius-md);
  color: #ffd08a;
  background: rgba(244, 184, 96, 0.08);
  font-size: 13px;
}

.document-table-wrap {
  min-width: 0;
  overflow-x: hidden;
}

.document-table {
  width: 100%;
}

.table-doc-name {
  overflow: hidden;
  color: var(--km-ink);
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-doc-sub {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  color: var(--km-muted);
  font-size: 12px;
}

.table-doc-sub strong {
  color: var(--km-green-strong);
}

.table-tags,
.table-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.table-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.doc-card {
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.065), rgba(255, 255, 255, 0.025)),
    rgba(12, 22, 19, 0.72);
  box-shadow: var(--km-shadow-soft);
}

.doc-card-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}

.doc-title-block {
  min-width: 0;
}

.doc-title-block h3 {
  margin: 0;
  overflow: hidden;
  color: var(--km-ink);
  font-size: 18px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-title-block p {
  margin: 6px 0 0;
  color: var(--km-muted);
  font-size: 13px;
}

.doc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  min-height: 28px;
  margin-top: 14px;
}

.chunk-preview-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-height: 184px;
  margin-top: 14px;
  padding: 16px;
  border: 1px solid rgba(114, 239, 182, 0.2);
  border-radius: var(--km-radius-lg);
  color: var(--km-text);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.1), rgba(113, 215, 255, 0.045)),
    rgba(0, 0, 0, 0.16);
  text-align: left;
  cursor: pointer;
  transition:
    transform 180ms var(--km-ease-out),
    border-color 180ms var(--km-ease-out),
    background-color 180ms var(--km-ease-out);
}

.chunk-preview-card::after {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  height: 28px;
  pointer-events: none;
  content: "";
  background: linear-gradient(180deg, transparent, rgba(5, 10, 8, 0.82));
}

.chunk-preview-card:hover {
  border-color: rgba(114, 239, 182, 0.42);
  background: rgba(79, 214, 154, 0.1);
  box-shadow: 0 16px 44px rgba(79, 214, 154, 0.1), inset 0 0 0 1px rgba(114, 239, 182, 0.18);
  transform: translateY(-2px);
}

.chunk-preview-card.disabled {
  cursor: default;
  opacity: 0.78;
}

.chunk-preview-top,
.chunk-preview-meta,
.doc-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.chunk-preview-top {
  justify-content: space-between;
}

.chunk-preview-top span {
  color: var(--km-ink);
  font-weight: 700;
}

.chunk-preview-meta span,
.chunk-expand-hint {
  display: inline-flex;
  padding: 4px 9px;
  border: 1px solid var(--km-border-light);
  border-radius: 999px;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
}

.chunk-preview-card:hover .chunk-preview-meta span,
.chunk-preview-card:hover .chunk-preview-path {
  border-color: rgba(114, 239, 182, 0.28);
  color: var(--km-green-strong);
}

.chunk-preview-path,
.chunk-preview-text,
.chunk-preview-empty {
  margin: 0;
  color: var(--km-muted);
  line-height: 1.62;
  word-break: break-word;
}

.chunk-preview-text {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  color: var(--km-text);
}

.chunk-expand-hint {
  position: relative;
  z-index: 1;
  width: max-content;
  margin-top: auto;
  color: var(--km-green-strong);
}

.doc-card-actions {
  margin-top: 14px;
}

.doc-card-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.doc-empty {
  grid-column: 1 / -1;
}

.pipeline-panel {
  padding: 20px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: var(--km-shadow-soft);
}

.pipeline-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.km-flow-step {
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
}

.km-flow-step:hover,
.km-flow-step.active {
  border-color: rgba(114, 239, 182, 0.38);
  background: rgba(79, 214, 154, 0.1);
  transform: translateY(-1px);
}

.km-flow-step.hot::before {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 7px;
  height: 7px;
  border-radius: 999px;
  content: "";
  background: var(--km-green-strong);
  box-shadow: 0 0 0 5px rgba(79, 214, 154, 0.1);
}

.km-flow-step em {
  display: inline-flex;
  margin-top: 10px;
  color: var(--km-green-strong);
  font-style: normal;
  font-size: 18px;
  font-weight: 740;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.muted {
  color: var(--km-faint);
}

.status-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.processing-dot {
  width: 8px;
  height: 8px;
  border: 2px solid var(--el-color-primary-light-5);
  border-top-color: var(--el-color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.tag-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 2px;
}

.tag-editor-hero,
.tag-editor-section,
.tag-preview-panel {
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background: rgba(255, 255, 255, 0.035);
}

.tag-editor-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
  padding: 18px;
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.12), rgba(113, 215, 255, 0.05)),
    rgba(255, 255, 255, 0.035);
}

.tag-editor-kicker {
  display: inline-flex;
  margin-bottom: 8px;
  color: var(--km-green-strong);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 11px;
  font-weight: 760;
}

.tag-editor-hero h3 {
  margin: 0;
  color: var(--km-ink);
  font-size: 20px;
  line-height: 1.35;
  word-break: break-word;
}

.tag-editor-hero p {
  max-width: 580px;
  margin: 8px 0 0;
  color: var(--km-muted);
  font-size: 13px;
}

.tag-editor-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.tag-editor-section {
  padding: 16px;
}

.tag-editor-title {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.tag-editor-title strong {
  color: var(--km-ink);
  font-size: 14px;
}

.tag-editor-title span {
  color: var(--km-muted);
  font-size: 12px;
}

.tag-select {
  width: 100%;
}

.tag-select :deep(.el-select__tags) {
  gap: 6px;
}

.tag-select :deep(.el-input__wrapper) {
  min-height: 52px;
  align-items: flex-start;
  padding-top: 9px;
  padding-bottom: 9px;
}

.tag-suggestion {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 5px 12px;
  border: 1px solid rgba(114, 239, 182, 0.22);
  border-radius: 999px;
  color: var(--km-green-strong);
  background: rgba(79, 214, 154, 0.08);
  cursor: pointer;
  font-size: 12px;
  font-weight: 650;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.tag-suggestion:hover {
  border-color: rgba(114, 239, 182, 0.42);
  background: rgba(79, 214, 154, 0.14);
  transform: translateY(-1px);
}

.tag-preview-panel {
  padding: 15px 16px;
}

.tag-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.preview-label {
  font-size: 12px;
  color: var(--km-muted);
  font-weight: 650;
}

.tag-preview-panel p {
  margin: 8px 0 0;
  color: var(--km-muted);
  font-size: 13px;
}

.tag-dialog-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  width: 100%;
}

.tag-dialog-footer span {
  color: var(--km-muted);
  font-size: 12px;
}

.chunk-list {
  max-height: min(62vh, 680px);
  overflow-y: auto;
  padding-right: 4px;
}

.chunk-toolbar,
.chunk-pagination {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.chunk-pagination {
  margin: 12px 0 0;
}

.chunk-item {
  margin-bottom: 12px;
  padding: 18px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-md);
  background: rgba(255, 255, 255, 0.035);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.chunk-item:hover {
  border-color: rgba(114, 239, 182, 0.28);
  background: rgba(79, 214, 154, 0.065);
  box-shadow: inset 0 0 0 1px rgba(114, 239, 182, 0.12), 0 10px 30px rgba(79, 214, 154, 0.08);
  transform: translateY(-1px);
}

.chunk-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--km-muted);
  font-size: 13px;
}

.chunk-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-bottom: 8px;
  color: var(--km-muted);
  font-size: 12px;
}

.chunk-meta span {
  display: inline-flex;
  padding: 4px 9px;
  border: 1px solid var(--km-border-light);
  border-radius: 999px;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.035);
}

.chunk-content {
  margin: 0;
  padding: 12px;
  border: 1px solid var(--km-border-light);
  border-radius: 12px;
  color: var(--km-text);
  background: rgba(0, 0, 0, 0.18);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  max-height: 230px;
  overflow: hidden;
}

.chunk-drawer-layout {
  display: grid;
  grid-template-columns: minmax(250px, 320px) minmax(0, 1fr);
  gap: 18px;
  min-height: calc(100vh - 142px);
}

.chunk-drawer-side,
.chunk-drawer-main,
.monitor-intro,
.monitor-doc-card {
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background: rgba(255, 255, 255, 0.035);
}

.chunk-drawer-side {
  align-self: start;
  position: sticky;
  top: 0;
  padding: 20px;
}

.drawer-kicker {
  margin: 0 0 8px;
  color: var(--km-green-strong);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
  font-weight: 760;
}

.chunk-drawer-side h3,
.monitor-intro h3 {
  margin: 0;
  color: var(--km-ink);
  font-size: 22px;
  line-height: 1.25;
  word-break: break-word;
}

.chunk-drawer-side p,
.monitor-intro p {
  color: var(--km-muted);
  line-height: 1.65;
}

.chunk-side-stats {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}

.chunk-side-stats div {
  padding: 14px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-md);
  background: rgba(0, 0, 0, 0.16);
}

.chunk-side-stats span {
  color: var(--km-muted);
  font-size: 12px;
}

.chunk-side-stats strong {
  display: block;
  margin-top: 6px;
  color: var(--km-ink);
  font-size: 28px;
  font-variant-numeric: tabular-nums;
}

.chunk-side-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  color: var(--km-muted);
  font-size: 13px;
}

.chunk-drawer-main {
  min-width: 0;
  padding: 18px;
}

.chunk-drawer-main .chunk-list {
  max-height: calc(100vh - 290px);
}

.chunk-toolbar :deep(.el-input) {
  width: min(420px, 100%);
}

.vector-toggle {
  margin-top: 10px;
  padding: 0;
  border: 0;
  color: var(--km-green-strong);
  background: transparent;
  cursor: pointer;
  font-weight: 650;
}

.vector-id {
  display: block;
  margin-top: 8px;
  padding: 10px;
  overflow-wrap: anywhere;
  border: 1px solid var(--km-border-light);
  border-radius: 12px;
  color: var(--km-text);
  background: rgba(0, 0, 0, 0.22);
}

.monitor-intro {
  padding: 18px;
  margin-bottom: 16px;
}

.monitor-doc-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.monitor-doc-card {
  padding: 16px;
}

.monitor-doc-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.monitor-doc-head strong {
  display: block;
  color: var(--km-ink);
  font-size: 16px;
}

.monitor-doc-head span {
  display: block;
  margin-top: 5px;
  color: var(--km-muted);
  font-size: 13px;
}

.monitor-flow {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  margin: 16px 0;
}

.monitor-step {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
  align-items: center;
  padding: 10px 8px;
  border: 1px solid var(--km-border-light);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
  text-align: center;
}

.monitor-step.done {
  border-color: rgba(114, 239, 182, 0.36);
  background: rgba(79, 214, 154, 0.11);
  box-shadow: 0 0 18px rgba(79, 214, 154, 0.08);
}

.monitor-step.current {
  border-color: rgba(113, 215, 255, 0.45);
  box-shadow: 0 0 24px rgba(113, 215, 255, 0.18);
  animation: km-soft-pulse 1.15s ease-in-out infinite;
}

.monitor-step::after {
  display: block;
  width: 72%;
  height: 2px;
  border-radius: 999px;
  content: "";
  background: linear-gradient(90deg, transparent, rgba(114, 239, 182, 0.72), transparent);
  background-size: 180% 100%;
  opacity: 0;
}

.monitor-step.done::after,
.monitor-step.current::after {
  opacity: 1;
  animation: km-pulse-line 1.5s linear infinite;
}

.monitor-step.failed {
  border-color: rgba(255, 109, 98, 0.46);
  background: rgba(255, 109, 98, 0.09);
}

.monitor-dot {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  color: #03110c;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
  font-weight: 800;
}

.monitor-step.done .monitor-dot {
  background: var(--km-green-strong);
}

.monitor-step.current .monitor-dot {
  background: var(--km-cyan);
  box-shadow: 0 0 18px rgba(113, 215, 255, 0.34);
}

.monitor-step.failed .monitor-dot {
  background: var(--km-danger);
}

.monitor-step em {
  overflow-wrap: anywhere;
  color: var(--km-text);
  font-size: 12px;
  font-style: normal;
}

.monitor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.task-doc-name {
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.task-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-md);
  padding: 14px;
  background: rgba(255, 255, 255, 0.035);
}

.task-card.highlighted {
  border-color: rgba(255, 109, 98, 0.48);
  background: rgba(255, 109, 98, 0.08);
}

.task-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-meta {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}

.task-meta div {
  min-width: 0;
}

.task-meta div.full {
  grid-column: 1 / -1;
}

.task-meta dt {
  margin: 0;
  font-size: 12px;
  color: var(--km-muted);
}

.task-meta dd {
  margin: 2px 0 0;
  font-size: 13px;
  word-break: break-word;
}

.document-card :deep(.el-table) {
  background: transparent;
}

.document-card :deep(.el-table__fixed-right) {
  background: rgba(10, 20, 17, 0.96);
}

.document-card :deep(.el-button.is-link) {
  color: var(--km-green-strong);
}

.document-card :deep(.el-button--danger.is-link) {
  color: #ffaaa3;
}

.document-card :deep(.el-button--warning.is-link) {
  color: #ffd08a;
}

@media (max-width: 768px) {
  .document-hero {
    flex-direction: column;
    gap: 18px;
    padding: 22px;
  }

  .actions {
    width: 100%;
  }

  .actions :deep(.el-button) {
    flex: 1;
  }

  .tag-editor-hero {
    grid-template-columns: 1fr;
  }

  .tag-editor-meta {
    align-items: flex-start;
  }

  .tag-dialog-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .chunk-capability-strip,
  .doc-card-head,
  .chunk-drawer-layout {
    grid-template-columns: 1fr;
  }

  .chunk-capability-strip {
    flex-direction: column;
    align-items: flex-start;
  }

  .monitor-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .monitor-footer {
    flex-direction: column;
  }
}
</style>
