<template>
  <section class="report-workspace">
    <PowerBackground />

    <div class="app-shell">
      <SidebarNav :active-key="activeView" @select="setActiveView" @go-chat="goChat" />

      <div class="app-main">
        <HeaderBar
          :title="viewTitle"
          subtitle=""
          :online="backend.online"
          :backend-label="backend.text"
          :user-label="username"
          :loading="backend.loading"
          @refresh-backend="checkBackend"
          @logout="goHome"
        />

        <main class="app-content">
          <section v-if="assetLoading" class="report-loading-panel" aria-live="polite">
            <div class="report-loading-panel__scan"></div>
            <div>
              <span class="report-side-kicker">SYNCING REPORT ASSETS</span>
              <h2>正在加载报告工作台</h2>
              <p>正在同步概览、报告记录和模板数据，页面会保持在当前工作台。</p>
            </div>
            <div class="report-loading-skeleton">
              <i></i>
              <i></i>
              <i></i>
            </div>
          </section>

          <section class="report-hero">
            <div class="report-hero__copy">
              <span class="report-hero__eyebrow">REPORT AUTOMATION STUDIO</span>
              <h1>报告生成工作台</h1>
              <p>将知识检索、智能问答与业务数据转化为可展示、可沉淀、可复用的报告成果。</p>
              <div class="report-hero__chips">
                <span>报告草稿</span>
                <span>章节编排</span>
                <span>知识引用</span>
                <span>智能生成</span>
                <span>预览导出</span>
              </div>
            </div>
            <div class="report-hero__actions">
              <button type="button" class="report-action report-action--primary" :disabled="navPending !== ''" @click="setActiveView('create')">新建报告</button>
              <button type="button" class="report-action" :class="{ loading: navPending === '/' }" :disabled="navPending !== ''" @click="goChat">从问答生成</button>
              <button type="button" class="report-action" :class="{ loading: navPending === '/knowledge/bases' }" :disabled="navPending !== ''" @click="goKnowledge">返回知识管理</button>
              <button type="button" class="report-action" :class="{ loading: navPending === '/team-showcase' }" :disabled="navPending !== ''" @click="goTeam">团队展示页</button>
            </div>
          </section>

          <section class="report-metric-grid" aria-label="报告工作台指标">
            <article v-for="metric in reportMetrics" :key="metric.label" class="report-metric-card">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <small>{{ metric.hint }}</small>
            </article>
          </section>

          <section v-if="assetError" class="report-data-alert" role="alert">
            <div>
              <strong>报告数据同步异常</strong>
              <p>{{ assetError }}</p>
            </div>
            <button type="button" @click="loadReportAssets">重试同步</button>
          </section>

          <section class="report-flow" aria-label="报告生成流程">
            <button
              v-for="step in flowSteps"
              :key="step.key"
              type="button"
              class="report-flow__step"
              :class="{ active: step.view === activeView, done: completedFlowKeys.includes(step.key) }"
              :disabled="assetLoading"
              @click="setActiveView(step.view)"
            >
              <span class="report-flow__dot"></span>
              <strong>{{ step.label }}</strong>
              <small>{{ step.caption }}</small>
            </button>
          </section>

          <div class="report-studio-grid">
            <aside class="report-studio-side report-studio-side--left">
              <div class="report-side-section">
                <span class="report-side-kicker">ASSETS</span>
                <h2>报告资产</h2>
                <label class="report-search-box">
                  <span>搜索报告</span>
                  <input v-model="reportKeyword" type="search" placeholder="输入报告名称或类型" />
                </label>
                <button type="button" :disabled="assetLoading" :class="{ active: activeView === 'records' }" @click="setActiveView('records')">报告列表</button>
                <button type="button" :disabled="assetLoading" :class="{ active: activeView === 'templates' }" @click="setActiveView('templates')">模板列表</button>
                <button type="button" :disabled="assetLoading" :class="{ active: activeView === 'create' }" @click="setActiveView('create')">最近编辑</button>
                <div class="report-asset-list" aria-label="最近编辑报告">
                  <button
                    v-for="record in filteredRecentRecords"
                    :key="String(record.id || record.reportName)"
                    type="button"
                    class="report-asset-card"
                    :disabled="assetLoading"
                    @click="handleSelectReport(record.id || currentReportId)"
                  >
                    <strong>{{ record.reportName || '未命名报告' }}</strong>
                    <span>{{ reportTypeLabel(record.reportType) }} · {{ statusLabel(record.status) }}</span>
                  </button>
                  <p v-if="!filteredRecentRecords.length" class="report-side-empty">暂无报告资产，可先新建报告草稿。</p>
                </div>
              </div>
              <div class="report-side-section">
                <span class="report-side-kicker">FILTERS</span>
                <h2>状态筛选</h2>
                <div class="report-status-pill">草稿</div>
                <div class="report-status-pill">生成中</div>
                <div class="report-status-pill">已完成</div>
              </div>
            </aside>

            <section class="report-studio-main">
              <transition name="fade" mode="out-in">
                <DashboardView v-if="activeView === 'dashboard'" key="dashboard" />
                <ReportCreateView v-else-if="activeView === 'create'" key="create" @created="handleReportCreated" />
                <OutlineManager
                  v-else-if="activeView === 'outline'"
                  key="outline"
                  v-model:report-id="currentReportId"
                  @go-generation="setActiveView('generation')"
                />
                <GenerationView
                  v-else-if="activeView === 'generation'"
                  key="generation"
                  v-model:report-id="currentReportId"
                  @go-editor="setActiveView('editor')"
                />
                <ChapterEditorView
                  v-else-if="activeView === 'editor'"
                  key="editor"
                  v-model:report-id="currentReportId"
                />
                <RecordsView v-else-if="activeView === 'records'" key="records" @select-report="handleSelectReport" />
                <TemplatesView v-else-if="activeView === 'templates'" key="templates" />
              </transition>
            </section>

            <aside class="report-studio-side report-studio-side--right">
              <div class="report-preview-card">
                <span class="report-side-kicker">PREVIEW</span>
                <h2>{{ viewTitle }}</h2>
                <p>当前报告 ID：{{ currentReportId || '未选择' }}</p>
                <div class="report-paper">
                  <strong>{{ activeRecord?.reportName || '报告预览' }}</strong>
                  <span>{{ activeRecordSummary }}</span>
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
              </div>
              <div class="report-side-section">
                <span class="report-side-kicker">SOURCES</span>
                <h2>知识联动</h2>
                <p>暂无引用来源，可从知识检索或智能问答中添加。</p>
                <div class="report-source-list">
                  <span>引用知识库：{{ sourceSummary.knowledgeBase }}</span>
                  <span>引用文档：{{ sourceSummary.documents }}</span>
                  <span>引用切片：{{ sourceSummary.chunks }}</span>
                  <span>来源问答：{{ sourceSummary.qa }}</span>
                </div>
                <button type="button" :class="{ loading: navPending === '/knowledge/search' }" :disabled="navPending !== ''" @click="goSearch">前往知识检索</button>
                <button type="button" :class="{ loading: navPending === '/' }" :disabled="navPending !== ''" @click="goChat">前往智能问答</button>
                <button type="button" :class="{ loading: navPending === '/knowledge/bases' }" :disabled="navPending !== ''" @click="goKnowledge">返回知识管理</button>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { reportApi } from '@/api/modules/report'
