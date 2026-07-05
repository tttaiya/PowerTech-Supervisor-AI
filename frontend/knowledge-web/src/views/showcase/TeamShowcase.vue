<template>
  <main class="team-showcase">
    <div v-if="showIntro" class="ts-intro" :class="{ 'is-leaving': introLeaving }" role="dialog" aria-label="小组项目开场动画">
      <div class="ts-intro__grid" aria-hidden="true"></div>
      <div class="ts-intro__beam ts-intro__beam--one" aria-hidden="true"></div>
      <div class="ts-intro__beam ts-intro__beam--two" aria-hidden="true"></div>
      <div class="ts-intro__beam ts-intro__beam--three" aria-hidden="true"></div>
      <div class="ts-intro__core">
        <span>AI Knowledge · Intelligent Q&A · Report Automation</span>
        <h1>企业智能知识与业务协同平台</h1>
        <p>以知识管理为底座，连接智能问答与报告生成，形成从数据沉淀、知识理解到业务输出的完整闭环。</p>
        <div class="ts-intro__modules">
          <strong v-for="item in introModules" :key="item">{{ item }}</strong>
        </div>
        <div class="ts-intro__progress" aria-hidden="true"><i></i></div>
      </div>
      <button class="ts-intro__skip" type="button" @click="finishIntro">跳过开场</button>
    </div>

    <nav class="ts-nav" aria-label="小组展示页导航">
      <a class="ts-nav__brand" href="#hero" @click="jumpTo">
        <span></span>
        <strong>Team Showcase</strong>
      </a>
      <div>
        <a
          v-for="item in navItems"
          :key="item.id"
          :href="`#${item.id}`"
          :class="{ active: activeSection === item.id }"
          @click="jumpTo"
        >
          {{ item.label }}
        </a>
      </div>
    </nav>

    <div class="ts-progress" aria-hidden="true">
      <i :style="{ width: `${pageProgress}%` }"></i>
    </div>

    <section id="hero" class="ts-hero ts-section">
      <div class="ts-hero__copy">
        <span class="ts-kicker">Enterprise Knowledge OS</span>
        <h1>企业智能知识与业务协同平台</h1>
        <p class="ts-hero__lead">面向企业文档、知识检索、智能问答与报告输出的一体化系统。</p>
        <p>
          我们将文档入库、语义切片、向量检索、智能问答、报告分析整合到同一产品体验中，让知识从文件沉淀为可检索、可追溯、可复用的业务能力。
        </p>
        <div class="ts-actions">
          <a class="ts-button" href="/knowledge/bases" @click="pulseButton">进入知识管理</a>
          <a class="ts-button ts-button--ghost" href="/" @click="pulseButton">体验智能问答</a>
          <a class="ts-button ts-button--ghost" href="/reports" @click="pulseButton">查看报告工作台</a>
          <a class="ts-button ts-button--line" href="#architecture" @click="jumpTo">查看系统架构</a>
        </div>
      </div>

      <aside class="ts-console" aria-label="产品总控台预览">
        <div class="ts-console__bar">
          <span></span><span></span><span></span>
          <strong>product.control.center</strong>
        </div>
        <div class="ts-console__body">
          <article v-for="item in consoleModules" :key="item.title">
            <div>
              <span>{{ item.code }}</span>
              <strong>{{ item.title }}</strong>
            </div>
            <p>{{ item.flow }}</p>
            <i></i>
          </article>
        </div>
      </aside>
    </section>

    <section id="modules" class="ts-section">
      <header class="ts-section__header">
        <span class="ts-kicker">Three Modules</span>
        <h2>三大模块合成同一个产品闭环</h2>
        <p>知识管理负责沉淀，智能问答负责使用，报告工作台负责输出，三部分共享同一套黑绿科技风和真实入口。</p>
      </header>
      <div class="ts-module-grid">
        <article v-for="module in modules" :key="module.title" class="ts-module-card">
          <span>{{ module.no }}</span>
          <h3>{{ module.title }}</h3>
          <p>{{ module.description }}</p>
          <div class="ts-chip-row">
            <i v-for="capability in module.capabilities" :key="capability">{{ capability }}</i>
          </div>
          <div class="ts-card-actions">
            <a v-for="action in module.actions" :key="action.label" :href="action.href" @click="pulseButton">
              {{ action.label }}
            </a>
          </div>
        </article>
      </div>
    </section>

    <section id="loop" class="ts-section">
      <header class="ts-section__header ts-section__header--center">
        <span class="ts-kicker">Business Loop</span>
        <h2>一体化业务闭环</h2>
        <p>从文档沉淀到结果复用，数据流在六个节点之间持续流动，避免三个模块变成孤立页面。</p>
      </header>
      <div class="ts-loop">
        <article v-for="(node, index) in loopNodes" :key="node.title" :style="{ '--delay': `${index * 110}ms` }">
          <strong>{{ index + 1 }}</strong>
          <h3>{{ node.title }}</h3>
          <p>{{ node.text }}</p>
        </article>
      </div>
    </section>

    <section id="knowledge" class="ts-section ts-detail">
      <div>
        <span class="ts-kicker">Knowledge Foundation</span>
        <h2>知识管理是整个系统的知识底座</h2>
        <p>
          文档上传、OCR 解析、语义切片、Embedding 向量化、ChromaDB 入库、人工审核、READY 和知识检索组成完整加工流水线。
        </p>
        <div class="ts-actions">
          <a class="ts-button" href="/knowledge/bases" @click="pulseButton">知识库管理</a>
          <a class="ts-button ts-button--ghost" href="/knowledge/review" @click="pulseButton">审核工作台</a>
          <a class="ts-button ts-button--ghost" href="/knowledge/search" @click="pulseButton">知识检索</a>
          <a class="ts-button ts-button--line" href="/showcase" @click="pulseButton">知识展示页</a>
        </div>
      </div>
      <div class="ts-pipeline">
        <article v-for="step in knowledgeSteps" :key="step">
          <span>READY</span>
          <strong>{{ step }}</strong>
        </article>
      </div>
    </section>

    <section id="agent" class="ts-section ts-detail ts-detail--reverse">
      <div class="ts-chat-preview">
        <div class="ts-chat-preview__bubble is-user">如何快速查询锅炉安全阀配置要求？</div>
        <div class="ts-chat-preview__source">召回来源：电厂运行知识库 · 法规标准库 · 检修作业库</div>
        <div class="ts-chat-preview__bubble is-ai">
          已根据知识切片整理：锅炉安全阀数量、整定压力和校验记录需要同时满足规程与现场运行标准。
        </div>
        <div class="ts-thinking"><i></i><i></i><i></i><span>RAG pipeline ready</span></div>
      </div>
      <div>
        <span class="ts-kicker">Intelligent Q&A</span>
        <h2>智能问答让知识真正被使用</h2>
        <p>智能问答模块将知识管理沉淀的切片转化为用户可直接使用的答案，降低查阅文档成本。</p>
        <ol class="ts-mini-flow">
          <li v-for="step in agentSteps" :key="step">{{ step }}</li>
        </ol>
        <div class="ts-actions">
          <!-- 当前 Vue 子应用没有独立智能问答路由，现有真实入口由统一门户 / 承接。 -->
          <a class="ts-button" href="/" @click="pulseButton">进入智能问答</a>
          <a class="ts-button ts-button--line" href="#modules" @click="jumpTo">返回总览</a>
        </div>
      </div>
    </section>

    <section id="report" class="ts-section ts-detail">
      <div>
        <span class="ts-kicker">Report Workspace</span>
        <h2>报告工作台让知识转化为业务输出</h2>
        <p>报告工作台将知识、问答和业务指标转化为可汇报、可沉淀的业务成果。</p>
        <ol class="ts-mini-flow">
          <li v-for="step in reportSteps" :key="step">{{ step }}</li>
        </ol>
        <div class="ts-actions">
          <a class="ts-button" href="/reports" @click="pulseButton">进入报告工作台</a>
          <a class="ts-button ts-button--ghost" href="/knowledge/statistics" @click="pulseButton">查看统计页面</a>
          <a class="ts-button ts-button--line" href="#modules" @click="jumpTo">返回总览</a>
        </div>
      </div>
      <div class="ts-report-preview">
        <div class="ts-report-preview__metrics">
          <span>知识库覆盖率 <strong>92%</strong></span>
          <span>问答命中率 <strong>88%</strong></span>
          <span>报告生成 <strong>Ready</strong></span>
        </div>
        <div class="ts-chart" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <article>
          <strong>报告章节预览</strong>
          <p>一、业务背景 · 二、指标分析 · 三、知识引用 · 四、结论建议</p>
          <div><button type="button">预览</button><button type="button">发布</button><button type="button">下载</button></div>
        </article>
      </div>
    </section>

    <section id="architecture" class="ts-section">
      <header class="ts-section__header">
        <span class="ts-kicker">Unified Architecture</span>
        <h2>统一技术架构</h2>
        <p>Vue 3 前端、Nginx/Gateway、知识服务、AI 服务、智能体服务与报告工作台共用统一工程化部署链路。</p>
      </header>
      <div class="ts-architecture">
        <article v-for="node in architectureNodes" :key="node.name" :class="`is-${node.group}`">
          <span>{{ node.tag }}</span>
          <strong>{{ node.name }}</strong>
          <p>{{ node.text }}</p>
        </article>
      </div>
    </section>

    <section id="summary" class="ts-section">
      <header class="ts-section__header ts-section__header--center">
        <span class="ts-kicker">Defense Summary</span>
        <h2>小组成果总结</h2>
        <p>用统一产品体验展示三部分贡献，答辩时可以从本页一键跳转到真实系统入口。</p>
      </header>
      <div class="ts-summary-grid">
        <article v-for="item in summaryItems" :key="item.title">
          <span>{{ item.no }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.text }}</p>
        </article>
      </div>
      <div class="ts-final-actions">
        <a class="ts-button" href="/knowledge/bases" @click="pulseButton">进入知识管理</a>
        <a class="ts-button ts-button--ghost" href="/" @click="pulseButton">体验智能问答</a>
        <a class="ts-button ts-button--ghost" href="/reports" @click="pulseButton">查看报告工作台</a>
        <a class="ts-button ts-button--line" href="/showcase" @click="pulseButton">知识管理展示页</a>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

