<template>
  <main class="ks-page">
    <SlashIntro v-if="showIntro" @done="showIntro = false" @skip="showIntro = false" />

    <nav class="ks-topbar" aria-label="展示页导航">
      <a class="ks-topbar__brand" href="#hero">
        <span></span>
        <strong>Knowledge Showcase</strong>
      </a>
      <div>
        <a href="#pipeline">流水线</a>
        <a href="#review">审核闭环</a>
        <a href="#search">检索能力</a>
        <a href="/knowledge/bases">进入系统</a>
      </div>
    </nav>

    <section id="hero" class="ks-hero">
      <div class="ks-hero__copy">
        <span class="ks-eyebrow">Enterprise Knowledge Workspace</span>
        <h1>电力行业知识管理系统</h1>
        <p>从文档入库、智能切片、向量检索到人工审核，构建可追溯、可检索、可运营的企业知识中枢。</p>
        <div class="ks-hero__actions">
          <NeonButton href="/knowledge/bases">进入真实系统</NeonButton>
          <NeonButton href="#pipeline" variant="ghost">查看处理流程</NeonButton>
          <NeonButton href="/knowledge/search" variant="ghost">体验知识检索</NeonButton>
        </div>
        <div class="ks-hero__chips">
          <span>OCR / Parser</span>
          <span>Semantic Chunking</span>
          <span>Embedding</span>
          <span>Human Review</span>
          <span>Vector Rerank</span>
        </div>
      </div>

      <div class="ks-terminal" aria-label="产品流程视觉预览">
        <div class="ks-terminal__bar">
          <span></span>
          <span></span>
          <span></span>
          <strong>pipeline.preview</strong>
        </div>
        <div class="ks-terminal__body">
          <div v-for="step in terminalSteps" :key="step" class="ks-terminal__line">
            <span>READY</span>
            <code>{{ step }}</code>
          </div>
        </div>
      </div>
    </section>

    <ShowcaseSection
      id="metrics"
      eyebrow="Core Metrics"
      title="成果指标：真实数据优先，答辩容错展示"
      description="展示页会尝试读取现有统计接口；未登录或接口不可用时，自动降级为优雅状态，不影响现场演示。"
    >
      <div class="ks-metric-grid">
        <MetricCounter
          v-for="metric in metrics"
          :key="metric.label"
          :label="metric.label"
          :value="metric.value"
          :description="metric.description"
          :source="metricSource"
        />
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      id="pipeline"
      eyebrow="Knowledge Pipeline"
      title="完整知识入库流水线"
      description="上传、解析、切片、向量化、入库、审核、READY、检索命中，每一步都有状态和证据。"
    >
      <PipelineFlow />
    </ShowcaseSection>

    <ShowcaseSection
      id="chunks"
      eyebrow="Chunk Intelligence"
      title="切片化知识加工，不止是上传文件"
      description="每个文档都会被拆分为可检索、可审核、可追溯的知识切片。"
    >
      <ChunkShowcase />
    </ShowcaseSection>

    <ShowcaseSection
      id="review"
      eyebrow="Human Review Loop"
      title="人工审核闭环：让知识入库可控、可追溯、可修正"
      description="审核工作台让切片质量进入可运营流程，支持编辑、拆分、合并、删除与历史记录追踪。"
    >
      <div class="ks-review-grid">
        <article class="ks-review-board">
          <h3>切片质量审核中心</h3>
          <div class="ks-review-stats">
            <span>待审核队列 <strong>可统计</strong></span>
            <span>当前文档切片 <strong>128</strong></span>
            <span>READY 切片 <strong>96</strong></span>
            <span>疑似 OCR 异常 <strong>7</strong></span>
          </div>
          <div class="ks-review-actions">
            <span>编辑切片</span>
            <span>拆分切片</span>
            <span>合并切片</span>
            <span>审核通过</span>
            <span class="is-warn">审核拒绝</span>
          </div>
        </article>

        <ol class="ks-timeline">
          <li v-for="item in reviewTimeline" :key="item">
            <span></span>
            <p>{{ item }}</p>
          </li>
        </ol>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      id="search"
      eyebrow="Semantic Retrieval"
      title="知识检索能力展示"
      description="产品展示页做视觉模拟，真实检索体验入口直达现有 /knowledge/search 页面。"
    >
      <div class="ks-search-demo">
        <div class="ks-search-box">
          <span>QUERY</span>
          <strong>锅炉一般至少要安装几个安全阀？</strong>
          <div class="ks-search-scan"></div>
        </div>
        <div class="ks-result-list">
          <article v-for="(result, index) in searchResults" :key="result.chunkId" :style="{ '--delay': `${index * 130}ms` }">
            <div>
              <strong>{{ result.title }}</strong>
              <span>{{ result.kb }} · page {{ result.page }} · {{ result.score }}</span>
            </div>
            <p>{{ result.summary }}</p>
            <code>{{ result.chunkId }} / {{ result.path }}</code>
          </article>
        </div>
        <div class="ks-search-controls">
          <span>SEMANTIC</span>
          <span>VECTOR_RERANK</span>
          <span>Top K 10</span>
          <span>阈值 0.72</span>
          <NeonButton href="/knowledge/search">进入真实检索</NeonButton>
        </div>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      id="config"
      eyebrow="Runtime Control"
      title="系统配置与运行能力"
      description="模型、解析器与 Worker 参数均可通过系统配置进行运行时调整，降低运维成本。"
    >
      <div class="ks-config-panel">
        <div v-for="item in configItems" :key="item.label" class="ks-config-row">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <i></i>
        </div>
        <pre>[worker] parser=online ocr=enabled queue=healthy
