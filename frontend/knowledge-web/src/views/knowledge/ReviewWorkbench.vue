<template>
  <div class="review-page">
    <section class="toolbar review-hero">
      <div>
        <p class="eyebrow">CHUNK QUALITY REVIEW</p>
        <h2>
          切片质量审核中心
          <el-tooltip content="人工审核确认文档与切片质量，通过后文档才进入可检索状态。" placement="right">
            <span class="km-info-dot">?</span>
          </el-tooltip>
        </h2>
        <p>检查文档解析、切片粒度、OCR 质量与向量状态，确认后文档才可进入知识检索。</p>
        <div class="km-chip-row review-hero-chips">
          <span class="km-capability-chip">人工质量闸口</span>
          <span class="km-capability-chip">切片可编辑</span>
          <span class="km-capability-chip">操作可追溯</span>
          <span class="km-capability-chip">通过后进入 READY</span>
        </div>
      </div>
      <div class="toolbar-actions">
        <el-select
          v-model="kbIdFilter"
          clearable
          filterable
          :loading="kbLoading"
          placeholder="全部知识库"
          class="kb-filter"
          @clear="reloadList"
          @change="reloadList"
        >
          <el-option
            v-for="kb in knowledgeBases"
            :key="kb.id"
            :label="kb.name"
            :value="kb.id"
          />
        </el-select>
        <el-button :loading="listLoading" @click="reloadList">刷新列表</el-button>
      </div>
    </section>

    <section class="km-stat-grid review-overview" aria-label="审核任务概览">
      <el-tooltip v-for="card in reviewOverviewCards" :key="card.label" :content="card.desc" placement="top">
        <article class="km-stat-card">
          <span class="km-stat-label">{{ card.label }}</span>
          <div class="km-stat-value">{{ card.value }}</div>
          <p class="km-stat-desc">{{ card.desc }}</p>
        </article>
      </el-tooltip>
    </section>

    <section class="review-flow">
      <div class="km-flow">
        <div v-for="step in reviewFlowSteps" :key="step.title" class="km-flow-step hot">
          <el-tooltip :content="step.tooltip" placement="top">
            <div>
              <strong>{{ step.title }}</strong>
              <span>{{ step.desc }}</span>
            </div>
          </el-tooltip>
        </div>
      </div>
    </section>

    <section class="workbench">
      <aside class="document-list">
        <div class="panel-title">
          <span>待审核文档</span>
          <el-tag size="small" type="warning">{{ total }} 条</el-tag>
        </div>
        <el-skeleton v-if="listLoading && !documents.length" :rows="6" animated />
        <div v-else-if="!documents.length" class="review-empty-state">
          <strong>暂无待审核文档</strong>
          <p>所有文档当前均已完成审核或尚未进入待审核阶段。</p>
          <div class="empty-actions">
            <el-button type="primary" @click="router.push('/bases')">去文档管理</el-button>
            <el-button :loading="listLoading" @click="reloadList">刷新列表</el-button>
          </div>
        </div>
        <template v-else>
          <button
            v-for="doc in documents"
            :key="doc.docId"
            class="doc-item"
            :class="{ active: selectedDocId === doc.docId }"
            @click="selectDocument(doc.docId)"
          >
            <span v-if="isNewReviewDoc(doc)" class="review-new-dot" title="新可审核文档"></span>
            <span class="doc-name">{{ doc.originalName }}</span>
            <span class="doc-meta">{{ doc.kbName || `知识库 ${doc.kbId}` }}</span>
            <span class="doc-meta">上传/完成：{{ doc.createdAt || '-' }}</span>
            <span class="doc-foot">
              <el-tag size="small" type="primary">{{ statusLabel(doc.status) }}</el-tag>
              <span>{{ doc.chunkCount || 0 }} 块 · READY 比例待确认</span>
            </span>
          </button>
        </template>
        <el-pagination
          v-if="total > pageSize"
          small
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          @current-change="changePage"
        />
      </aside>

      <main class="detail-panel">
        <section v-if="reviewOutcome" class="review-outcome" :class="reviewOutcome.type">
          <div>
            <p class="outcome-kicker">{{ reviewOutcome.type === 'approved' ? 'REVIEW APPROVED' : 'REVIEW REJECTED' }}</p>
            <h3>{{ reviewOutcome.type === 'approved' ? '审核通过成功' : '审核未通过' }}</h3>
            <p class="outcome-doc">{{ reviewOutcome.docName }}</p>
          </div>
          <div class="outcome-grid">
            <div>
              <span>审核结果</span>
              <strong>{{ reviewOutcome.type === 'approved' ? '已通过' : '未通过' }}</strong>
            </div>
            <div>
              <span>当前状态</span>
              <strong>{{ reviewOutcome.status }}</strong>
            </div>
            <div>
              <span>检索范围</span>
              <strong>{{ reviewOutcome.type === 'approved' ? '已进入知识检索范围' : '不会进入检索' }}</strong>
            </div>
            <div>
              <span>切片统计</span>
              <strong>{{ reviewOutcome.readyChunks }}/{{ reviewOutcome.chunkCount }} READY</strong>
            </div>
            <div>
              <span>知识库</span>
              <strong>{{ reviewOutcome.kbName || `知识库 ${reviewOutcome.kbId}` }}</strong>
            </div>
            <div v-if="reviewOutcome.reason">
              <span>拒绝原因</span>
              <strong>{{ reviewOutcome.reason }}</strong>
            </div>
          </div>
          <div class="outcome-actions">
            <el-button @click="reviewOutcome = null">返回待审核列表</el-button>
            <el-button @click="loadReviewRecordsFromOutcome">查看审核记录</el-button>
            <el-button v-if="reviewOutcome.type === 'approved'" type="primary" @click="goSearch">去知识检索</el-button>
            <el-button v-else type="warning" @click="reviewOutcome = null">返回列表后重新处理</el-button>
          </div>
          <div
            v-if="selectedDocId === reviewOutcome.docId"
            class="outcome-records"
          >
            <el-skeleton v-if="recordLoading" :rows="3" animated />
            <el-alert v-else-if="recordError" type="warning" :closable="false" show-icon :title="recordError" />
            <el-empty v-else-if="!reviewRecords.length" description="暂无审核记录，当前文档尚未产生审核/编辑操作" />
            <el-timeline v-else>
              <el-timeline-item
                v-for="record in reviewRecords"
                :key="`${record.source || 'REVIEW'}-${record.id}`"
                :timestamp="record.createdAt"
                placement="top"
              >
                <div class="record-item">
                  <el-tag :type="reviewActionTagType(record.action)" size="small">
                    {{ reviewActionLabel(record.action) }}
                  </el-tag>
                  <el-tag size="small" type="info" effect="plain">
                    {{ record.chunkId ? `chunkId: ${record.chunkId}` : '切片操作记录' }}
                  </el-tag>
                  <span>{{ record.operatorName || record.operatorUserId || '未知操作人' }}</span>
                  <p v-if="record.comment">{{ record.comment }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </section>
        <el-empty v-else-if="!selectedDocId" description="请先选择待审核文档" />
        <el-skeleton v-else-if="detailLoading && !detail" :rows="8" animated />
        <template v-else-if="detail">
          <div class="detail-header">
            <div>
              <h3>{{ detail.originalName }}</h3>
              <div class="detail-subtitle">
                <span>{{ detail.kbName || `知识库 ${detail.kbId}` }}</span>
                <span>文档 ID: {{ detail.docId }}</span>
                <span>当前版本: v{{ detail.currentVersionNo || '-' }}</span>
                <span>分块: {{ detail.chunkCount || detail.chunks.length }}</span>
              </div>
              <div class="detail-subtitle">
                <span>上传时间: {{ detail.createdAt || '-' }}</span>
                <span>处理完成: {{ detail.updatedAt || '-' }}</span>
              </div>
            </div>
            <div class="detail-actions">
              <el-tooltip content="当前文档审核流转状态。" placement="top">
                <el-tag :type="detail.status === 'PENDING_REVIEW' ? 'primary' : 'info'">
                  {{ statusLabel(detail.status) }}
                </el-tag>
              </el-tooltip>
              <el-button :loading="detailLoading" @click="refreshDetail">刷新状态</el-button>
            </div>
          </div>

          <div v-if="detail.tags?.length" class="tag-row">
            <el-tag v-for="tag in detail.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
          </div>

          <div class="detail-flow-strip">
            <span class="km-meta-chip">上传：{{ detail.createdAt || '-' }}</span>
            <span class="km-meta-chip">处理完成：{{ detail.updatedAt || '-' }}</span>
            <span class="km-meta-chip">当前版本：v{{ detail.currentVersionNo || '-' }}</span>
            <span class="km-meta-chip">切片：{{ detail.chunkCount || detail.chunks.length }}</span>
          </div>

          <section class="action-bar">
            <el-input
              v-model="approveComment"
              placeholder="通过备注，可选"
              :disabled="reviewSubmitting || detail.status !== 'PENDING_REVIEW'"
            />
            <el-button
              type="success"
              :loading="reviewSubmitting"
              :disabled="detail.status !== 'PENDING_REVIEW' || hasUnreadyChunks"
              :title="hasUnreadyChunks ? '存在未就绪切片，暂不可审核通过' : ''"
              @click="approve"
            >
              确认通过
            </el-button>
          </section>

          <section class="reject-box">
            <el-input
              v-model="rejectReason"
              type="textarea"
              :rows="2"
              placeholder="拒绝原因，必填"
              :disabled="reviewSubmitting || detail.status !== 'PENDING_REVIEW'"
            />
            <el-button
              type="danger"
              :loading="reviewSubmitting"
              :disabled="detail.status !== 'PENDING_REVIEW'"
              @click="reject"
            >
              审核拒绝
            </el-button>
          </section>

          <el-alert
            v-if="hasUnreadyChunks"
            type="warning"
            :closable="false"
            show-icon
            title="存在未完成向量化的分块，暂不能审核通过"
          />

          <section class="records-panel">
            <div class="panel-title">
              <span>
                文档审核与切片操作记录
                <el-tooltip content="记录审核与切片编辑动作，展示系统可追溯能力。" placement="top">
                  <span class="km-info-dot">?</span>
                </el-tooltip>
              </span>
              <el-button size="small" :loading="recordLoading" @click="loadReviewRecords">刷新</el-button>
            </div>
            <el-skeleton v-if="recordLoading && !reviewRecords.length" :rows="3" animated />
            <el-alert
              v-else-if="recordError"
              type="warning"
              :closable="false"
              show-icon
              :title="recordError"
            />
            <el-empty
              v-else-if="!reviewRecords.length"
              description="暂无审核记录，当前文档尚未产生审核/编辑操作"
            />
            <el-timeline v-else>
              <el-timeline-item
                v-for="record in reviewRecords"
                :key="`${record.source || 'REVIEW'}-${record.id}`"
                :timestamp="record.createdAt"
                placement="top"
              >
                <div class="record-item">
                  <el-tag :type="reviewActionTagType(record.action)" size="small">
                    {{ reviewActionLabel(record.action) }}
                  </el-tag>
                  <el-tag v-if="record.chunkId" size="small" type="info" effect="plain">
                    chunkId: {{ record.chunkId }}
                  </el-tag>
                  <el-tag v-else size="small" type="info" effect="plain">切片操作记录</el-tag>
                  <span>{{ record.operatorName || record.operatorUserId || '未知操作人' }}</span>
                  <p v-if="record.comment">{{ record.comment }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
          </section>

          <section class="quality-overview-panel">
            <div class="panel-title">
              <span>质量概览</span>
              <el-tag size="small" type="success">v{{ detail.currentVersionNo || '-' }}</el-tag>
            </div>
            <div class="quality-grid">
              <div><span>切片总数</span><strong>{{ qualityStats.total }}</strong></div>
              <div><span>平均字符数</span><strong>{{ qualityStats.avgChars }}</strong></div>
              <div><span>最短/最长</span><strong>{{ qualityStats.minChars }} / {{ qualityStats.maxChars }}</strong></div>
              <div><span>READY 数量</span><strong>{{ qualityStats.ready }}</strong></div>
              <div><span>已编辑数量</span><strong>{{ qualityStats.edited }}</strong></div>
              <div><span>删除/失效数量</span><strong>{{ qualityStats.deleted }}</strong></div>
              <div><span>疑似乱码数量</span><strong>{{ qualityStats.suspect }}</strong></div>
            </div>
          </section>

          <div class="chunk-section-title">
            <div>
              <h3>切片质量清单</h3>
              <p>逐块检查页码、章节路径、字符数、向量状态、OCR 风险与内容摘要。</p>
            </div>
          </div>

          <el-table :data="detail.chunks" border class="chunk-table" row-key="chunkId">
            <el-table-column prop="chunkIndex" label="序号" width="72" />
            <el-table-column label="章节路径" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tooltip
                  v-if="isChapterMissing(row.chapterPath)"
                  content="该文档未解析到明确标题层级，可通过切片内容继续检索和审核。"
                  placement="top"
                >
                  <span>{{ chapterDisplay(row.chapterPath, row.content) }}</span>
                </el-tooltip>
                <span v-else>{{ chapterDisplay(row.chapterPath, row.content) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="pageNo" label="页码" width="72" />
            <el-table-column prop="chunkType" label="类型" width="90" />
            <el-table-column prop="charCount" label="字符数" width="88" />
            <el-table-column label="向量状态" width="110">
              <template #default="{ row }">
                <el-tag :type="row.vectorStatus === 'READY' ? 'success' : 'warning'" size="small">
                  {{ row.vectorStatus || 'UNKNOWN' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="已编辑" width="78">
              <template #default="{ row }">
                <el-tag v-if="row.isEdited" type="warning" size="small">是</el-tag>
                <span v-else>否</span>
              </template>
            </el-table-column>
            <el-table-column label="质量提示" width="130">
              <template #default="{ row }">
                <el-tag v-if="isOcrSuspect(row.content)" size="small" type="warning">疑似 OCR 异常</el-tag>
                <el-tag v-else size="small" type="success">正常</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="正文" min-width="280">
              <template #default="{ row }">
                <pre class="chunk-content">{{ row.content }}</pre>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="260">
              <template #default="{ row }">
                <div class="chunk-actions">
                  <el-tooltip content="修正 OCR 或切片文本" placement="top">
                    <el-button
                      type="primary"
                      size="small"
                      :disabled="detail.status !== 'PENDING_REVIEW'"
                      @click="openEdit(row)"
                    >
                      编辑正文
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="调整切片粒度" placement="top">
                    <el-button
                      size="small"
                      :loading="chunkOperatingId === row.chunkId"
                      :disabled="detail.status !== 'PENDING_REVIEW'"
                      @click="splitChunk(row)"
                    >
                      拆分
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="合并连续上下文" placement="top">
                    <el-button
                      size="small"
                      :loading="chunkOperatingId === row.chunkId"
                      :disabled="detail.status !== 'PENDING_REVIEW' || isLastChunk(row)"
                      @click="mergeWithNext(row)"
                    >
                      合并下一块
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="该切片不再参与检索" placement="top">
                    <el-button
                      type="danger"
                      size="small"
                      :loading="chunkOperatingId === row.chunkId"
                      :disabled="detail.status !== 'PENDING_REVIEW' || detail.chunks.length <= 1"
                      @click="deleteChunk(row)"
                    >
                      删除
                    </el-button>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </main>
    </section>

    <review-chunk-editor
      v-model="editVisible"
      :chunk="editChunk"
      :submitting="editSubmitting"
      @save="submitChunkEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import ReviewChunkEditor from '@/components/knowledge/ReviewChunkEditor.vue'
import { listKnowledgeBases, type KnowledgeBaseVO } from '@/api/modules/knowledge-base'
import {
  approveReviewDocument,
  deleteReviewChunk,
  fetchReviewRecords,
  fetchPendingReviewDocuments,
  fetchReviewDocumentDetail,
  mergeReviewChunkWithNext,
  rejectReviewDocument,
  splitReviewChunk,
  updateReviewChunk,
  type PendingReviewDocument,
  type ReviewChunk,
  type ReviewDocumentDetail,
  type ReviewRecord,
} from '@/api/modules/review'
import { friendlyErrorMessage } from '@/utils/error'

const router = useRouter()
const documents = ref<PendingReviewDocument[]>([])
const detail = ref<ReviewDocumentDetail | null>(null)
const selectedDocId = ref<number | null>(null)
const listLoading = ref(false)
const detailLoading = ref(false)
const reviewSubmitting = ref(false)
const editSubmitting = ref(false)
const editVisible = ref(false)
const editChunk = ref<ReviewChunk | null>(null)
const reviewRecords = ref<ReviewRecord[]>([])
const recordLoading = ref(false)
const recordError = ref('')
const chunkOperatingId = ref<number | null>(null)
const rejectReason = ref('')
const approveComment = ref('')
const kbIdFilter = ref<number | undefined>()
const kbLoading = ref(false)
const knowledgeBases = ref<KnowledgeBaseVO[]>([])
const page = ref(1)
const pageSize = 10
const total = ref(0)
const reviewOutcome = ref<null | {
  type: 'approved' | 'rejected'
  docId: number
  kbId: number
  kbName?: string
  docName: string
  status: string
  chunkCount: number
  readyChunks: number
  reason?: string
}>(null)
const seenReviewDocIds = ref<Set<number>>(new Set())

const reviewFlowSteps = [
  { title: '待审核', desc: '读取 READY 前的人工确认任务', tooltip: '待审核文档会在此排队等待人工质量确认。' },
  { title: '切片编辑', desc: '支持编辑、拆分、合并、删除', tooltip: '修改切片会触发后续向量化或审计记录。' },
  { title: '版本确认', desc: '记录当前文档版本与处理时间', tooltip: '用于确认本次审核对应的文档版本。' },
  { title: '审核流转', desc: '通过后进入 READY，拒绝会留痕', tooltip: '通过后可检索，拒绝后保留原因与记录。' },
]

const hasUnreadyChunks = computed(() =>
  Boolean(detail.value?.chunks.some((chunk) => (chunk.vectorStatus || '').toUpperCase() !== 'READY')),
)

const reviewOverviewCards = computed(() => [
  {
    label: '待审核文档',
    value: total.value,
    desc: '当前筛选范围内等待人工确认',
  },
  {
    label: '当前文档切片',
    value: detail.value?.chunkCount || detail.value?.chunks.length || 0,
    desc: detail.value?.originalName || '选择左侧任务后进入审核',
  },
  {
    label: 'READY 切片',
    value: qualityStats.value.ready,
    desc: '向量状态已就绪的切片数量',
  },
  {
    label: '已编辑切片',
    value: qualityStats.value.edited,
    desc: '人工修改过正文或结构的切片',
  },
  {
    label: '疑似异常切片',
    value: qualityStats.value.suspect,
    desc: '前端轻量识别的 OCR/乱码风险提示',
  },
  {
    label: '当前版本',
    value: detail.value?.currentVersionNo ? `v${detail.value.currentVersionNo}` : '-',
    desc: '用于确认本次审核对应的文档版本',
  },
])

const qualityStats = computed(() => {
  const chunks = detail.value?.chunks || []
  const charCounts = chunks.map((chunk) => Number(chunk.charCount || (chunk.content || '').length || 0))
  const totalChars = charCounts.reduce((sum, count) => sum + count, 0)
  return {
    total: chunks.length,
    avgChars: chunks.length ? Math.round(totalChars / chunks.length) : 0,
    minChars: chunks.length ? Math.min(...charCounts) : 0,
    maxChars: chunks.length ? Math.max(...charCounts) : 0,
    ready: chunks.filter((chunk) => (chunk.vectorStatus || '').toUpperCase() === 'READY').length,
    edited: chunks.filter((chunk) => Boolean(chunk.isEdited)).length,
    deleted: chunks.filter((chunk) => ['DELETED', 'INVALID'].includes((chunk.vectorStatus || '').toUpperCase())).length,
    suspect: chunks.filter((chunk) => isOcrSuspect(chunk.content)).length,
  }
})

onMounted(() => {
  loadSeenReviewDocIds()
  loadKnowledgeBases()
  reloadList()
})

async function loadKnowledgeBases() {
  kbLoading.value = true
  try {
    const resp = await listKnowledgeBases({ isDeleted: 0, pageNum: 1, pageSize: 200 })
    knowledgeBases.value = resp.code === 0 ? resp.data.records || [] : []
  } catch {
    knowledgeBases.value = []
  } finally {
    kbLoading.value = false
  }
}

async function reloadList() {
  listLoading.value = true
  try {
    const data = await fetchPendingReviewDocuments({
      kbId: parsedKbId(),
      page: page.value,
      pageSize,
    })
    documents.value = data.records || []
    total.value = data.total || 0
    if (!selectedDocId.value && documents.value.length && !reviewOutcome.value) {
      await selectDocument(documents.value[0].docId)
    }
  } catch (error) {
    ElMessage.error(errorMessage(error, '加载待审核列表失败'))
  } finally {
    listLoading.value = false
  }
}

async function changePage(nextPage: number) {
  page.value = nextPage
  await reloadList()
}

async function selectDocument(docId: number) {
  selectedDocId.value = docId
  markReviewDocSeen(docId)
  reviewOutcome.value = null
  rejectReason.value = ''
  approveComment.value = ''
  reviewRecords.value = []
  recordError.value = ''
  await refreshDetail()
}

async function refreshDetail() {
  if (!selectedDocId.value) return
  detailLoading.value = true
  try {
    detail.value = await fetchReviewDocumentDetail(selectedDocId.value)
    await loadReviewRecords()
  } catch (error) {
    ElMessage.error(errorMessage(error, '加载文档详情失败'))
  } finally {
    detailLoading.value = false
  }
}

async function loadReviewRecords() {
  if (!selectedDocId.value) return
  recordLoading.value = true
  recordError.value = ''
  try {
    reviewRecords.value = await fetchReviewRecords(selectedDocId.value)
  } catch (error) {
    reviewRecords.value = []
    recordError.value = '审核记录加载失败，请刷新或检查文档状态'
    ElMessage.warning(errorMessage(error, recordError.value))
  } finally {
    recordLoading.value = false
  }
}

async function approve() {
  if (!detail.value) {
    ElMessage.warning('请先选择待审核文档')
    return
  }
  if (hasUnreadyChunks.value) {
    ElMessage.warning('存在未就绪切片，暂不可审核通过')
    return
  }
  try {
    await ElMessageBox.confirm('确认将该文档审核通过并进入 READY 状态？', '审核通过', { type: 'warning' })
  } catch {
    return
  }
  reviewSubmitting.value = true
  try {
    const current = detail.value
    await approveReviewDocument(current.docId, approveComment.value.trim() || undefined)
    ElMessage.success('审核通过成功')
    await afterReviewChanged({
      type: 'approved',
      docId: current.docId,
      kbId: current.kbId,
      kbName: current.kbName,
      docName: current.originalName,
      status: 'READY / 已就绪',
      chunkCount: qualityStats.value.total,
      readyChunks: qualityStats.value.ready,
    })
  } catch (error) {
    ElMessage.error(errorMessage(error, '审核通过失败'))
  } finally {
    reviewSubmitting.value = false
  }
}

async function reject() {
  if (!detail.value) {
    ElMessage.warning('请先选择待审核文档')
    return
  }
  const reason = rejectReason.value.trim()
  if (!reason) {
    ElMessage.warning('请填写拒绝原因')
    return
  }
  try {
    await ElMessageBox.confirm('确认拒绝该文档？系统将记录原因并触发后续处理。', '审核拒绝', { type: 'warning' })
  } catch {
    return
  }
  reviewSubmitting.value = true
  try {
    const current = detail.value
    await rejectReviewDocument(current.docId, reason)
    ElMessage.success('审核拒绝成功')
    await afterReviewChanged({
      type: 'rejected',
      docId: current.docId,
      kbId: current.kbId,
      kbName: current.kbName,
      docName: current.originalName,
      status: 'REVIEW_REJECTED / 审核未通过',
      chunkCount: qualityStats.value.total,
      readyChunks: qualityStats.value.ready,
      reason,
    })
  } catch (error) {
    ElMessage.error(errorMessage(error, '审核拒绝失败'))
  } finally {
    reviewSubmitting.value = false
  }
}

function openEdit(row: ReviewChunk) {
  editChunk.value = row
  editVisible.value = true
}

async function submitChunkEdit(content: string) {
  if (!editChunk.value) return
  const nextContent = content.trim()
  if (!nextContent) {
    ElMessage.warning('分块正文不能为空')
    return
  }
  if (nextContent === editChunk.value.content.trim()) {
    ElMessage.info('当前内容未发生变化，无需保存')
    return
  }
  editSubmitting.value = true
  try {
    await updateReviewChunk(editChunk.value.chunkId, nextContent)
    ElMessage.success('分块已保存，已创建重向量化任务')
    editVisible.value = false
    await refreshDetail()
  } catch (error) {
    ElMessage.error(errorMessage(error, '保存分块失败'))
  } finally {
    editSubmitting.value = false
  }
}

async function splitChunk(row: ReviewChunk) {
  const defaultSplit = Math.max(1, Math.floor((row.content || '').length / 2))
  let splitAt: number
  try {
    const result = await ElMessageBox.prompt('请输入拆分位置（按字符序号，从 1 开始）', '拆分切片', {
      inputValue: String(defaultSplit),
      inputPattern: /^[1-9]\d*$/,
      inputErrorMessage: '请输入正整数',
    })
    splitAt = Number(result.value)
  } catch {
    return
  }
  if (!Number.isFinite(splitAt) || splitAt <= 0 || splitAt >= row.content.length) {
    ElMessage.warning('拆分位置必须位于正文中间，不能在开头或结尾')
    return
  }
  await runChunkOperation(row.chunkId, '切片已拆分，相关切片将重新向量化', () =>
    splitReviewChunk(row.chunkId, splitAt),
  )
}

async function mergeWithNext(row: ReviewChunk) {
  try {
    await ElMessageBox.confirm('确认将该切片与下一切片合并？合并后的切片将重新向量化。', '合并切片', {
      type: 'warning',
    })
  } catch {
    return
  }
  await runChunkOperation(row.chunkId, '切片已合并，合并后的切片将重新向量化', () =>
    mergeReviewChunkWithNext(row.chunkId),
  )
}

async function deleteChunk(row: ReviewChunk) {
  try {
    await ElMessageBox.confirm('删除后该切片将不再参与检索，是否继续？', '删除切片', {
      type: 'warning',
    })
  } catch {
    return
  }
  await runChunkOperation(row.chunkId, '切片已删除', () => deleteReviewChunk(row.chunkId))
}

async function runChunkOperation(chunkId: number, successMessage: string, action: () => Promise<number>) {
  chunkOperatingId.value = chunkId
  try {
    await action()
    ElMessage.success(successMessage)
    await refreshDetail()
  } catch (error) {
    ElMessage.error(errorMessage(error, '切片操作失败'))
  } finally {
    chunkOperatingId.value = null
  }
}

async function afterReviewChanged(outcome: NonNullable<typeof reviewOutcome.value>) {
  reviewOutcome.value = outcome
  selectedDocId.value = outcome.docId
  detail.value = null
  reviewRecords.value = []
  recordError.value = ''
  await loadReviewRecords()
  await reloadList()
}

async function loadReviewRecordsFromOutcome() {
  if (!reviewOutcome.value) return
  selectedDocId.value = reviewOutcome.value.docId
  await loadReviewRecords()
}

function goSearch() {
  const kbId = reviewOutcome.value?.kbId
  router.push(kbId ? { path: '/search', query: { kbId: String(kbId) } } : '/search')
}

function isLastChunk(row: ReviewChunk) {
  const chunks = detail.value?.chunks || []
  return chunks.length > 0 && chunks[chunks.length - 1].chunkId === row.chunkId
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING_REVIEW: '待审核',
    READY: '就绪',
    REVIEW_REJECTED: '审核未通过',
    VECTORIZING: '向量化中',
    FAILED: '失败',
  }
  return map[status] || status
}

function reviewActionLabel(action: string) {
  const map: Record<string, string> = {
    APPROVE: '审核通过',
    REJECT: '审核拒绝',
    EDIT: '编辑切片',
    SPLIT: '拆分切片',
    MERGE: '合并切片',
    DELETE: '删除切片',
  }
  return map[action] || action
}

function reviewActionTagType(action: string) {
  const map: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'primary'> = {
    APPROVE: 'success',
    REJECT: 'danger',
    EDIT: 'warning',
    SPLIT: 'primary',
    MERGE: 'primary',
    DELETE: 'danger',
  }
  return map[action] || 'info'
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

function loadSeenReviewDocIds() {
  if (typeof window === 'undefined') return
  const raw = window.sessionStorage.getItem('km_seen_review_docs') || '[]'
  try {
    seenReviewDocIds.value = new Set(JSON.parse(raw).map(Number).filter(Boolean))
  } catch {
    seenReviewDocIds.value = new Set()
  }
}

function persistSeenReviewDocIds() {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem('km_seen_review_docs', JSON.stringify([...seenReviewDocIds.value]))
}

function markReviewDocSeen(docId: number) {
  if (seenReviewDocIds.value.has(docId)) return
  seenReviewDocIds.value = new Set([...seenReviewDocIds.value, docId])
  persistSeenReviewDocIds()
}

function isNewReviewDoc(doc: PendingReviewDocument) {
  return doc.status === 'PENDING_REVIEW' && !seenReviewDocIds.value.has(doc.docId)
}

function parsedKbId() {
  return kbIdFilter.value
}

function errorMessage(error: unknown, fallback: string) {
  return friendlyErrorMessage(error, fallback)
}
</script>

<style scoped>
.review-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
  min-height: calc(100vh - 96px);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.review-hero {
  padding: 28px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.16), rgba(255, 255, 255, 0.04) 46%, rgba(255, 143, 112, 0.06)),
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

.toolbar h2,
.detail-header h3 {
  margin: 0;
}

.toolbar h2 {
  color: var(--km-ink);
  font-size: clamp(30px, 4vw, 40px);
  line-height: 1.1;
}

.toolbar p,
.detail-subtitle {
  margin: 6px 0 0;
  color: var(--km-muted);
}

.review-hero-chips {
  margin-top: 18px;
}

.toolbar-actions,
.detail-actions,
.action-bar,
.reject-box,
.tag-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kb-filter {
  width: 220px;
}

.review-flow {
  padding: 18px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background: rgba(255, 255, 255, 0.035);
}

.review-flow .km-flow {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.workbench {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 18px;
  min-height: 0;
}

.document-list,
.detail-panel {
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  padding: 16px;
  background: rgba(255, 255, 255, 0.035);
  box-shadow: var(--km-shadow-soft);
  backdrop-filter: blur(16px);
  min-height: 560px;
}

.review-empty-state,
.review-outcome {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 420px;
  padding: 28px;
  border: 1px solid rgba(114, 239, 182, 0.22);
  border-radius: var(--km-radius-xl);
  color: var(--km-text);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.12), rgba(113, 215, 255, 0.055)),
    rgba(255, 255, 255, 0.035);
  text-align: center;
}

.review-empty-state strong,
.review-outcome h3 {
  color: var(--km-ink);
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.15;
}

.review-empty-state p,
.outcome-doc {
  margin: 10px auto 0;
  max-width: 620px;
  color: var(--km-muted);
  font-size: 15px;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
}

.review-outcome {
  position: relative;
  justify-content: flex-start;
  text-align: left;
  overflow: hidden;
}

.review-outcome::after {
  position: absolute;
  right: -34px;
  top: 32px;
  width: 150px;
  height: 150px;
  border: 1px solid rgba(114, 239, 182, 0.18);
  border-radius: 34px;
  pointer-events: none;
  content: "";
  transform: rotate(20deg);
}

.review-outcome.approved {
  border-color: rgba(114, 239, 182, 0.34);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.2), rgba(113, 215, 255, 0.075)),
    rgba(255, 255, 255, 0.04);
}

.review-outcome.rejected {
  border-color: rgba(255, 109, 98, 0.32);
  background:
    linear-gradient(135deg, rgba(255, 109, 98, 0.13), rgba(244, 184, 96, 0.06)),
    rgba(255, 255, 255, 0.035);
}

.outcome-kicker {
  margin: 0 0 10px;
  color: var(--km-green-strong);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
  font-weight: 760;
}

.review-outcome.rejected .outcome-kicker {
  color: #ffaaa3;
}

.review-outcome h3 {
  margin: 0;
}

.outcome-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.outcome-grid div {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background: rgba(0, 0, 0, 0.16);
}

.outcome-grid span {
  display: block;
  color: var(--km-muted);
  font-size: 12px;
  font-weight: 650;
}

.outcome-grid strong {
  display: block;
  margin-top: 8px;
  color: var(--km-ink);
  font-size: 16px;
  line-height: 1.45;
  word-break: break-word;
}

.outcome-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.outcome-records {
  margin-top: 22px;
  padding: 16px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background: rgba(0, 0, 0, 0.14);
}

.document-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-title,
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.doc-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
  padding: 14px;
  text-align: left;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-md);
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.review-new-dot {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--km-danger);
  box-shadow: 0 0 0 6px rgba(255, 109, 98, 0.1);
  animation: review-dot-breathe 1.5s ease-in-out infinite;
}