type LinkAction = {
  label: string
  href: string
}

const showIntro = ref(true)
const introLeaving = ref(false)
const activeSection = ref('hero')
const pageProgress = ref(0)
let timers: number[] = []
let sectionObserver: IntersectionObserver | null = null

const navItems = [
  { id: 'hero', label: '总览' },
  { id: 'modules', label: '模块' },
  { id: 'loop', label: '闭环' },
  { id: 'knowledge', label: '知识' },
  { id: 'agent', label: '问答' },
  { id: 'report', label: '报告' },
  { id: 'architecture', label: '架构' },
  { id: 'summary', label: '总结' },
]

const introModules = ['Knowledge Management', 'Intelligent Q&A', 'Report Workspace']

const consoleModules = [
  { code: 'KM', title: '知识管理', flow: '文档 -> 切片 -> 向量' },
  { code: 'QA', title: '智能问答', flow: '问题 -> 召回 -> 生成' },
  { code: 'RP', title: '报告工作台', flow: '指标 -> 分析 -> 报告' },
]

const modules: Array<{
  no: string
  title: string
  description: string
  capabilities: string[]
  actions: LinkAction[]
}> = [
  {
    no: '01',
    title: '知识管理：构建企业知识底座',
    description: '完成文档入库、解析、切片、向量化、审核与知识检索，让非结构化文档变成可治理知识资产。',
    capabilities: ['知识库管理', '文档上传', 'OCR / 解析', '智能切片', '向量化入库', '人工审核', '语义检索'],
    actions: [
      { label: '进入知识管理', href: '/knowledge/bases' },
      { label: '查看展示页', href: '/showcase' },
    ],
  },
  {
    no: '02',
    title: '智能问答：让知识真正被使用',
    description: '基于知识库召回与大模型生成，为用户提供面向业务问题的智能解答能力。',
    capabilities: ['自然语言提问', '知识召回', '上下文组织', '大模型生成', '多轮交互', '答案展示', '业务辅助'],
    actions: [
      { label: '体验智能问答', href: '/' },
      { label: '查看问答工作台', href: '/' },
    ],
  },
  {
    no: '03',
    title: '报告工作台：让知识转化为业务输出',
    description: '围绕检索结果、业务数据与系统指标，形成可展示、可沉淀、可复用的报告与分析结果。',
    capabilities: ['数据统计', '指标分析', '报告编辑', '报告生成', '结果展示', '运营监控'],
    actions: [
      { label: '查看报告工作台', href: '/reports' },
      { label: '查看数据统计', href: '/knowledge/statistics' },
    ],
  },
]