import '@/styles/report.css'
import DashboardView from '@/components/report/DashboardView.vue'
import ReportCreateView from '@/components/report/ReportCreateView.vue'
import OutlineManager from '@/components/report/OutlineManager.vue'
import GenerationView from '@/components/report/GenerationView.vue'
import ChapterEditorView from '@/components/report/ChapterEditorView.vue'
import RecordsView from '@/components/report/RecordsView.vue'
import TemplatesView from '@/components/report/TemplatesView.vue'
import PowerBackground from '@/components/report/common/PowerBackground.vue'
import SidebarNav from '@/components/report/layout/SidebarNav.vue'
import HeaderBar from '@/components/report/layout/HeaderBar.vue'

type ViewKey = 'dashboard' | 'create' | 'outline' | 'generation' | 'editor' | 'records' | 'templates'
type BackendUser = { userId?: string | number }
type ReportRecord = {
  id?: number | string
  reportName?: string
  reportType?: string
  reportYear?: number | string
  status?: number | string
  exportStatus?: number | string | null
  createTime?: string
  updateTime?: string
  updatedAt?: string
  knowledgeCount?: number
  referenceCount?: number
  citationCount?: number
  chunkCount?: number
  documentCount?: number
  sourceQuestion?: string
  [key: string]: unknown
}
type ReportTemplate = { id?: number | string; templateName?: string; name?: string; [key: string]: unknown }