[embedding] model=configurable dimensions=1536
[rerank] topN=8 runtime_reload=true</pre>
        <NeonButton href="/knowledge/config" variant="ghost">查看真实配置</NeonButton>
      </div>
    </ShowcaseSection>

    <ShowcaseSection
      id="architecture"
      eyebrow="Architecture"
      title="技术架构：从前端工作台到向量检索空间"
      description="Frontend、Gateway、Admin、Worker、AI Service、ChromaDB 与存储队列形成完整链路。"
    >
      <ArchitectureGraph />
    </ShowcaseSection>

    <ShowcaseSection
      id="summary"
      eyebrow="Defense Summary"
      title="答辩总结：五个产品亮点"
      center
    >
      <div class="ks-summary-grid">
        <article v-for="item in highlights" :key="item.title">
          <span>{{ item.no }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>
      <div class="ks-final-actions">
        <NeonButton href="/knowledge/bases">进入知识管理系统</NeonButton>
        <NeonButton href="/knowledge/search" variant="ghost">体验知识检索</NeonButton>
        <NeonButton href="/knowledge/review" variant="ghost">查看审核工作台</NeonButton>
        <NeonButton href="/knowledge/statistics" variant="ghost">查看数据统计</NeonButton>
      </div>
    </ShowcaseSection>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ArchitectureGraph from '@/components/showcase/ArchitectureGraph.vue'
import ChunkShowcase from '@/components/showcase/ChunkShowcase.vue'
import MetricCounter from '@/components/showcase/MetricCounter.vue'
import NeonButton from '@/components/showcase/NeonButton.vue'
import PipelineFlow from '@/components/showcase/PipelineFlow.vue'
import ShowcaseSection from '@/components/showcase/ShowcaseSection.vue'
import SlashIntro from '@/components/showcase/SlashIntro.vue'
import '@/styles/showcase.css'

interface StatsOverview {
  knowledgeBaseTotal: number
  documentTotal: number
  chunkTotal: number
  documentReady: number
  documentPendingReview: number
  documentFailed: number
  taskProcessing: number
}

type MetricValue = number | string

const showIntro = ref(true)
const stats = ref<StatsOverview | null>(null)
const statsLoaded = ref(false)

const terminalSteps = ['上传文档', 'OCR / 文档解析', '语义切片', 'Embedding 向量化', '人工审核', '检索命中']

const metricSource = computed(() => (statsLoaded.value ? '来自现有统计接口' : '已接入 / 可统计'))

const metrics = computed(() => {
  const source = stats.value
  const fallback: MetricValue = '可统计'
  return [
    {
      label: '知识库数量',
      value: source?.knowledgeBaseTotal ?? fallback,
      description: '知识库资产规模与分类管理入口。',
    },
    {
      label: '文档数量',
      value: source?.documentTotal ?? fallback,
      description: '已接入文档处理链路的原始资料。',
    },
    {
      label: '切片数量',
      value: source?.chunkTotal ?? fallback,
      description: '可检索、可审核、可追溯的知识片段。',
    },
    {
      label: 'READY 文档数',
      value: source?.documentReady ?? fallback,
      description: '审核通过并进入可检索状态。',
    },
    {
      label: '待审核文档数',
      value: source?.documentPendingReview ?? fallback,
      description: '等待人工质量确认的文档。',
    },
    {
      label: '检索 / 向量能力',
      value: source ? Math.max(source.chunkTotal, 0) : '已接入',
      description: 'Embedding、向量检索与重排序能力。',
    },
  ]
})

const reviewTimeline = [
  '文档解析完成，生成初始切片版本。',
  '审核员发现 OCR 疑似异常，进入编辑模式。',
  '切片拆分后重新计算字符数和章节路径。',
  '审核通过，文档进入 READY 状态。',
]

const searchResults = [
  {
    title: '锅炉安全附件运行规程.pdf',
    kb: '电厂运行知识库',
    score: 'similarity 0.91',
    page: 8,
    chunkId: 'chunk_00012',
    path: '安全附件 / 安全阀',
    summary: '命中摘要：锅炉一般至少应装设两个安全阀，其中一个按较低整定压力动作。',
  },
  {
    title: '压力容器监察条例摘编.docx',
    kb: '法规标准库',
    score: 'similarity 0.86',
    page: 14,
    chunkId: 'chunk_00039',
    path: '超压保护 / 安全阀配置',
    summary: '命中摘要：安全阀数量、整定压力和校验周期应在运行记录中留痕。',
  },
  {
    title: '机组启动前检查清单.xlsx',
    kb: '检修作业库',
    score: 'similarity 0.79',
    page: 3,
    chunkId: 'chunk_00108',
    path: '启动检查 / 阀门状态',
    summary: '命中摘要：启动前检查安全阀铅封、排汽管和试验记录是否符合要求。',
  },
]

const configItems = [
  { label: 'Embedding 模型', value: 'bge / configurable' },
  { label: 'Rerank Top N', value: '8' },
  { label: '向量维度', value: '1536' },
  { label: 'Parser / OCR', value: 'runtime enabled' },
  { label: 'Worker 并发', value: 'queue controlled' },
]

const highlights = [
  { no: '01', title: '全链路知识入库', text: '从上传到 READY 全流程自动化，状态清晰可追踪。' },
  { no: '02', title: '智能切片与向量化', text: '每个切片独立向量化，支持语义检索和命中解释。' },
  { no: '03', title: '人工审核质量闭环', text: '支持编辑、拆分、合并、删除与审核记录追踪。' },
  { no: '04', title: '多模式知识检索', text: '支持语义检索、重排序、阈值、Top K、标签过滤。' },
  { no: '05', title: '可配置运行能力', text: 'Embedding、Rerank、OCR、Worker 参数可配置。' },
]

async function loadStats() {
  const token = window.localStorage.getItem('access_token')
  if (!token) return

  try {
    const response = await fetch('/api/v1/stats/overview?days=30', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    if (!response.ok) return
    const envelope = await response.json()
    if (envelope?.code === 0 && envelope.data) {
      stats.value = envelope.data
      statsLoaded.value = true
    }
  } catch {
    stats.value = null
    statsLoaded.value = false
  }
}

onMounted(() => {
  void loadStats()
})
</script>