@keyframes review-dot-breathe {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.35);
  }
}

.doc-item:hover {
  border-color: rgba(114, 239, 182, 0.28);
  background: rgba(79, 214, 154, 0.065);
  transform: translateY(-1px);
}

.doc-item.active {
  border-color: rgba(114, 239, 182, 0.42);
  background: rgba(79, 214, 154, 0.1);
}

.doc-name {
  font-weight: 600;
  color: var(--km-ink);
}

.doc-meta,
.doc-foot {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.doc-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.detail-header {
  padding: 16px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background: rgba(255, 255, 255, 0.035);
}

.detail-header:hover {
  border-color: rgba(114, 239, 182, 0.26);
}

.detail-header h3 {
  color: var(--km-ink);
  font-size: 22px;
}

.detail-subtitle {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.detail-flow-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-md);
  background: rgba(255, 255, 255, 0.03);
}

.action-bar .el-input,
.reject-box .el-textarea {
  flex: 1;
}

.action-bar,
.reject-box {
  padding: 12px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-md);
  background: rgba(255, 255, 255, 0.03);
}

.action-bar {
  border-color: rgba(84, 227, 157, 0.22);
  background:
    linear-gradient(135deg, rgba(84, 227, 157, 0.09), rgba(255, 255, 255, 0.025)),
    rgba(255, 255, 255, 0.03);
}

