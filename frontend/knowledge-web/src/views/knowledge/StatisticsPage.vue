<template>
  <main class="stats-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">知识管理</p>
        <h1>
          数据统计
          <el-tooltip content="展示知识库、文档、切片、审核与处理任务的整体成果。" placement="right">
            <span class="km-info-dot">?</span>
          </el-tooltip>
        </h1>
        <p class="subtitle">实时反映知识库、文档与处理任务状态</p>
        <div class="km-chip-row stats-hero-chips">
          <span class="km-capability-chip">成果看板</span>
          <span class="km-capability-chip">趋势追踪</span>
          <span class="km-capability-chip">审核规模</span>
          <span class="km-capability-chip">任务状态</span>
        </div>
      </div>
      <el-button :loading="loading" type="primary" plain @click="reload">手动刷新</el-button>
    </header>

    <!-- 错误态 -->
    <el-card v-if="errorMessage" class="state-card error-card" shadow="never">
      <el-empty :description="errorMessage">
        <el-button type="primary" @click="reload">重试</el-button>
      </el-empty>
    </el-card>

    <!-- 加载 / 正常态骨架与内容 -->
    <template v-else>
      <section class="metric-grid" aria-label="核心指标">
        <el-tooltip v-for="card in coreCards" :key="card.key" :content="card.desc" placement="top">
          <el-card class="metric-card core" shadow="never" v-loading="loading">
            <template #header>
              <div class="metric-header">
                <span class="metric-title">{{ card.title }}</span>
                <el-tag :type="card.tagType" effect="plain" size="small">{{ card.tag }}</el-tag>
              </div>
            </template>
            <div class="metric-value">{{ formatNumber(card.value) }}</div>
            <p class="metric-desc">{{ card.desc }}</p>
          </el-card>
        </el-tooltip>
      </section>

      <section class="metric-grid status-grid" aria-label="状态指标">
        <el-tooltip v-for="card in statusCards" :key="card.key" :content="card.desc" placement="top">
          <el-card class="metric-card status" shadow="never" v-loading="loading">
            <template #header>
              <div class="metric-header">
                <span class="metric-title">{{ card.title }}</span>
                <el-tag :type="card.tagType" effect="plain" size="small">{{ card.tag }}</el-tag>
              </div>
            </template>
            <div class="metric-value">{{ formatNumber(card.value) }}</div>
            <p class="metric-desc">{{ card.desc }}</p>
          </el-card>
        </el-tooltip>
      </section>

      <el-card class="trend-card" shadow="never">
        <template #header>
          <div class="trend-header">
            <div>
              <span class="trend-title">近 {{ overview?.documentTrend?.length || 30 }} 天文档上传趋势</span>
              <p class="trend-sub">按 created_at 分日统计（服务端补零）</p>
            </div>
            <span class="trend-meta">数据更新于 {{ lastUpdatedText }}</span>
          </div>
        </template>

        <div v-loading="loading" class="chart-wrapper">
          <div ref="chartEl" class="chart-canvas"></div>
          <div v-if="!hasTrendData && !loading" class="chart-empty">暂无趋势数据</div>
        </div>
      </el-card>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { ElButton, ElCard, ElEmpty, ElTag } from 'element-plus'
import { fetchStatsOverview, type StatsOverview } from '@/api/modules/stats'

// 仅注册实际用到的 ECharts 模块，减小打包体积（按需引入）
echarts.use([
  LineChart,
  GridComponent,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
])

type ElTagType = 'success' | 'warning' | 'info' | 'danger'

interface CoreCard {
  key: string
  title: string
  tag: string
  tagType: ElTagType
  value: number
  desc: string
}

interface StatusCard {
  key: string
  title: string
  tag: string
  tagType: ElTagType
  value: number
  desc: string
}

const overview = ref<StatsOverview | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const lastUpdatedAt = ref<Date | null>(null)

const chartEl = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let resizeHandler: (() => void) | null = null
let resizeObserver: ResizeObserver | null = null
let renderFrame: number | null = null
let renderTimer: ReturnType<typeof setTimeout> | null = null

const hasTrendData = computed(() => (overview.value?.documentTrend?.length ?? 0) > 0)

