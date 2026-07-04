import { post, type Envelope } from '@/api/request'

export type RetrievalMode = 'SEMANTIC' | 'VECTOR_ONLY' | 'VECTOR_RERANK'

export interface RetrievalSearchRequest {
  query: string
  knowledgeBaseIds?: number[]
  tags?: string[]
  mode: RetrievalMode
  topK: number
  similarityThreshold: number
  rerankTopN?: number
  rerankThreshold?: number
}

export interface RetrievalSearchRecord {
  chunkId?: number | string | null
  vectorId?: string | null
  docId?: number | string | null
  docName?: string | null
  kbId?: number | string | null
  kbName?: string | null
  chapterPath?: string | null
  pageNo?: number | string | null
  summary?: string | null
  content?: string | null
  similarityScore?: number | null
  rerankScore?: number | null
  tags?: string[] | null
}

export interface RetrievalSearchResponse {
  records?: RetrievalSearchRecord[] | null
  total?: number | null
  elapsedMs?: number | null
  effectiveMode?: RetrievalMode | string | null
  modeSource?: string | null
  degradedMode?: boolean | null
}

function unwrap<T>(promise: Promise<Envelope<T>>): Promise<T> {
  return promise.then((res) => {
    if (res.code !== 0) {
      throw new Error(res.message || '请求失败')
    }
    return res.data
  })
}

export function searchRetrieval(payload: RetrievalSearchRequest) {
  return unwrap(post<RetrievalSearchResponse>('/retrieval/search', payload))
}
