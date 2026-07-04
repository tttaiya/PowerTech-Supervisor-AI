<template>
  <main class="config-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">MODEL CONTROL CENTER</p>
        <h1>
          系统配置
          <el-tooltip content="统一控制 Embedding、Rerank、Parser/OCR 与 Worker 运行参数。" placement="right">
            <span class="km-info-dot">?</span>
          </el-tooltip>
        </h1>
        <p class="subtitle">嵌入模型、重排序模型与解析 Worker 参数统一调优，保存后即时生效。</p>
        <div class="km-chip-row config-hero-chips">
          <span class="km-capability-chip">即时生效</span>
          <span class="km-capability-chip">无需重启</span>
          <span class="km-capability-chip">连接可测试</span>
          <span class="km-capability-chip">运行时控制</span>
        </div>
      </div>
      <el-button :loading="loading" @click="loadAllConfigs">刷新</el-button>
    </header>

    <section class="config-summary">
      <div class="summary-card">
        <strong>Embedding</strong>
        <span>{{ embeddingForm.model }} · {{ embeddingForm.dimension }} 维</span>
      </div>
      <div class="summary-card">
        <strong>Rerank</strong>
        <span>{{ rerankForm.model }} · Top {{ rerankForm.topN }}</span>
      </div>
      <div class="summary-card">
        <strong>Parser / OCR</strong>
        <span>{{ parserForm.paddleocrEnabled ? 'OCR 已启用' : 'OCR 未启用' }} · {{ parserForm.maxConcurrentTasks }} 并发</span>
      </div>
    </section>

    <section class="config-grid">
      <el-card class="config-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>
              嵌入模型配置
              <el-tooltip content="控制文档向量化使用的模型、API 与向量维度。" placement="top">
                <span class="km-info-dot">?</span>
              </el-tooltip>
            </span>
            <el-tag size="small" type="success" effect="plain">即时生效</el-tag>
          </div>
        </template>

        <el-form label-position="top" :model="embeddingForm">
          <el-form-item label="模型名称" required>
            <el-input v-model.trim="embeddingForm.model" placeholder="请输入嵌入模型名称" />
          </el-form-item>
          <el-form-item label="API 地址">
            <el-input v-model.trim="embeddingForm.apiBase" placeholder="https://example.com/embedding（选填）" clearable />
            <!-- R6/v6：默认 apiBase/apiKey 留空字符串（容器内 localhost 陷阱） -->
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="embeddingForm.apiKey" type="password" show-password placeholder="********" autocomplete="new-password" />
            <!-- R6/v6：默认空字符串 / 已掩码 -->
          </el-form-item>
          <el-form-item label="向量维度" required>
            <el-input-number v-model="embeddingForm.dimension" :min="1" :step="1" controls-position="right" />
            <!-- 默认 1024 由后端返回 -->
          </el-form-item>
        </el-form>

        <div class="actions">
          <el-button :loading="testing === 'embedding'" @click="testConnection('embedding')">测试连接</el-button>
          <el-button type="primary" :loading="saving === 'embedding'" @click="saveEmbeddingConfig">保存</el-button>
        </div>
      </el-card>

      <el-card class="config-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>
              重排序模型配置
              <el-tooltip content="控制向量召回后的精排模型与阈值。" placement="top">
                <span class="km-info-dot">?</span>
              </el-tooltip>
            </span>
            <el-tag size="small" type="warning" effect="plain">精度增强</el-tag>
          </div>
        </template>

        <el-form label-position="top" :model="rerankForm">
          <el-form-item label="模型名称" required>
            <el-input v-model.trim="rerankForm.model" placeholder="请输入重排序模型名称" />
          </el-form-item>
          <el-form-item label="API 地址">
            <el-input v-model.trim="rerankForm.apiBase" placeholder="https://example.com/rerank（选填）" clearable />
            <!-- R6/v6：默认 apiBase/apiKey 留空字符串 -->
          </el-form-item>
          <el-form-item label="API Key">
            <el-input v-model="rerankForm.apiKey" type="password" show-password placeholder="********" autocomplete="new-password" />
            <!-- R6/v6：默认空字符串 / 已掩码 -->
          </el-form-item>
          <el-form-item label="Top N" required>
            <el-input-number v-model="rerankForm.topN" :min="1" :step="1" controls-position="right" />
            <!-- 默认 10 由后端返回 -->
          </el-form-item>
          <el-form-item label="阈值" required>
            <el-input-number v-model="rerankForm.threshold" :min="0" :max="1" :step="0.01" controls-position="right" />
            <!-- 默认 0.7 由后端返回 -->
          </el-form-item>
        </el-form>

        <div class="actions">
          <el-button :loading="testing === 'rerank'" @click="testConnection('rerank')">测试连接</el-button>
          <el-button type="primary" :loading="saving === 'rerank'" @click="saveRerankConfig">保存</el-button>
        </div>
      </el-card>

      <el-card class="config-card parser-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>
              解析器 / OCR / Worker 配置
              <el-tooltip content="控制文档解析、OCR 开关、并发、重试与超时策略。" placement="top">
                <span class="km-info-dot">?</span>
              </el-tooltip>
            </span>
            <el-tag size="small" type="info" effect="plain">热加载</el-tag>
          </div>
        </template>

        <el-form label-position="top" :model="parserForm">
          <el-form-item label="PaddleOCR 开关" required>
            <el-switch v-model="parserForm.paddleocrEnabled" active-text="开启" inactive-text="关闭" />
          </el-form-item>
          <el-form-item label="最大并发任务数" required>
            <el-input-number v-model="parserForm.maxConcurrentTasks" :min="1" :step="1" controls-position="right" />
            <!-- 默认 4 由后端返回；Worker DynamicConfigHolder 热加载，R28 -->
          </el-form-item>
          <el-form-item label="最大重试次数" required>
            <el-input-number v-model="parserForm.maxRetryCount" :min="0" :step="1" controls-position="right" />
            <!-- 默认 3 由后端返回 -->
          </el-form-item>
          <el-form-item label="超时时间（秒）" required>
            <el-input-number v-model="parserForm.timeoutSeconds" :min="1" :step="1" controls-position="right" />
            <!-- 默认 30 由后端返回 -->
          </el-form-item>
        </el-form>

        <div class="actions">
          <!-- R3/v6：OCR 测试按钮 P0 阶段隐藏（钱小晓实现错误：用 embeddingForm.apiBase 测 OCR）；等真实 OCR 地址配置后启用 -->
          <!-- <el-button :loading="testing === 'ocr'" @click="testConnection('ocr')">测试连接</el-button> -->
          <el-button type="primary" :loading="saving === 'parser'" @click="saveParserConfig">保存</el-button>
        </div>
      </el-card>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getEmbeddingConfig,
  getParserConfig,
  getRerankConfig,
  testConfigConnection,
  updateEmbeddingConfig,
  updateParserConfig,
  updateRerankConfig,
} from '@/api/modules/config'