const lastUpdatedText = computed(() => {
  if (!lastUpdatedAt.value) return '尚未加载'
  const d = lastUpdatedAt.value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

/** 安全取数：overview 为 null 时返回 0，避免模板崩 */
function safeNumber(field: keyof Pick<StatsOverview, 'knowledgeBaseTotal' | 'documentTotal' | 'chunkTotal' | 'documentReady' | 'documentPendingReview' | 'documentFailed' | 'taskProcessing'>): number {
  return overview.value?.[field] ?? 0
}

const coreCards = computed<CoreCard[]>(() => [
  {
    key: 'kb',
    title: '知识库总数',
    tag: 'F2',
    tagType: 'info',
    value: safeNumber('knowledgeBaseTotal'),
    desc: '当前未删除（is_deleted=0）的知识库数量',
  },
  {
    key: 'doc',
    title: '有效文档总数',
    tag: 'F3',
    tagType: 'success',
    value: safeNumber('documentTotal'),
    desc: '未删除的文档总数（包含所有状态）',
  },
  {
    key: 'chunk',
    title: '有效切片总数',
    tag: 'F3.9',
    tagType: 'info',
    value: safeNumber('chunkTotal'),
    desc: 'is_active=1 且所属文档未删除的切片数',
  },
  {
    key: 'pending-core',
    title: '待审核文档',
    tag: '审核',
    tagType: 'warning',
    value: safeNumber('documentPendingReview'),
    desc: '等待审核工作台处理的文档数',
  },
])

const statusCards = computed<StatusCard[]>(() => [
  {
    key: 'ready',
    title: 'READY 文档',
    tag: '可检索',
    tagType: 'success',
    value: safeNumber('documentReady'),
    desc: 'document_status = READY 的文档数',
  },
  {
    key: 'pending',
    title: 'PENDING_REVIEW 文档',
    tag: '待审核',
    tagType: 'warning',
    value: safeNumber('documentPendingReview'),
    desc: '等待审核工作台处理的文档数',
  },
  {
    key: 'failed',
    title: 'FAILED 文档',
    tag: '处理失败',
    tagType: 'danger',
    value: safeNumber('documentFailed'),
    desc: '处理失败的文档数（含重试耗尽）',
  },
  {
    key: 'processing',
    title: '处理中任务',
    tag: 'QUEUED + RUNNING',
    tagType: 'info',
    value: safeNumber('taskProcessing'),
    desc: 'Worker 当前正在排队的任务数',
  },
])

function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('zh-CN')
}

/** 用 NaN-safe 兜底构造 ECharts series 数据 */
function buildChartOption(data: StatsOverview) {
  const trend = data.documentTrend ?? []
  const dates = trend.map((d) => d.date)
  const counts = trend.map((d) => d.count ?? 0)

  return {
    grid: { left: 48, right: 24, top: 36, bottom: 64 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: (params: any) => {
        const arr = Array.isArray(params) ? params : [params]
        const lines = arr
          .map((p) => `${p.marker}${p.seriesName}: <b>${p.value}</b>`)
          .join('<br/>')
        return `${arr[0]?.axisValueLabel ?? ''}<br/>${lines}`
      },
    },
    xAxis: {
      type: 'category',
      data: dates,
      boundaryGap: false,
      axisLabel: {
        rotate: dates.length > 14 ? 40 : 0,
        formatter: (value: string) => (typeof value === 'string' && value.length >= 5 ? value.slice(5) : value),
      },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: {
        formatter: (v: number) => (Number.isInteger(v) ? String(v) : ''),
      },
    },
    series: [
      {
        name: '上传文档数',
        type: 'line',
        data: counts,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#72efb6' },
        lineStyle: { width: 3, color: '#72efb6' },
        areaStyle: { opacity: 0.18, color: '#4fd69a' },
      },
    ],
    textStyle: { color: '#8da099' },
  }
}

function ensureChartInstance(): echarts.ECharts | null {
  if (!chartEl.value) return null
  if (chartInstance) return chartInstance
  chartInstance = echarts.init(chartEl.value)
  return chartInstance
}

function renderChart() {
  if (!chartEl.value || !overview.value) return
  if (chartEl.value.clientWidth <= 0 || chartEl.value.clientHeight <= 0) return

  const inst = ensureChartInstance()
  if (!inst) return
  inst.resize()
  inst.setOption(buildChartOption(overview.value), { notMerge: true })
  inst.resize()
}

function scheduleRenderChart() {
  if (renderFrame !== null) {
    window.cancelAnimationFrame(renderFrame)
    renderFrame = null
  }
  if (renderTimer) {
    clearTimeout(renderTimer)
    renderTimer = null
  }

  nextTick(() => {
    renderFrame = window.requestAnimationFrame(() => {
      renderFrame = null
      renderChart()
      renderTimer = setTimeout(() => {
        renderTimer = null
        renderChart()
      }, 80)
    })
  })
}

function disposeChart() {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

async function reload() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await fetchStatsOverview(30)
    overview.value = data
    lastUpdatedAt.value = new Date()
    scheduleRenderChart()
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || '加载统计概览失败'
    errorMessage.value = `加载失败：${msg}`
    overview.value = null
    disposeChart()
  } finally {
    loading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(reload, 60_000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  // 监听窗口尺寸变化，确保图表自适应
  resizeHandler = () => scheduleRenderChart()
  window.addEventListener('resize', resizeHandler)
  if (chartEl.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => scheduleRenderChart())
    resizeObserver.observe(chartEl.value)
  }

  await reload()
  startPolling()
})