const activeView = ref<ViewKey>('dashboard')
const currentReportId = ref(Number(window.localStorage.getItem('current_report_id') || 1))
const backend = reactive({ online: false, loading: false, text: '后端未检查' })
const records = ref<ReportRecord[]>([])
const templates = ref<ReportTemplate[]>([])
const dashboardOverview = ref<Record<string, unknown> | null>(null)
const reportKeyword = ref('')
const assetLoading = ref(false)
const assetError = ref('')
const navPending = ref('')

const titles: Record<ViewKey, string> = {
  dashboard: '工作台',
  create: '报告创建',
  outline: '大纲管理',
  generation: '正文生成',
  editor: '报告编辑',
  records: '报告记录',
  templates: '模板管理',
}

const flowSteps: Array<{ key: string; view: ViewKey; label: string; caption: string }> = [
  { key: 'template', view: 'templates', label: '选择模板', caption: '模板库' },
  { key: 'topic', view: 'create', label: '输入主题', caption: '创建草稿' },
  { key: 'source', view: 'dashboard', label: '选择知识来源', caption: '检索与问答联动' },
  { key: 'outline', view: 'outline', label: '生成大纲', caption: '章节编排' },
  { key: 'generation', view: 'generation', label: '生成正文', caption: 'AI 生成' },
  { key: 'editor', view: 'editor', label: '人工编辑', caption: '预览保存' },
  { key: 'preview', view: 'records', label: '预览导出', caption: '成果沉淀' },
]

const completedFlowKeys = computed<string[]>(() => {
  const order = flowSteps.findIndex((step) => step.view === activeView.value)
  return flowSteps.slice(0, Math.max(order, 0)).map((step) => step.key)
})

const viewTitle = computed(() => titles[activeView.value] || '报告生成模块')
const username = computed(() => window.localStorage.getItem('username') || '统一登录用户')
const filteredRecentRecords = computed(() => {
  const keyword = reportKeyword.value.trim().toLowerCase()
  return records.value
    .filter((record) => {
      if (!keyword) return true
      return [record.reportName, record.reportType, record.reportYear]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    })
    .slice(0, 5)
})
const activeRecord = computed(() => {
  return records.value.find((record) => Number(record.id) === Number(currentReportId.value)) || records.value[0] || null
})
const activeRecordSummary = computed(() => {
  if (!activeRecord.value) return '摘要、章节、引用和图表将在编辑后汇总到此处。'
  const type = reportTypeLabel(activeRecord.value.reportType)
  const status = statusLabel(activeRecord.value.status)
  return `${type} · ${status} · ${formatDate(activeRecord.value.updateTime || activeRecord.value.updatedAt || activeRecord.value.createTime)}`
})
const sourceSummary = computed(() => {
  const record = activeRecord.value
  const knowledgeCount = Number(record?.knowledgeCount || record?.referenceCount || record?.citationCount || 0)
  const chunkCount = Number(record?.chunkCount || record?.referenceCount || record?.citationCount || 0)
  const documentCount = Number(record?.documentCount || 0)
  return {
    knowledgeBase: knowledgeCount ? `${knowledgeCount} 条知识引用` : '暂无引用来源',
    documents: documentCount ? `${documentCount} 份文档` : '暂无引用文档',
    chunks: chunkCount ? `${chunkCount} 个切片` : '暂无引用切片',
    qa: record?.sourceQuestion ? String(record.sourceQuestion) : '可从智能问答中添加',
  }
})
const reportMetrics = computed(() => {
  const overview = dashboardOverview.value || {}
  const totalCount = firstNumber(overview, ['reportTotal', 'reportCount', 'reportRecordCount', 'recordCount', 'total'], records.value.length)
  const draftCount = firstNumber(
    overview,
    ['draftCount', 'draftReportCount', 'pendingRecordCount'],
    records.value.filter((record) => isDraft(record.status)).length,
  )
  const generatedCount = firstNumber(
    overview,
    ['generatedCount', 'successRecordCount', 'successCount', 'completedCount'],
    records.value.filter((record) => isGenerated(record.status)).length,
  )
  const templateCount = firstNumber(overview, ['templateCount', 'templates', 'templateTotal'], templates.value.length)
  const citationCount = records.value.reduce((sum, record) => {
    return sum + firstNumber(record, ['referenceCount', 'citationCount', 'chunkCount', 'knowledgeCount'], 0)
  }, 0)
  const latest = records.value
    .map((record) => record.updateTime || record.updatedAt || record.createTime)
    .filter(Boolean)
    .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0]
  return [
    { label: '报告总数', value: formatNumber(totalCount), hint: `当前可管理报告，模板 ${formatNumber(templateCount)} 个` },
    { label: '草稿数量', value: formatNumber(draftCount), hint: '待生成或待完善的报告' },
    { label: '已生成数量', value: formatNumber(generatedCount), hint: '已完成正文生成的成果' },
    { label: '模板数量', value: formatNumber(templateCount), hint: '可复用的报告模板资产' },
    { label: '最近更新', value: latest ? formatDate(latest) : '暂无', hint: '来自报告记录时间字段' },
    { label: '生成任务状态', value: assetLoading.value ? '同步中' : backend.online ? '在线' : assetError.value ? '异常' : '待确认', hint: assetError.value || backend.text || `引用 ${formatNumber(citationCount)} 条` },
  ]
})