const loading = ref(false)
const saving = ref('')
const testing = ref('')

const embeddingForm = reactive({
  model: 'text-embedding-v1',
  apiBase: '',
  apiKey: '',
  dimension: 1024,
})

const rerankForm = reactive({
  model: 'bge-reranker-v2-m3',
  apiBase: '',
  apiKey: '',
  topN: 10,
  threshold: 0.7,
})

const parserForm = reactive({
  paddleocrEnabled: false,
  maxConcurrentTasks: 4,
  maxRetryCount: 3,
  timeoutSeconds: 30,
})

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return Boolean(url.protocol && url.host)
  } catch {
    return false
  }
}

function assertEmbedding(): boolean {
  if (!embeddingForm.model || !Number.isInteger(embeddingForm.dimension) || embeddingForm.dimension <= 0) {
    ElMessage.warning('请检查嵌入模型名称和向量维度')
    return false
  }
  if (embeddingForm.apiBase && !isValidUrl(embeddingForm.apiBase)) {
    ElMessage.warning('嵌入 API 地址格式非法')
    return false
  }
  return true
}

function assertRerank(): boolean {
  if (!rerankForm.model || !Number.isInteger(rerankForm.topN) || rerankForm.topN <= 0) {
    ElMessage.warning('请检查重排序模型名称和 Top N')
    return false
  }
  if (typeof rerankForm.threshold !== 'number' || rerankForm.threshold < 0 || rerankForm.threshold > 1) {
    ElMessage.warning('阈值必须在 0 到 1 之间')
    return false
  }
  if (rerankForm.apiBase && !isValidUrl(rerankForm.apiBase)) {
    ElMessage.warning('重排序 API 地址格式非法')
    return false
  }
  return true
}

function assertParser(): boolean {
  if (!Number.isInteger(parserForm.maxConcurrentTasks) || parserForm.maxConcurrentTasks <= 0) {
    ElMessage.warning('最大并发任务数必须为正整数')
    return false
  }
  if (!Number.isInteger(parserForm.maxRetryCount) || parserForm.maxRetryCount < 0) {
    ElMessage.warning('最大重试次数必须为非负整数')
    return false
  }
  if (!Number.isInteger(parserForm.timeoutSeconds) || parserForm.timeoutSeconds <= 0) {
    ElMessage.warning('超时时间必须为正整数')
    return false
  }
  return true
}

