import axios from 'axios'

const fallbackByStatus: Record<number, string> = {
  400: '请求参数不完整，请检查输入后重试',
  401: '登录状态已失效，请重新登录',
  403: '当前账号没有执行该操作的权限',
  404: '未找到对应数据，请刷新列表后重试',
  409: '当前状态不允许执行该操作，请刷新后重试',
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
]

function pickBackendMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; msg?: string; error?: string } | undefined
    return data?.message || data?.msg || data?.error || error.message || ''
  }
  return error instanceof Error ? error.message : ''
}

export function friendlyErrorMessage(error: unknown, fallback = '操作失败，请稍后重试') {
  if (axios.isAxiosError(error) && !error.response) {
    return '网络连接失败，请检查服务是否启动'
  }

  const backendMessage = pickBackendMessage(error).trim()
  for (const [pattern, message] of businessRules) {
    if (pattern.test(backendMessage)) return message
  }

  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  if (status && fallbackByStatus[status]) {
    if (status === 409 && backendMessage && !/^\d+$/.test(backendMessage)) {
      return backendMessage
    }
    return fallbackByStatus[status]
  }

  if (backendMessage && !/^(error|failed|\d{3})$/i.test(backendMessage)) {
    return backendMessage
  }
  return fallback
}

export function friendlyEnvelopeMessage(message?: string, fallback = '请求失败') {
  const raw = (message || '').trim()
  if (!raw) return fallback
  for (const [pattern, text] of businessRules) {
    if (pattern.test(raw)) return text
  }
  if (/^\d{3}$/.test(raw)) return fallbackByStatus[Number(raw)] || fallback
  return raw
}