onMounted(() => {
  checkBackend()
  loadReportAssets()
})

function setActiveView(viewKey: ViewKey) {
  if (activeView.value === viewKey) return
  if (viewKey !== 'records') {
    window.dispatchEvent(new CustomEvent('report:hide-record-overlays'))
  }
  activeView.value = viewKey
}

function goHome() {
  navigateTo('/')
}

function goChat() {
  navigateTo('/')
}

function goKnowledge() {
  navigateTo('/knowledge/bases')
}

function goSearch() {
  navigateTo('/knowledge/search')
}

function goTeam() {
  navigateTo('/team-showcase')
}

function navigateTo(target: string) {
  if (!target || navPending.value) return
  const normalizedCurrent = normalizePath(window.location.pathname)
  const normalizedTarget = normalizePath(target)
  if (normalizedCurrent === normalizedTarget) return
  navPending.value = target
  window.location.assign(target)
}

function handleReportCreated(reportId: number | string) {
  currentReportId.value = Number(reportId)
  window.localStorage.setItem('current_report_id', String(reportId))
  activeView.value = 'outline'
}

function handleSelectReport(reportId: number | string) {
  currentReportId.value = Number(reportId)
  window.localStorage.setItem('current_report_id', String(reportId))
  activeView.value = 'editor'
}

async function checkBackend() {
  backend.loading = true
  try {
    await reportApi.health()
    const backendUser = await reportApi.currentUser().catch(() => null) as BackendUser | null
    backend.online = true
    backend.text = backendUser?.userId ? `后端已连接：${backendUser.userId}` : '后端已连接'
  } catch (error) {
    backend.online = false
    backend.text = '后端未连接'
    const message = error instanceof Error ? error.message : String(error)
    ElMessage.warning(`报告服务检测失败：${message}`)
  } finally {
    backend.loading = false
  }
}

async function loadReportAssets() {
  assetLoading.value = true
  assetError.value = ''
  try {
    const [overviewResult, recordResult, templateResult] = await Promise.allSettled([
      reportApi.dashboardOverview(),
      reportApi.listRecords(),
      reportApi.listTemplates(),
    ])
    const failures: string[] = []
    if (overviewResult.status === 'fulfilled') {
      dashboardOverview.value = toObject(overviewResult.value)
    } else {
      failures.push(`概览接口：${errorMessage(overviewResult.reason)}`)
      console.error('报告概览接口加载失败:', overviewResult.reason)
    }
    if (recordResult.status === 'fulfilled') {
      records.value = toArray<ReportRecord>(recordResult.value).map(normalizeReportRecord)
      if (!window.localStorage.getItem('current_report_id') && records.value[0]?.id) {
        currentReportId.value = Number(records.value[0].id)
      }
    } else {
      records.value = []
      failures.push(`报告列表接口：${errorMessage(recordResult.reason)}`)
      console.error('报告列表接口加载失败:', recordResult.reason)
    }
    if (templateResult.status === 'fulfilled') {
      templates.value = toArray<ReportTemplate>(templateResult.value)
    } else {
      templates.value = []
      failures.push(`模板接口：${errorMessage(templateResult.reason)}`)
      console.error('报告模板接口加载失败:', templateResult.reason)
    }
    if (failures.length) {
      assetError.value = failures.join('；')
      ElMessage.warning(`报告数据同步不完整：${assetError.value}`)
    }
  } catch (error) {
    assetError.value = errorMessage(error)
    console.error('报告资产同步失败:', error)
    ElMessage.warning(`报告资产同步失败：${assetError.value}`)
  } finally {
    assetLoading.value = false
  }
}