const loopNodes = [
  { title: '文档沉淀', text: '上传企业文档，完成统一入库。' },
  { title: '知识加工', text: 'OCR、解析、切片、向量化，将文档变成知识资产。' },
  { title: '向量检索', text: '基于语义相似度召回相关切片。' },
  { title: '智能问答', text: '将检索结果组织成上下文，辅助模型生成答案。' },
  { title: '报告输出', text: '将业务问答、指标数据和分析结果沉淀为报告。' },
  { title: '结果复用', text: '报告与知识反哺业务流程，形成持续运营闭环。' },
]

const knowledgeSteps = ['文档上传', 'OCR 解析', '语义切片', 'Embedding 向量化', 'ChromaDB 入库', '人工审核', 'READY', '知识检索']
const agentSteps = ['用户提问', '知识库召回', '上下文组装', '模型生成', '结构化答案', '业务辅助']
const reportSteps = ['数据指标', '智能分析', '报告编辑', '报告生成', '可视化展示', '结果沉淀']

const architectureNodes = [
  { tag: 'FE', name: 'Frontend / Vue 3', text: '统一展示、管理、报告工作台入口', group: 'front' },
  { tag: 'GW', name: 'Nginx / Gateway', text: '静态资源、路由分发、统一 API 入口', group: 'front' },
  { tag: 'KM', name: 'Knowledge Admin Service', text: '知识库、文档、审核、统计管理', group: 'knowledge' },
  { tag: 'SR', name: 'Search Service', text: '语义检索、召回和重排序能力', group: 'knowledge' },
  { tag: 'WK', name: 'Worker Service', text: '解析、切片、向量化异步处理', group: 'knowledge' },
  { tag: 'AI', name: 'FastAPI AI Service', text: 'OCR、Embedding、Rerank、检索扩展', group: 'agent' },
  { tag: 'AG', name: 'Super Biz Agent Service', text: '智能问答、工具调用和业务辅助', group: 'agent' },
  { tag: 'RP', name: 'Report Workspace', text: '报告创建、大纲、生成、编辑与记录', group: 'report' },
  { tag: 'DB', name: 'MySQL / MinIO / RabbitMQ / ChromaDB / Redis / Nacos', text: '存储、队列、向量库、缓存和配置中心', group: 'report' },
]

