import axios from 'axios'

const fallbackByStatus: Record<number, string> = {
  400: '参数校验失败',
  401: '登录状态已失效，请重新登录',
  403: '当前账号没有执行该操作的权限',
  404: '未找到对应数据，请刷新列表后重试',
  409: '当前操作存在业务冲突',
  500: '服务暂时异常，请稍后重试或查看日志',
}

const businessRules: Array<[RegExp, string]> = [
  [/not\s*modified|unchanged|未修改|没有变化|no\s*change/i, '当前内容未发生变化，无需保存'],
  [/conflict|409|状态冲突/i, '当前状态不允许执行该操作，请刷新后重试'],
  [/未就绪|not\s*ready|chunks?\s+are\s+not\s+ready/i, '存在未就绪切片，暂不可审核通过'],
  [/review.*record|审核记录.*失败|records.*failed/i, '审核记录加载失败，请刷新后重试'],
  [/record|records|审核记录.*空|暂无记录/i, '暂无审核记录'],
  [/empty|required|blank|不能为空|必填/i, '请输入必要内容后再操作'],
  [/tag|标签/i, '请输入标签，或取消本次编辑'],
  [/network|timeout|ECONN|Network Error|网络/i, '网络连接失败，请检查服务是否启动'],
  [/document|文档.*无法删除|仍有文档|存在文档/i, '该知识库下仍有文档，无法删除'],
  [/confirmation|策略变更.*确认|confirm/i, '请确认已了解策略变更影响'],
  [/chunkOverlap.*chunkSize|切片重叠.*切片大小|重叠.*大于|重叠.*小于/i, '切片重叠必须小于切片大小'],
  [/separatorsJson|separator|分隔符/i, '分隔符格式不合法'],
]

function extractBackendMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; msg?: string; error?: string } | undefined
    return data?.message || data?.msg || data?.error || error.message || ''
  }
  return error instanceof Error ? error.message : ''
}

function normalizeBusinessMessage(message: string) {
  const raw = message.trim()
  for (const [pattern, text] of businessRules) {
    if (pattern.test(raw)) return text
  }
  return raw
}

export function friendlyErrorMessage(error: unknown, fallback = '操作失败，请稍后重试') {
  if (axios.isAxiosError(error) && !error.response) {
    return '网络连接失败，请检查服务是否启动'
  }

  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  const backendMessage = normalizeBusinessMessage(extractBackendMessage(error))

  if (status === 400) {
    return backendMessage && backendMessage !== '400'
      ? `参数校验失败：${backendMessage}`
      : '参数校验失败'
  }
  if (status === 409) {
    return backendMessage && backendMessage !== '409' ? backendMessage : fallbackByStatus[409]
  }
  if (status && fallbackByStatus[status]) {
    return fallbackByStatus[status]
  }
  if (backendMessage && !/^(error|failed|\d{3})$/i.test(backendMessage)) {
    return backendMessage
  }
  return fallback
}

export function friendlyEnvelopeMessage(message?: string, fallback = '请求失败') {
  const raw = normalizeBusinessMessage(message || '')
  if (!raw) return fallback
  if (/^\d{3}$/.test(raw)) return fallbackByStatus[Number(raw)] || fallback
  return raw
}