function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const objectValue = value as { data?: unknown; records?: unknown; list?: unknown; rows?: unknown; items?: unknown; content?: unknown }
    if (Array.isArray(objectValue.data)) return objectValue.data as T[]
    if (Array.isArray(objectValue.records)) return objectValue.records as T[]
    if (Array.isArray(objectValue.list)) return objectValue.list as T[]
    if (Array.isArray(objectValue.rows)) return objectValue.rows as T[]
    if (Array.isArray(objectValue.items)) return objectValue.items as T[]
    if (Array.isArray(objectValue.content)) return objectValue.content as T[]
    if (objectValue.data && typeof objectValue.data === 'object') return toArray<T>(objectValue.data)
  }
  return []
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function normalizeReportRecord(record: ReportRecord): ReportRecord {
  return {
    ...record,
    id: firstScalar(record, ['id', 'reportId', 'recordId']),
    reportName: firstText(record, ['reportName', 'name', 'title', 'reportTitle']),
    reportType: firstText(record, ['reportType', 'type', 'templateName']),
    status: firstScalar(record, ['status', 'reportStatus', 'generationStatus', 'exportStatus']),
    updateTime: firstText(record, ['updateTime', 'updatedAt', 'modifiedTime', 'gmtModified', 'createTime']),
    createTime: firstText(record, ['createTime', 'createdAt', 'gmtCreate']),
  }
}

function firstScalar(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' || typeof value === 'number') return value
  }
  return undefined
}

function firstText(source: Record<string, unknown>, keys: string[]) {
  const value = firstScalar(source, keys)
  return value === undefined ? undefined : String(value)
}

function firstNumber(source: Record<string, unknown>, keys: string[], fallback: number) {
  for (const key of keys) {
    const value = Number(source[key])
    if (Number.isFinite(value)) return value
  }
  return fallback
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || '未知错误')
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? value.toLocaleString('zh-CN') : '0'
}

function formatDate(value?: string) {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isDraft(status: unknown) {
  return status === 0 || status === '0' || status === 'DRAFT' || status === 'draft'
}

function isGenerated(status: unknown) {
  return status === 1 || status === '1' || status === 'GENERATED' || status === 'DONE' || status === 'SUCCESS'
}

function statusLabel(status: unknown) {
  if (isDraft(status)) return '草稿'
  if (isGenerated(status)) return '已生成'
  if (status === 2 || status === '2' || status === 'FAILED') return '失败'
  if (status === 3 || status === '3' || status === 'DELETED') return '已删除'
  return '待确认'
}

function reportTypeLabel(value: unknown) {
  if (value === 'PEAK_SUMMER') return '迎峰度夏检查'
  if (value === 'COAL_INVENTORY') return '煤库存审计'
  if (value === 'TECHNICAL_PLAN') return '技术方案'
  if (value === 'RESEARCH_REPORT') return '调研分析'
  if (value === 'WEEKLY_REPORT') return '周报汇报'
  return value ? String(value) : '未设置类型'
}

function normalizePath(path: string) {
  const url = new URL(path, window.location.origin)
  return url.pathname.replace(/\/+$/, '') || '/'
}
</script>

<style scoped>
.app-shell {
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 32px);
  display: flex;
}

.app-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-content {
  min-width: 0;
  flex: 1;
  padding: 24px;
  overflow: auto;
  position: relative;
}

.report-loading-panel {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 0.32fr);
  gap: 18px;
  align-items: center;
  margin-bottom: 18px;
  padding: 18px 20px;
  overflow: hidden;
  border: 1px solid rgba(193, 227, 212, 0.14);
  border-radius: var(--km-radius-lg);
  background:
    radial-gradient(circle at 10% 0%, rgba(114, 239, 182, 0.12), transparent 32%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025)),
    rgba(14, 28, 24, 0.74);
  box-shadow: var(--km-shadow-soft);
  backdrop-filter: blur(18px);
}

.report-loading-panel__scan {
  position: absolute;
  top: 0;
  left: 0;
  width: 44%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(114, 239, 182, 0.94), rgba(113, 215, 255, 0.62), transparent);
  animation: report-loading-scan 1.3s linear infinite;
}

.report-loading-panel h2 {
  margin: 6px 0 0;
  color: var(--km-ink);
  font-size: 20px;
}