const summaryItems = [
  { no: '01', title: '统一产品体验', text: '三个模块风格统一、入口统一、跳转统一。' },
  { no: '02', title: '知识加工闭环', text: '文档从上传到切片、向量化、审核、检索形成完整链路。' },
  { no: '03', title: '智能问答能力', text: '基于知识召回和模型生成，让知识真正被使用。' },
  { no: '04', title: '报告输出能力', text: '将知识、数据和分析结果转化为业务报告。' },
  { no: '05', title: '工程化部署能力', text: 'Docker Compose、Nginx、Gateway、MySQL、MinIO、RabbitMQ、ChromaDB 等服务协同运行。' },
]

function finishIntro() {
  introLeaving.value = true
  timers.push(
    window.setTimeout(() => {
      showIntro.value = false
    }, 360),
  )
}

function jumpTo(event: MouseEvent) {
  const link = event.currentTarget as HTMLAnchorElement
  if (!link.hash) return
  const target = document.querySelector(link.hash)
  if (!target) return
  event.preventDefault()
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function pulseButton(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  target.classList.remove('is-pulsing')
  window.requestAnimationFrame(() => target.classList.add('is-pulsing'))
}

function updateProgress() {
  const scrollTop = window.scrollY
  const max = document.documentElement.scrollHeight - window.innerHeight
  pageProgress.value = max > 0 ? Math.min(100, Math.max(0, (scrollTop / max) * 100)) : 0
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    timers.push(window.setTimeout(() => finishIntro(), 420))
  } else {
    timers.push(window.setTimeout(() => finishIntro(), 2500))
  }

  const sections = Array.from(document.querySelectorAll<HTMLElement>('.ts-section'))
  sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          activeSection.value = entry.target.id || activeSection.value
        }
      })
    },
    { rootMargin: '-34% 0px -46% 0px', threshold: 0.01 },
  )
  sections.forEach((section) => sectionObserver?.observe(section))
  window.addEventListener('scroll', updateProgress, { passive: true })
  updateProgress()
})

onBeforeUnmount(() => {
  timers.forEach((timer) => window.clearTimeout(timer))
  sectionObserver?.disconnect()
  window.removeEventListener('scroll', updateProgress)
})
</script>

<style scoped>
.team-showcase {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  color: #e9fff5;
  background:
    radial-gradient(circle at 18% 10%, rgba(79, 214, 154, 0.18), transparent 27%),
    radial-gradient(circle at 86% 5%, rgba(113, 215, 255, 0.14), transparent 24%),
    radial-gradient(circle at 64% 72%, rgba(177, 132, 255, 0.09), transparent 28%),
    linear-gradient(145deg, #020504 0%, #07130f 48%, #020706 100%);
  isolation: isolate;
  scroll-behavior: smooth;
}

.team-showcase::before,
.team-showcase::after {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  content: "";
}

.team-showcase::before {
  opacity: 0.52;
  background-image:
    linear-gradient(rgba(116, 255, 190, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(116, 255, 190, 0.05) 1px, transparent 1px),
    radial-gradient(rgba(113, 215, 255, 0.18) 1px, transparent 1px);
  background-size: 72px 72px, 72px 72px, 30px 30px;
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.86), transparent 88%);
  animation: ts-grid-drift 26s linear infinite;
}

.team-showcase::after {
  background:
    linear-gradient(115deg, transparent 0 44%, rgba(114, 239, 182, 0.12) 45%, transparent 47% 100%),
    linear-gradient(64deg, transparent 0 60%, rgba(113, 215, 255, 0.08) 61%, transparent 63% 100%);
  background-size: 560px 560px, 760px 760px;
  animation: ts-light-drift 34s linear infinite;
}

.ts-intro {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  overflow: hidden;
  color: #e9fff5;
  background: #020504;
  transition: opacity 360ms ease, transform 360ms ease, filter 360ms ease;
}