async function loadAllConfigs() {
  loading.value = true
  try {
    const [embedding, rerank, parser] = await Promise.all([
      getEmbeddingConfig(),
      getRerankConfig(),
      getParserConfig(),
    ])
    Object.assign(embeddingForm, embedding)
    Object.assign(rerankForm, rerank)
    Object.assign(parserForm, parser)
  } catch (error: any) {
    ElMessage.error(error?.message || '配置加载失败')
  } finally {
    loading.value = false
  }
}

async function saveEmbeddingConfig() {
  if (!assertEmbedding()) return
  saving.value = 'embedding'
  try {
    await updateEmbeddingConfig({ ...embeddingForm })
    ElMessage.success('配置已保存并即时生效')
    await loadAllConfigs()
  } catch (error: any) {
    ElMessage.error(error?.message || '嵌入模型配置保存失败')
  } finally {
    saving.value = ''
  }
}

async function saveRerankConfig() {
  if (!assertRerank()) return
  saving.value = 'rerank'
  try {
    await updateRerankConfig({ ...rerankForm })
    ElMessage.success('配置已保存并即时生效')
    await loadAllConfigs()
  } catch (error: any) {
    ElMessage.error(error?.message || '重排序模型配置保存失败')
  } finally {
    saving.value = ''
  }
}

async function saveParserConfig() {
  if (!assertParser()) return
  saving.value = 'parser'
  try {
    await updateParserConfig({ ...parserForm })
    ElMessage.success('配置已保存并即时生效')
    await loadAllConfigs()
  } catch (error: any) {
    ElMessage.error(error?.message || '解析器配置保存失败')
  } finally {
    saving.value = ''
  }
}

async function testConnection(type: 'embedding' | 'rerank') {
  const target = type === 'embedding' ? embeddingForm : rerankForm
  if (!target.apiBase) {
    ElMessage.warning('请先填写 API 地址')
    return
  }
  if (!isValidUrl(target.apiBase)) {
    ElMessage.warning('API 地址格式非法')
    return
  }
  testing.value = type
  try {
    const result = await testConfigConnection({
      apiBase: target.apiBase,
      apiKey: target.apiKey,
      model: target.model,
    })
    result.success ? ElMessage.success(result.message) : ElMessage.error(result.message)
  } catch (error: any) {
    ElMessage.error(error?.message || '连接测试失败')
  } finally {
    testing.value = ''
  }
}

onMounted(loadAllConfigs)
</script>

<style scoped>
.config-page {
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

.eyebrow {
  margin: 0 0 8px;
  color: var(--km-green-strong);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
  font-weight: 720;
}

h1 {
  margin: 0;
  color: var(--km-ink);
  font-size: clamp(30px, 4vw, 40px);
  font-weight: 720;
  letter-spacing: 0;
}

.subtitle {
  max-width: 680px;
  margin: 10px 0 0;
  color: var(--km-muted);
}

.config-hero-chips {
  margin-top: 18px;
}

.config-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  padding: 16px;
  border: 1px solid var(--km-border-light);
  border-radius: var(--km-radius-lg);
  background: rgba(255, 255, 255, 0.035);
  box-shadow: var(--km-shadow-soft);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.summary-card:hover {
  border-color: rgba(114, 239, 182, 0.3);
  background: rgba(79, 214, 154, 0.07);
  transform: translateY(-2px);
}

.summary-card strong {
  display: block;
  color: var(--km-green-strong);
  font-family: "SF Mono", "Cascadia Mono", Consolas, monospace;
  font-size: 12px;
}

.summary-card span {
  display: block;
  margin-top: 8px;
  color: var(--km-text);
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.config-card {
  border-radius: var(--km-radius-xl);
  text-align: left;
}

.parser-card {
  grid-column: 1 / -1;
}

.card-header,
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-header {
  color: var(--km-ink);
  font-weight: 650;
}

.card-header span {
  display: inline-flex;
  align-items: center;
}

.actions {
  justify-content: flex-end;
  padding-top: 6px;
}

:deep(.el-input-number) {
  width: 100%;
}

@media (max-width: 860px) {
  .config-page {
    padding: 0;
  }

  .page-header {
    align-items: stretch;
    flex-direction: column;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }

  .config-summary {
    grid-template-columns: 1fr;
  }
}
</style>
