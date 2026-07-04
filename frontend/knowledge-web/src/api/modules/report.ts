const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const REPORT_API_PREFIX = '/api/v1/reports'

type AnyRecord = Record<string, unknown>

let currentUserId = window.localStorage.getItem('report_user_id') || '1001'

export function setCurrentUserId(userId: string | number) {
  currentUserId = String(userId || '1001')
  window.localStorage.setItem('report_user_id', currentUserId)
}

function cleanObject<T extends AnyRecord>(data: T = {} as T): Partial<T> {
  return Object.entries(data).reduce<Partial<T>>((result, [key, value]) => {
    if (value !== undefined) {
      result[key as keyof T] = value as T[keyof T]
    }
    return result
  }, {})
}

function toJsonBody(data: AnyRecord) {
  return JSON.stringify(cleanObject(data))
}

function cleanGarbageText<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(/\[AI[^\]]*\]/g, '') as T
  }
  if (Array.isArray(value)) {
    return value.map(cleanGarbageText) as T
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as AnyRecord).map(([key, item]) => [key, cleanGarbageText(item)]),
    ) as T
  }
  return value
}

function normalizeOutlineItem(item: AnyRecord): Partial<AnyRecord> {
  return cleanObject({
    id: item.id,
    reportId: item.reportId,
    parentId: item.parentId ?? 0,
    chapterNo: item.chapterNo,
    chapterTitle: item.chapterTitle,
    level: item.level ?? 1,
    sort: item.sort ?? 0,
    editable: item.editable ?? 1,
    aiGenerated: item.aiGenerated ?? 0,
    status: item.status || 'DRAFT',
    remark: item.remark,
    generationPrompt: item.generationPrompt,
  })
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    const isFormData = options.body instanceof FormData
    const token = window.localStorage.getItem('access_token')
    const headers = {
      'X-User-Id': currentUserId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    }
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`无法连接后端服务：${message}`)
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const rawText = await response.text()
  const payload = rawText ? JSON.parse(rawText) : null
  if (!payload) {
    return null as T
  }
  if (payload.code && payload.code !== 200) {
    throw new Error(payload.message || `接口返回失败：${payload.code}`)
  }
  return cleanGarbageText(payload.data)
}