.ts-intro.is-leaving {
  opacity: 0;
  transform: scale(1.02);
  filter: blur(14px);
}

.ts-intro__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(114, 239, 182, 0.09) 1px, transparent 1px),
    linear-gradient(90deg, rgba(114, 239, 182, 0.075) 1px, transparent 1px);
  background-size: 68px 68px;
  opacity: 0.42;
  animation: ts-grid-drift 8s linear infinite;
}

.ts-intro__beam {
  position: absolute;
  left: -18%;
  width: 136%;
  height: 3px;
  background: linear-gradient(90deg, transparent, #72efb6, #71d7ff, transparent);
  box-shadow: 0 0 28px rgba(114, 239, 182, 0.78), 0 0 80px rgba(113, 215, 255, 0.48);
  transform: translateX(-110%) rotate(-8deg);
  animation: ts-intro-beam 1.35s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.ts-intro__beam--one {
  top: 34%;
}

.ts-intro__beam--two {
  top: 50%;
  animation-delay: 220ms;
}

.ts-intro__beam--three {
  top: 66%;
  animation-delay: 440ms;
}

.ts-intro__core {
  position: relative;
  z-index: 2;
  width: min(920px, calc(100vw - 40px));
  text-align: center;
}

.ts-intro__core span,
.ts-kicker {
  color: #72efb6;
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 13px;
  font-weight: 780;
  letter-spacing: 0;
  text-transform: uppercase;
}

.ts-intro__core h1 {
  margin: 22px 0 12px;
  color: #f4fff9;
  font-size: clamp(42px, 6vw, 74px);
  line-height: 1.06;
  letter-spacing: 0;
  text-shadow: 0 0 46px rgba(114, 239, 182, 0.34);
}

.ts-intro__core p {
  max-width: 780px;
  margin: 0 auto;
  color: #c6f3e0;
  font-size: 19px;
  line-height: 1.75;
}

.ts-intro__modules {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 26px;
}

.ts-intro__modules strong {
  padding: 10px 14px;
  border: 1px solid rgba(114, 239, 182, 0.24);
  border-radius: 999px;
  color: #dfffee;
  background: rgba(255, 255, 255, 0.055);
  animation: ts-module-light 1.8s ease-in-out infinite;
}

.ts-intro__modules strong:nth-child(2) {
  animation-delay: 260ms;
}

.ts-intro__modules strong:nth-child(3) {
  animation-delay: 520ms;
}

.ts-intro__progress {
  width: min(460px, 72vw);
  height: 3px;
  margin: 34px auto 0;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.ts-intro__progress i {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #72efb6, #71d7ff);
  transform-origin: left center;
  animation: ts-progress-in 2.1s ease both;
}

.ts-intro__skip {
  position: absolute;
  right: 32px;
  bottom: 28px;
  z-index: 4;
  min-height: 38px;
  padding: 0 16px;
  border: 1px solid rgba(114, 239, 182, 0.32);
  border-radius: 999px;
  color: #dfffee;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
}

.ts-nav {
  position: fixed;
  top: 18px;
  right: 24px;
  left: 24px;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 58px;
  padding: 0 18px;
  border: 1px solid rgba(167, 255, 216, 0.18);
  border-radius: 999px;
  background: rgba(3, 12, 9, 0.62);
  box-shadow: 0 18px 70px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.ts-nav a {
  color: #c8f7e2;
  text-decoration: none;
  transition: color 180ms ease, transform 180ms ease;
}

.ts-nav a:hover,
.ts-nav a.active {
  color: #72efb6;
  transform: translateY(-1px);
}

.ts-nav__brand,
.ts-nav div {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ts-nav__brand span {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: linear-gradient(135deg, #72efb6, #71d7ff);
  box-shadow: 0 0 24px rgba(114, 239, 182, 0.58);
}

.ts-nav strong {
  font-size: 14px;
}

.ts-nav div a {
  font-size: 13px;
  font-weight: 650;
}

.ts-progress {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 45;
  height: 2px;
  background: rgba(255, 255, 255, 0.06);
}

.ts-progress i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #72efb6, #71d7ff);
  box-shadow: 0 0 18px rgba(114, 239, 182, 0.62);
}

.ts-section,
.ts-hero {
  position: relative;
  width: min(1760px, 100%);
  margin: 0 auto;
  padding: 112px clamp(20px, 6vw, 104px);
  opacity: 0;
  transform: translateY(28px);
  filter: blur(8px);
  transition: opacity 560ms ease, transform 560ms ease, filter 560ms ease;
}

.ts-section.is-visible,
.ts-hero.is-visible {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

.ts-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.03fr) minmax(430px, 0.97fr);
  gap: 46px;
  align-items: center;
  min-height: 100vh;
  padding-top: 136px;
}

.ts-hero h1,
.ts-section__header h2,
.ts-detail h2 {
  margin: 18px 0 0;
  color: #f4fff9;
  font-weight: 760;
  line-height: 1.08;
  letter-spacing: 0;
  text-shadow: 0 0 42px rgba(114, 239, 182, 0.16);
}

.ts-hero h1 {
  max-width: 860px;
  font-size: clamp(48px, 6.2vw, 86px);
}

.ts-hero p,
.ts-section__header p,
.ts-detail p,
.ts-module-card p,
.ts-loop p,
.ts-summary-grid p {
  color: #b9d9cc;
  font-size: 17px;
  line-height: 1.72;
}

.ts-hero__lead {
  margin-top: 20px;
  color: #e1fff1;
  font-size: 22px;
}

.ts-actions,
.ts-card-actions,
.ts-final-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
}

.ts-actions {
  margin-top: 34px;
}

.ts-button,
.ts-card-actions a {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 22px;
  overflow: hidden;
  border: 1px solid rgba(114, 239, 182, 0.52);
  border-radius: 999px;
  color: #03110c;
  background: linear-gradient(135deg, #72efb6, #71d7ff);
  box-shadow: 0 18px 42px rgba(79, 214, 154, 0.22);
  font-size: 15px;
  font-weight: 760;
  text-decoration: none;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, color 180ms ease;
}

.ts-button::after,
.ts-card-actions a::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background: linear-gradient(110deg, transparent 0 34%, rgba(255, 255, 255, 0.54) 48%, transparent 62% 100%);
  transform: translateX(-140%);
}

.ts-button:hover,
.ts-card-actions a:hover {
  color: #03110c;
  border-color: #a4ffd2;
  box-shadow: 0 20px 62px rgba(79, 214, 154, 0.34), 0 0 0 1px rgba(255, 255, 255, 0.18) inset;
  transform: translateY(-2px);
}

.ts-button:hover::after,
.ts-card-actions a:hover::after,
.ts-button.is-pulsing::after,
.ts-card-actions a.is-pulsing::after {
  animation: ts-button-shine 900ms cubic-bezier(0.22, 1, 0.36, 1);
}

.ts-button:active,
.ts-card-actions a:active {
  transform: translateY(0) scale(0.98);
}

.ts-button--ghost {
  color: #dfffee;
  background: rgba(255, 255, 255, 0.055);
  box-shadow: none;
}

.ts-button--ghost:hover,
.ts-button--line:hover {
  color: #72efb6;
  background: rgba(79, 214, 154, 0.11);
}

.ts-button--line {
  color: #dfffee;
  background: transparent;
  box-shadow: none;
}

.ts-console,
.ts-module-card,
.ts-loop article,
.ts-pipeline article,
.ts-chat-preview,
.ts-report-preview,
.ts-architecture article,
.ts-summary-grid article {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(167, 255, 216, 0.16);
  border-radius: 8px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.025)),
    rgba(6, 20, 16, 0.78);
  box-shadow: 0 22px 74px rgba(0, 0, 0, 0.26);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.ts-console:hover,
.ts-module-card:hover,
.ts-loop article:hover,
.ts-pipeline article:hover,
.ts-chat-preview:hover,
.ts-report-preview:hover,
.ts-architecture article:hover,
.ts-summary-grid article:hover {
  border-color: rgba(114, 239, 182, 0.48);
  box-shadow: 0 26px 90px rgba(0, 0, 0, 0.36), 0 0 46px rgba(79, 214, 154, 0.14);
  transform: translateY(-4px);
}

.ts-console {
  min-height: 540px;
  transform: perspective(1200px) rotateY(-6deg) rotateX(3deg);
}

.ts-console:hover {
  transform: perspective(1200px) rotateY(-3deg) rotateX(1deg) translateY(-5px);
}

.ts-console__bar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 52px;
  padding: 0 18px;
  border-bottom: 1px solid rgba(167, 255, 216, 0.12);
  background: rgba(0, 0, 0, 0.22);
}

.ts-console__bar span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #72efb6;
}