// 数据变化时重绘（例如轮询拿到新数据）
watch(overview, () => {
  if (overview.value) {
    scheduleRenderChart()
  }
})

onBeforeUnmount(() => {
  stopPolling()
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (renderFrame !== null) {
    window.cancelAnimationFrame(renderFrame)
    renderFrame = null
  }
  if (renderTimer) {
    clearTimeout(renderTimer)
    renderTimer = null
  }
  disposeChart()
})
</script>

<style scoped>
.stats-page {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 28px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-xl);
  background:
    linear-gradient(135deg, rgba(79, 214, 154, 0.16), rgba(255, 255, 255, 0.04) 46%, rgba(244, 184, 96, 0.07)),
    rgba(12, 22, 19, 0.72);
  box-shadow: var(--km-shadow-card);
}

.page-header .eyebrow {
  margin: 0 0 8px;
  color: var(--km-green-strong);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
  font-weight: 720;
}

.page-header h1 {
  margin: 0;
  color: var(--km-ink);
  font-size: clamp(30px, 4vw, 40px);
  font-weight: 720;
}

.page-header .subtitle {
  margin: 8px 0 0;
  color: var(--km-muted);
  font-size: 14px;
}

.stats-hero-chips {
  margin-top: 18px;
}

.state-card {
  max-width: 720px;
  margin: 24px auto;
}

.error-card :deep(.el-card__body) {
  padding: 24px 0;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
}

.metric-grid.status-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.metric-card {
  border-radius: var(--km-radius-lg);
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.metric-title {
  font-weight: 650;
  color: var(--km-ink);
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--km-green-strong);
  letter-spacing: 0;
  line-height: 1.2;
}

.metric-desc {
  margin: 8px 0 0;
  color: var(--km-muted);
  font-size: 13px;
  min-height: 18px;
}

.trend-card {
  margin: 0;
  border-radius: var(--km-radius-xl);
}

.trend-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.trend-title {
  font-weight: 650;
  color: var(--km-ink);
}

.trend-sub {
  margin: 6px 0 0;
  color: var(--km-muted);
  font-size: 13px;
}

.trend-meta {
  color: var(--km-faint);
  font-size: 12px;
  white-space: nowrap;
}

.chart-wrapper {
  position: relative;
  width: 100%;
  height: 360px;
}

.chart-canvas {
  width: 100%;
  height: 100%;
}

.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--km-muted);
  font-size: 14px;
  pointer-events: none;
}

@media (max-width: 1080px) {
  .metric-grid,
  .metric-grid.status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .stats-page {
    padding: 0;
  }
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  .metric-grid,
  .metric-grid.status-grid {
    grid-template-columns: 1fr;
  }
  .chart-wrapper {
    height: 280px;
  }
}
</style>
