import { get, put, post, type Envelope } from '@/api/request'

/**
 * F6 系统配置 API 模块（commit #19 钱小晓前端整合）。
 *
 * R20：使用现有 request.ts（同域 /api/v1、access_token 注入）
 * R19：业务逻辑 100% 保留钱小晓 ConfigPage 设计，api 层适配现有项目
 *
 * 注意：admin ConfigController 直接返回 DTO（不包装 ApiResponse，v6 修正），
 * 所以这里 .then((r) => r as T) 直接透传 request 返回值。
 */

export interface EmbeddingConfig {
  model: string
  apiBase: string
  apiKey?: string
  dimension: number
}

export interface RerankConfig {
  model: string
  apiBase: string
  apiKey?: string
  topN: number
  threshold: number
}

export interface ParserConfig {
  paddleocrEnabled: boolean
  maxConcurrentTasks: number
  maxRetryCount: number
  timeoutSeconds: number
}

export interface ConnectionTestPayload {
  apiBase: string
  apiKey?: string
  model?: string
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  latencyMs?: number
}

/**
 * R6/v6：钱小晓的 apiKey 默认传 "********" 表示不修改；
 * 后端识别后保留数据库原值。空字符串视为清空。
 */
function stripMaskedApiKey<T extends { apiKey?: string }>(payload: T): T {
  const data = { ...payload }
  if (!data.apiKey || data.apiKey === '********') {
    delete data.apiKey
  }
  return data
}

function normalizeApiKey<T extends { apiKey?: string }>(payload: T): T {
  const data = { ...payload }

  // 掩码代表“不改动”；删除字段后由后端保留旧值
  if (data.apiKey === '********') {
    delete data.apiKey
  }

  // 空字符串必须保留，用于用户主动清空 Key
  return data
}

function unwrap<T>(promise: Promise<Envelope<T>>): Promise<T> {
  return promise.then((res) => {
    if (res.code !== 0) {
      throw new Error(res.message || '请求失败')
    }
    return res.data
  })
}
export const getEmbeddingConfig = () =>
  unwrap(get<EmbeddingConfig>('/configs/embedding'))

export const updateEmbeddingConfig = (data: EmbeddingConfig) =>
  unwrap(put<EmbeddingConfig>('/configs/embedding', normalizeApiKey(data)))

export const getRerankConfig = () =>
  unwrap(get<RerankConfig>('/configs/rerank'))

export const updateRerankConfig = (data: RerankConfig) =>
  unwrap(put<RerankConfig>('/configs/rerank', normalizeApiKey(data)))

export const getParserConfig = () =>
  unwrap(get<ParserConfig>('/configs/parser'))

export const updateParserConfig = (data: ParserConfig) =>
  unwrap(put<ParserConfig>('/configs/parser', data))

export function testConfigConnection(data: ConnectionTestPayload) {
  return unwrap(post<ConnectionTestResult>('/configs/test-connection', stripMaskedApiKey(data)))
}