.report-loading-panel p {
  margin: 6px 0 0;
  color: var(--km-muted);
}

.report-loading-skeleton {
  display: grid;
  gap: 10px;
}

.report-loading-skeleton i {
  display: block;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.045), rgba(114, 239, 182, 0.14), rgba(255, 255, 255, 0.045));
  background-size: 220% 100%;
  animation: report-skeleton-flow 1.35s linear infinite;
}

.report-loading-skeleton i:nth-child(2) {
  width: 78%;
}

.report-loading-skeleton i:nth-child(3) {
  width: 56%;
}

.report-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: end;
  margin-bottom: 18px;
  padding: 28px;
  overflow: hidden;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background:
    radial-gradient(circle at 12% 0%, rgba(114, 239, 182, 0.15), transparent 34%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.025)),
    rgba(14, 28, 24, 0.72);
  box-shadow: var(--km-shadow-card);
  backdrop-filter: blur(18px);
}

.report-hero::after {
  position: absolute;
  right: 28px;
  bottom: 20px;
  left: 28px;
  height: 2px;
  border-radius: 999px;
  content: "";
  background: linear-gradient(90deg, transparent, rgba(114, 239, 182, 0.82), rgba(113, 215, 255, 0.5), transparent);
  background-size: 180% 100%;
  animation: report-flow-line 2.4s linear infinite;
}

.report-hero__eyebrow,
.report-side-kicker {
  display: inline-flex;
  color: var(--km-green-strong);
  font-size: 11px;
  font-weight: 760;
  letter-spacing: 0.16em;
}

.report-hero h1 {
  margin: 10px 0 0;
  color: var(--km-ink);
  font-size: clamp(2.3rem, 4vw, 4.15rem);
  font-weight: 780;
  line-height: 1.04;
  letter-spacing: 0;
}

.report-hero p {
  max-width: 72ch;
  margin: 14px 0 0;
  color: var(--km-muted);
}

.report-hero__chips,
.report-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.report-hero__chips {
  margin-top: 18px;
}

.report-hero__chips span,
.report-status-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 6px 11px;
  border: 1px solid rgba(193, 227, 212, 0.14);
  border-radius: 999px;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.055);
  font-size: 12px;
  font-weight: 640;
}

.report-metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.report-data-alert {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin: -4px 0 18px;
  padding: 16px 18px;
  border: 1px solid rgba(255, 109, 98, 0.24);
  border-radius: var(--km-radius-lg);
  color: var(--km-text);
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 109, 98, 0.1), transparent 34%),
    rgba(255, 255, 255, 0.04);
  box-shadow: var(--km-shadow-soft);
}

.report-data-alert strong {
  display: block;
  color: #ffaaa3;
  font-size: 14px;
}

.report-data-alert p {
  margin: 5px 0 0;
  color: var(--km-muted);
  font-size: 13px;
}

.report-data-alert button {
  flex: 0 0 auto;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(255, 109, 98, 0.28);
  border-radius: 999px;
  color: #ffaaa3;
  background: rgba(255, 109, 98, 0.08);
  cursor: pointer;
  font-weight: 680;
}

.report-metric-card {
  position: relative;
  min-height: 118px;
  padding: 17px;
  overflow: hidden;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background:
    linear-gradient(150deg, rgba(79, 214, 154, 0.13), rgba(255, 255, 255, 0.035) 42%, rgba(255, 255, 255, 0.02)),
    rgba(15, 28, 24, 0.78);
  box-shadow: var(--km-shadow-soft);
  transition:
    transform 180ms var(--km-ease-out),
    border-color 180ms var(--km-ease-out),
    box-shadow 180ms var(--km-ease-out);
}

.report-metric-card::after {
  position: absolute;
  right: -36px;
  bottom: -42px;
  width: 118px;
  height: 118px;
  border-radius: 999px;
  content: "";
  background: rgba(79, 214, 154, 0.1);
  filter: blur(4px);
}

.report-metric-card:hover {
  border-color: rgba(114, 239, 182, 0.34);
  box-shadow: var(--km-shadow-card), var(--km-shadow-glow);
  transform: translateY(-2px);
}

.report-metric-card span,
.report-metric-card small {
  position: relative;
  display: block;
  color: var(--km-muted);
}

.report-metric-card span {
  font-size: 12px;
  font-weight: 680;
}

.report-metric-card strong {
  position: relative;
  display: block;
  margin-top: 10px;
  color: var(--km-ink);
  font-size: clamp(24px, 2.4vw, 34px);
  line-height: 1;
}