export const reportApi = {
  health() {
    return request(`${REPORT_API_PREFIX}/health`)
  },
  currentUser() {
    return request(`${REPORT_API_PREFIX}/health/user`)
  },
  dashboardOverview() {
    return request(`${REPORT_API_PREFIX}/dashboard/overview`)
  },
  dashboardTrend() {
    return request(`${REPORT_API_PREFIX}/dashboard/trends/last30days`)
  },
  listTemplates() {
    return request(`${REPORT_API_PREFIX}/templates`)
  },
  createTemplate(data: AnyRecord) {
    return request(`${REPORT_API_PREFIX}/templates`, {
      method: 'POST',
      body: toJsonBody(data),
    })
  },
  uploadTemplateFile(templateId: number | string, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return request(`${REPORT_API_PREFIX}/templates/${templateId}/upload`, {
      method: 'POST',
      body: formData,
    })
  },
  saveTemplateChapters(templateId: number | string, chapters: unknown[]) {
    return request(`${REPORT_API_PREFIX}/templates/chapters`, {
      method: 'POST',
      body: toJsonBody({ templateId, chapters }),
    })
  },
  getTemplateChapters(templateId: number | string) {
    return request(`${REPORT_API_PREFIX}/templates/${templateId}/chapters`)
  },
  updateTemplate(id: number | string, data: AnyRecord) {
    return request(`${REPORT_API_PREFIX}/templates/${id}`, {
      method: 'PUT',
      body: toJsonBody(data),
    })
  },
  deleteTemplate(id: number | string) {
    return request(`${REPORT_API_PREFIX}/templates/${id}`, { method: 'DELETE' })
  },
  listRecords() {
    return request(`${REPORT_API_PREFIX}/records`)
  },
  getRecord(id: number | string) {
    return request(`${REPORT_API_PREFIX}/records/${id}`)
  },
  deleteRecord(id: number | string) {
    return request(`${REPORT_API_PREFIX}/records/${id}`, { method: 'DELETE' })
  },
  createDraft(data: AnyRecord) {
    return request(`${REPORT_API_PREFIX}/outlines/draft`, {
      method: 'POST',
      body: toJsonBody(data),
    })
  },
  getOutline(reportId: number | string) {
    return request(`${REPORT_API_PREFIX}/outlines/${reportId}`)
  },
  updateOutline(reportId: number | string, items: AnyRecord[]) {
    return request(`${REPORT_API_PREFIX}/outlines/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(items.map(normalizeOutlineItem)),
    })
  },
  addOutlineItem(reportId: number | string, item: AnyRecord) {
    return request(`${REPORT_API_PREFIX}/outlines/${reportId}/items`, {
      method: 'POST',
      body: JSON.stringify(normalizeOutlineItem(item)),
    })
  },
  updateOutlineItem(itemId: number | string, item: AnyRecord) {
    return request(`${REPORT_API_PREFIX}/outlines/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(normalizeOutlineItem(item)),
    })
  },
  deleteOutlineItem(itemId: number | string) {
    return request(`${REPORT_API_PREFIX}/outlines/items/${itemId}`, { method: 'DELETE' })
  },
  regenerateOutline(reportId: number | string) {
    return request(`${REPORT_API_PREFIX}/outlines/${reportId}/regenerate`, { method: 'POST' })
  },
  moveOutlineItem(reportId: number | string, itemId: number | string, item: AnyRecord) {
    return request(`${REPORT_API_PREFIX}/outlines/${reportId}/items/${itemId}/move`, {
      method: 'POST',
      body: JSON.stringify(normalizeOutlineItem(item)),
    })
  },
  startGeneration(reportId: number | string, data: AnyRecord = {}) {
    return request(`${REPORT_API_PREFIX}/generation`, {
      method: 'POST',
      body: JSON.stringify({
        reportId: Number(reportId),
        stream: false,
        templateId: data.templateId || undefined,
        generationPrompt: data.generationPrompt || undefined,
      }),
    })
  },
  getProgress(reportId: number | string) {
    return request(`${REPORT_API_PREFIX}/generation/${reportId}/progress`)
  },
  listChapters(reportId: number | string) {
    return request(`${REPORT_API_PREFIX}/chapters/report/${reportId}`)
  },
  getChapter(chapterId: number | string) {
    return request(`${REPORT_API_PREFIX}/chapters/${chapterId}`)
  },
  saveChapter(chapterId: number | string, data: AnyRecord) {
    return request(`${REPORT_API_PREFIX}/chapters/${chapterId}`, {
      method: 'PUT',
      body: toJsonBody(data),
    })
  },
  regenerateChapter(chapterId: number | string, data: AnyRecord = {}) {
    return request(`${REPORT_API_PREFIX}/chapters/${chapterId}/ai-regenerate`, {
      method: 'POST',
      body: toJsonBody(data),
    })
  },
  insertTable(chapterId: number | string, data: AnyRecord = {}) {
    return request(`${REPORT_API_PREFIX}/chapters/${chapterId}/table`, {
      method: 'POST',
      body: JSON.stringify(cleanObject({
        title: data.title,
        headers: data.headers,
        rows: data.rows,
      })),
    })
  },
  insertImage(chapterId: number | string, data: AnyRecord = {}) {
    return request(`${REPORT_API_PREFIX}/chapters/${chapterId}/image`, {
      method: 'POST',
      body: JSON.stringify(cleanObject({
        imageUrl: data.imageUrl,
        title: data.title,
      })),
    })
  },
  deleteChapter(chapterId: number | string) {
    return request(`${REPORT_API_PREFIX}/chapters/${chapterId}`, { method: 'DELETE' })
  },
  listChapterReferences(chapterId: number | string) {
    return request(`${REPORT_API_PREFIX}/chapters/${chapterId}/references`)
  },
  regenerateDocx(reportId: number | string) {
    return request(`${REPORT_API_PREFIX}/records/${reportId}/export/docx/regenerate`)
  },
  uploadImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return request(`${REPORT_API_PREFIX}/materials/images`, {
      method: 'POST',
      body: formData,
    })
  },
}

export function fileDownloadUrl(fileNameOrUrl: string): string {
  if (!fileNameOrUrl) return ''
  if (fileNameOrUrl.startsWith('http') || fileNameOrUrl.startsWith('/api')) {
    return fileNameOrUrl
  }
  return `${API_BASE}${REPORT_API_PREFIX}/files/${encodeURIComponent(fileNameOrUrl)}`
}

export async function downloadReportFile(fileNameOrUrl: string): Promise<Blob> {
  const url = fileDownloadUrl(fileNameOrUrl)
  if (!url) {
    throw new Error('下载文件名为空')
  }

  const token = window.localStorage.getItem('access_token')
  const response = await fetch(url, {
    headers: {
      'X-User-Id': currentUserId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const payload = await response.json()
    throw new Error(payload?.message || `接口返回失败：${payload?.code || 'UNKNOWN'}`)
  }

  return response.blob()
}