.reject-box {
  border-color: rgba(255, 109, 98, 0.18);
}

.chunk-table {
  width: 100%;
  order: 12;
}

.chunk-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chunk-actions :deep(.el-button) {
  margin-left: 0;
}

.chunk-content {
  max-height: 160px;
  margin: 0;
  padding: 10px;
  border: 1px solid var(--km-border-light);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  color: var(--km-text);
  font-size: 13px;
  line-height: 1.62;
}

.records-panel {
  order: 20;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
}

.quality-overview-panel,
.chunk-section-title {
  order: 10;
}

.quality-overview-panel {
  padding: 16px;
  border: 1px solid rgba(114, 239, 182, 0.22);
  border-radius: var(--km-radius-lg);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.1), rgba(113, 215, 255, 0.04)),
    rgba(255, 255, 255, 0.03);
}

.quality-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.quality-grid div {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-md);
  background: rgba(0, 0, 0, 0.14);
  transition:
    transform 160ms var(--km-ease-out),
    border-color 160ms var(--km-ease-out),
    background-color 160ms var(--km-ease-out);
}

.quality-grid div:hover {
  border-color: rgba(114, 239, 182, 0.32);
  background: rgba(79, 214, 154, 0.08);
  transform: translateY(-2px);
}

.quality-grid span {
  display: block;
  color: var(--km-muted);
  font-size: 12px;
}