.report-metric-card small {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.45;
}

.report-hero__actions {
  justify-content: flex-end;
  max-width: 420px;
}

.report-action,
.report-side-section button,
.report-flow__step {
  cursor: pointer;
  transition:
    transform 160ms var(--km-ease-out),
    border-color 160ms var(--km-ease-out),
    background 160ms var(--km-ease-out),
    box-shadow 160ms var(--km-ease-out),
    color 160ms var(--km-ease-out);
}

.report-action,
.report-side-section button {
  position: relative;
  min-height: 38px;
  padding: 0 15px;
  overflow: hidden;
  border: 1px solid var(--km-border);
  border-radius: 999px;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.055);
  font-weight: 650;
}

.report-action::after,
.report-side-section button::after,
.report-asset-card::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background: linear-gradient(110deg, transparent 0 35%, rgba(255, 255, 255, 0.34) 48%, transparent 62% 100%);
  transform: translateX(-130%);
}

.report-action.loading::after,
.report-side-section button.loading::after {
  animation: report-button-shine 900ms var(--km-ease-out) infinite;
}

.report-action:disabled,
.report-side-section button:disabled,
.report-asset-card:disabled,
.report-flow__step:disabled {
  cursor: wait;
  opacity: 0.64;
  transform: none;
}

.report-action:hover::after,
.report-side-section button:hover::after,
.report-asset-card:hover::after {
  animation: report-button-shine 900ms var(--km-ease-out);
}

.report-action--primary,
.report-action:hover,
.report-side-section button:hover {
  color: #03110c;
  border-color: rgba(114, 239, 182, 0.72);
  background: linear-gradient(135deg, var(--km-green-strong), var(--km-cyan));
  box-shadow: 0 14px 34px rgba(79, 214, 154, 0.18);
  transform: translateY(-1px);
}

.report-action:active,
.report-side-section button:active,
.report-flow__step:active {
  transform: translateY(0) scale(0.985);
}

.report-flow {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

.report-flow__step {
  position: relative;
  min-height: 82px;
  padding: 14px;
  overflow: hidden;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-md);
  text-align: left;
  color: var(--km-text);
  background: rgba(255, 255, 255, 0.04);
}

.report-flow__step::after {
  position: absolute;
  right: 12px;
  bottom: 10px;
  left: 12px;
  height: 2px;
  border-radius: 999px;
  content: "";
  background: linear-gradient(90deg, transparent, rgba(114, 239, 182, 0.74), rgba(113, 215, 255, 0.48), transparent);
  background-size: 180% 100%;
  opacity: 0;
}

.report-flow__step:hover,
.report-flow__step.active {
  border-color: rgba(114, 239, 182, 0.32);
  box-shadow: var(--km-shadow-glow);
  transform: translateY(-2px);
}

.report-flow__step.active::after,
.report-flow__step.done::after {
  opacity: 1;
  animation: report-flow-line 1.8s linear infinite;
}

.report-flow__dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-bottom: 9px;
  border-radius: 999px;
  background: var(--km-faint);
}

.report-flow__step.active .report-flow__dot,
.report-flow__step.done .report-flow__dot {
  background: var(--km-green-strong);
  box-shadow: 0 0 0 6px rgba(114, 239, 182, 0.08), 0 0 18px rgba(114, 239, 182, 0.5);
}

.report-flow__step strong,
.report-flow__step small {
  display: block;
}

.report-flow__step strong {
  color: var(--km-ink);
  font-size: 13px;
}

.report-flow__step small {
  margin-top: 4px;
  color: var(--km-muted);
  font-size: 12px;
}

.report-studio-grid {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 330px;
  gap: 16px;
  align-items: start;
}

.report-studio-side,
.report-studio-main {
  min-width: 0;
}

.report-studio-main {
  display: grid;
  min-height: 560px;
}

.report-studio-side {
  display: grid;
  gap: 14px;
  position: sticky;
  top: 18px;
}

.report-side-section,
.report-preview-card {
  padding: 18px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025)),
    rgba(14, 28, 24, 0.7);
  box-shadow: var(--km-shadow-soft);
  backdrop-filter: blur(18px);
}

.report-side-section h2,
.report-preview-card h2 {
  margin: 8px 0 12px;
  color: var(--km-ink);
  font-size: 18px;
}

.report-side-section {
  display: grid;
  gap: 10px;
}