.ts-console__bar span:nth-child(2) {
  background: #71d7ff;
}

.ts-console__bar span:nth-child(3) {
  background: #f4b860;
}

.ts-console__bar strong {
  margin-left: 8px;
  color: #9feccb;
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 13px;
}

.ts-console__body {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 18px;
  padding: 30px;
}

.ts-console__body article {
  position: relative;
  min-height: 132px;
  padding: 20px;
  overflow: hidden;
  border: 1px solid rgba(167, 255, 216, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}

.ts-console__body article div {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ts-console__body span,
.ts-module-card > span,
.ts-architecture span,
.ts-summary-grid span {
  color: #03110c;
  background: linear-gradient(135deg, #72efb6, #71d7ff);
  border-radius: 999px;
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 11px;
  font-weight: 820;
}

.ts-console__body span {
  padding: 5px 9px;
}

.ts-console__body strong,
.ts-module-card h3,
.ts-loop h3,
.ts-summary-grid h3 {
  color: #f4fff9;
  font-size: 19px;
}

.ts-console__body p {
  margin: 16px 0 0;
  color: #b9d9cc;
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 17px;
}

.ts-console__body i {
  position: absolute;
  right: 20px;
  bottom: 18px;
  left: 20px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #72efb6, #71d7ff, transparent);
  background-size: 240% 100%;
  animation: ts-flow-line 1.6s linear infinite;
}

.ts-section__header {
  max-width: 980px;
  margin-bottom: 38px;
}

.ts-section__header--center {
  margin-right: auto;
  margin-left: auto;
  text-align: center;
}

.ts-section__header h2,
.ts-detail h2 {
  font-size: clamp(34px, 4vw, 52px);
}

.ts-module-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.ts-module-grid::before {
  position: absolute;
  top: 50%;
  right: 6%;
  left: 6%;
  height: 2px;
  content: "";
  background: linear-gradient(90deg, transparent, rgba(114, 239, 182, 0.72), rgba(113, 215, 255, 0.54), transparent);
  background-size: 240% 100%;
  animation: ts-flow-line 2.3s linear infinite;
}

.ts-module-card {
  min-height: 470px;
  padding: 24px;
}

.ts-module-card > span,
.ts-summary-grid span {
  display: inline-flex;
  padding: 6px 10px;
}

.ts-module-card h3 {
  margin: 22px 0 0;
}

.ts-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 22px 0;
}

.ts-chip-row i {
  min-height: 32px;
  padding: 7px 11px;
  border: 1px solid rgba(167, 255, 216, 0.15);
  border-radius: 999px;
  color: #cef6e4;
  background: rgba(255, 255, 255, 0.045);
  font-size: 13px;
  font-style: normal;
  font-weight: 680;
}

.ts-card-actions {
  margin-top: auto;
}

.ts-card-actions a {
  min-height: 40px;
  padding: 0 16px;
  font-size: 13px;
}

.ts-loop {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}

.ts-loop article {
  min-height: 230px;
  padding: 20px;
  animation: ts-node-breathe 2.8s ease-in-out infinite;
  animation-delay: var(--delay);
}

.ts-loop strong {
  display: inline-grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(114, 239, 182, 0.35);
  border-radius: 999px;
  color: #72efb6;
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  box-shadow: 0 0 28px rgba(114, 239, 182, 0.16);
}

.ts-detail {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(460px, 1.05fr);
  gap: 36px;
  align-items: center;
}

.ts-detail--reverse {
  grid-template-columns: minmax(460px, 1.05fr) minmax(0, 0.95fr);
}

.ts-pipeline {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.ts-pipeline article {
  min-height: 104px;
  padding: 18px;
}

.ts-pipeline span {
  color: #03110c;
  background: #72efb6;
  border-radius: 999px;
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 11px;
  font-weight: 780;
  padding: 4px 8px;
}

.ts-pipeline strong {
  display: block;
  margin-top: 14px;
  color: #f4fff9;
}

.ts-chat-preview,
.ts-report-preview {
  padding: 26px;
}

.ts-chat-preview__bubble {
  max-width: 82%;
  margin-bottom: 16px;
  padding: 16px 18px;
  border: 1px solid rgba(167, 255, 216, 0.14);
  border-radius: 8px;
  color: #dfffee;
  background: rgba(255, 255, 255, 0.045);
}

.ts-chat-preview__bubble.is-user {
  margin-left: auto;
  color: #03110c;
  background: linear-gradient(135deg, #72efb6, #71d7ff);
}

.ts-chat-preview__source {
  width: fit-content;
  max-width: 92%;
  margin: 0 0 16px;
  padding: 10px 12px;
  border: 1px solid rgba(113, 215, 255, 0.2);
  border-radius: 999px;
  color: #9feccb;
  background: rgba(113, 215, 255, 0.06);
  font-size: 13px;
}

.ts-thinking {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #93b6a8;
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
}

.ts-thinking i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #72efb6;
  animation: ts-dot-pulse 1.2s ease-in-out infinite;
}

.ts-thinking i:nth-child(2) {
  animation-delay: 130ms;
}

.ts-thinking i:nth-child(3) {
  animation-delay: 260ms;
}

.ts-mini-flow {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0;
  margin: 24px 0 0;
  list-style: none;
}

.ts-mini-flow li {
  padding: 8px 12px;
  border: 1px solid rgba(167, 255, 216, 0.15);
  border-radius: 999px;
  color: #cef6e4;
  background: rgba(255, 255, 255, 0.045);
  font-size: 13px;
}

.ts-report-preview {
  display: grid;
  gap: 18px;
}

.ts-report-preview__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.ts-report-preview__metrics span,
.ts-report-preview article {
  padding: 16px;
  border: 1px solid rgba(167, 255, 216, 0.14);
  border-radius: 8px;
  color: #b9d9cc;
  background: rgba(255, 255, 255, 0.04);
}

.ts-report-preview__metrics strong {
  display: block;
  margin-top: 10px;
  color: #72efb6;
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 22px;
}

.ts-chart {
  display: flex;
  align-items: end;
  gap: 12px;
  height: 210px;
  padding: 18px;
  border: 1px solid rgba(167, 255, 216, 0.14);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.22);
}

.ts-chart i {
  flex: 1;
  min-width: 20px;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(180deg, #72efb6, rgba(113, 215, 255, 0.18));
  box-shadow: 0 0 28px rgba(114, 239, 182, 0.18);
}

.ts-chart i:nth-child(1) {
  height: 44%;
}

.ts-chart i:nth-child(2) {
  height: 72%;
}

.ts-chart i:nth-child(3) {
  height: 56%;
}

.ts-chart i:nth-child(4) {
  height: 88%;
}

.ts-chart i:nth-child(5) {
  height: 66%;
}

.ts-report-preview article strong {
  color: #f4fff9;
}

.ts-report-preview article button {
  min-height: 34px;
  margin: 12px 8px 0 0;
  padding: 0 12px;
  border: 1px solid rgba(114, 239, 182, 0.24);
  border-radius: 999px;
  color: #dfffee;
  background: rgba(255, 255, 255, 0.055);
}

.ts-architecture {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.ts-architecture article {
  min-height: 178px;
  padding: 22px;
}

.ts-architecture span {
  display: inline-flex;
  padding: 5px 9px;
  margin-bottom: 14px;
}

.ts-architecture strong {
  display: block;
  color: #f4fff9;
  font-size: 18px;
}

.ts-architecture p {
  color: #b9d9cc;
}

.ts-architecture .is-agent {
  border-color: rgba(113, 215, 255, 0.24);
}

.ts-architecture .is-report {
  border-color: rgba(177, 132, 255, 0.22);
}

.ts-summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.ts-summary-grid article {
  min-height: 248px;
  padding: 22px;
}

.ts-summary-grid h3 {
  margin: 18px 0 0;
}

.ts-final-actions {
  justify-content: center;
  margin-top: 34px;
}

@keyframes ts-grid-drift {
  to {
    background-position: 80px 120px, 80px 120px, 42px 56px;
  }
}

@keyframes ts-light-drift {
  to {
    background-position: 560px 360px, -760px 420px;
  }
}

@keyframes ts-intro-beam {
  to {
    transform: translateX(110%) rotate(-8deg);
  }
}

@keyframes ts-module-light {
  50% {
    color: #72efb6;
    border-color: rgba(114, 239, 182, 0.58);
    box-shadow: 0 0 32px rgba(114, 239, 182, 0.2);
  }
}

@keyframes ts-progress-in {
  from {
    transform: scaleX(0);
  }

  to {
    transform: scaleX(1);
  }
}

@keyframes ts-button-shine {
  to {
    transform: translateX(140%);
  }
}

@keyframes ts-flow-line {
  to {
    background-position: 240% 0;
  }
}

@keyframes ts-node-breathe {
  50% {
    border-color: rgba(114, 239, 182, 0.42);
    box-shadow: 0 0 34px rgba(79, 214, 154, 0.12);
  }
}

@keyframes ts-dot-pulse {
  50% {
    opacity: 0.45;
    transform: translateY(-3px);
  }
}

@media (max-width: 1180px) {
  .ts-hero,
  .ts-detail,
  .ts-detail--reverse {
    grid-template-columns: 1fr;
  }

  .ts-console {
    transform: none;
  }

  .ts-module-grid,
  .ts-architecture,
  .ts-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ts-loop {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .ts-nav {
    right: 12px;
    left: 12px;
    align-items: flex-start;
    border-radius: 8px;
    padding: 12px;
  }

  .ts-nav div {
    display: none;
  }

  .ts-section,
  .ts-hero {
    padding-right: 18px;
    padding-left: 18px;
  }

  .ts-hero h1 {
    font-size: 44px;
  }

  .ts-hero p,
  .ts-section__header p,
  .ts-detail p {
    font-size: 16px;
  }

  .ts-module-grid,
  .ts-loop,
  .ts-pipeline,
  .ts-architecture,
  .ts-summary-grid,
  .ts-report-preview__metrics {
    grid-template-columns: 1fr;
  }

  .ts-console {
    min-height: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .team-showcase,
  .team-showcase *,
  .team-showcase *::before,
  .team-showcase *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }

  .ts-section,
  .ts-hero {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
</style>