.quality-grid strong {
  display: block;
  margin-top: 6px;
  overflow: hidden;
  color: var(--km-ink);
  font-size: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-section-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background: rgba(255, 255, 255, 0.03);
}

.chunk-section-title h3 {
  margin: 0;
  color: var(--km-ink);
  font-size: 18px;
}

.chunk-section-title p {
  margin: 4px 0 0;
  color: var(--km-muted);
  font-size: 13px;
}

.records-panel :deep(.el-timeline-item__node) {
  background: var(--km-green-strong);
  box-shadow: 0 0 0 6px rgba(79, 214, 154, 0.1);
}

.records-panel :deep(.el-timeline-item__tail) {
  border-left-color: rgba(114, 239, 182, 0.24);
}

.record-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 12px;
  transition:
    background-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.record-item:hover {
  background: rgba(79, 214, 154, 0.08);
  box-shadow: inset 0 0 0 1px rgba(114, 239, 182, 0.14);
  transform: translateX(2px);
}

.record-item p {
  flex-basis: 100%;
  margin: 4px 0 0;
  color: var(--km-muted);
  white-space: pre-wrap;
}

.chunk-table {
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  overflow: hidden;
}

.chunk-table :deep(.el-table__row) {
  transition:
    background-color 160ms ease,
    transform 160ms ease;
}

.chunk-table :deep(.el-button + .el-button) {
  margin-left: 0;
}

.panel-title {
  color: var(--km-ink);
  font-weight: 680;
}

@media (max-width: 980px) {
  .toolbar,
  .workbench {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .document-list,
  .detail-panel {
    min-height: auto;
  }

  .review-flow .km-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quality-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .review-flow .km-flow {
    grid-template-columns: 1fr;
  }

  .quality-grid {
    grid-template-columns: 1fr;
  }
}
</style>