.report-side-section p,
.report-preview-card p {
  margin: 0;
  color: var(--km-muted);
  font-size: 13px;
}

.report-search-box {
  display: grid;
  gap: 7px;
}

.report-search-box span {
  color: var(--km-muted);
  font-size: 12px;
}

.report-search-box input {
  width: 100%;
  min-height: 40px;
  padding: 0 13px;
  border: 1px solid var(--km-border-light);
  border-radius: 14px;
  color: var(--km-text);
  outline: none;
  background: rgba(5, 10, 8, 0.58);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.report-search-box input:focus {
  border-color: rgba(114, 239, 182, 0.62);
  background: rgba(79, 214, 154, 0.08);
  box-shadow: 0 0 0 4px rgba(79, 214, 154, 0.1);
}

.report-side-section button {
  width: 100%;
}

.report-side-section button.active {
  color: var(--km-green-strong);
  border-color: rgba(114, 239, 182, 0.34);
  background: rgba(79, 214, 154, 0.1);
}

.report-asset-list,
.report-source-list {
  display: grid;
  gap: 10px;
}

.report-asset-card {
  position: relative;
  display: grid;
  gap: 4px;
  width: 100%;
  min-height: 68px;
  padding: 12px 13px;
  overflow: hidden;
  border: 1px solid var(--km-border-light);
  border-radius: 16px;
  color: var(--km-text);
  text-align: left;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition:
    transform 160ms var(--km-ease-out),
    border-color 160ms var(--km-ease-out),
    box-shadow 160ms var(--km-ease-out);
}

.report-asset-card:hover {
  border-color: rgba(114, 239, 182, 0.34);
  box-shadow: var(--km-shadow-glow);
  transform: translateY(-1px);
}

.report-asset-card strong {
  overflow: hidden;
  color: var(--km-ink);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-asset-card span,
.report-side-empty,
.report-source-list span {
  color: var(--km-muted);
  font-size: 12px;
  line-height: 1.45;
}

.report-side-empty {
  margin: 0;
}

.report-source-list span {
  padding: 9px 11px;
  border: 1px solid var(--km-border-light);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.04);
}

.report-paper {
  display: grid;
  gap: 12px;
  margin-top: 14px;
  min-height: 260px;
  padding: 22px;
  border: 1px solid rgba(193, 227, 212, 0.16);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(244, 251, 247, 0.92), rgba(221, 236, 229, 0.86));
  color: #10231b;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.24);
}

.report-paper strong {
  font-size: 18px;
}

.report-paper span {
  color: rgba(16, 35, 27, 0.72);
  font-size: 12px;
}

.report-paper i {
  display: block;
  height: 8px;
  border-radius: 999px;
  background: rgba(16, 35, 27, 0.12);
}

.report-paper i:nth-child(4) {
  width: 76%;
}

.report-paper i:nth-child(5) {
  width: 54%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.35s var(--km-ease-out), transform 0.35s var(--km-ease-out), filter 0.35s var(--km-ease-out);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.992);
  filter: blur(3px);
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

@keyframes report-flow-line {
  from {
    background-position: 0% 50%;
  }

  to {
    background-position: 180% 50%;
  }
}

@keyframes report-button-shine {
  to {
    transform: translateX(130%);
  }
}

@keyframes report-loading-scan {
  from {
    transform: translateX(-120%);
  }

  to {
    transform: translateX(240%);
  }
}

@keyframes report-skeleton-flow {
  from {
    background-position: 0% 50%;
  }

  to {
    background-position: 220% 50%;
  }
}

@media (max-width: 1500px) {
  .report-metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .report-studio-grid {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .report-studio-side--right {
    grid-column: 1 / -1;
    position: static;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
  }
}

@media (max-width: 1180px) {
  .report-hero {
    grid-template-columns: 1fr;
  }

  .report-hero__actions {
    justify-content: flex-start;
    max-width: none;
  }

  .report-flow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .report-studio-grid {
    grid-template-columns: 1fr;
  }

  .report-studio-side {
    position: static;
  }
}

@media (max-width: 720px) {
  .app-content {
    padding: 14px;
  }

  .report-hero {
    padding: 22px;
  }

  .report-flow,
  .report-metric-grid,
  .report-loading-panel,
  .report-studio-side--right {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .report-loading-panel__scan,
  .report-loading-skeleton i,
  .report-action.loading::after,
  .report-side-section button.loading::after {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
  }
}
</style>
