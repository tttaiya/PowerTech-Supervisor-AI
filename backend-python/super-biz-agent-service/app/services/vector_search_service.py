"""知识管理检索服务客户端。"""

from typing import Any, Dict, List

import httpx
from loguru import logger

from app.config import config


class SearchResult:
    """搜索结果类"""

    def __init__(
        self,
        id: str,
        content: str,
        score: float,
        metadata: Dict[str, Any],
    ):
        self.id = id
        self.content = content
        self.score = score
        self.metadata = metadata

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "content": self.content,
            "score": self.score,
            "metadata": self.metadata,
        }


class VectorSearchService:
    """通过知识管理模块检索文档切片。"""

    def __init__(self):
        """初始化检索服务客户端"""
        logger.info(f"知识管理检索客户端初始化完成: {config.retrieval_search_url}")

    def search_similar_documents(
        self,
        query: str,
        top_k: int = 3,
        knowledge_base_ids: list[str] | None = None,
        user_id: str | None = None,
    ) -> List[SearchResult]:
        """搜索相似文档。

        原 Milvus 检索已迁移到知识管理模块：
        POST /internal/v1/retrieval/search
        """
        try:
            logger.info(f"开始调用知识管理检索, 查询: {query}, topK: {top_k}")
            payload: Dict[str, Any] = {
                "query": query,
                "top_k": top_k,
            }
            if knowledge_base_ids:
                payload["knowledge_base_ids"] = knowledge_base_ids
            headers = {
                "X-Internal-Token": config.km_internal_token,
            }
            if user_id:
                headers["X-User-Id"] = str(user_id)

            with httpx.Client(timeout=config.retrieval_request_timeout) as client:
                response = client.post(config.retrieval_search_url, json=payload, headers=headers)
                response.raise_for_status()
                body = response.json()

            rows = self._extract_rows(body)
            search_results = [self._to_search_result(row) for row in rows]
            logger.info(f"搜索完成, 找到 {len(search_results)} 个相似文档")
            return search_results

        except httpx.TimeoutException as e:
            logger.error(f"调用知识管理检索超时: {e}")
            raise RuntimeError("调用 AI 检索服务失败：知识管理检索服务请求超时") from e
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            detail = self._extract_error_message(e.response)
            logger.error(f"调用知识管理检索失败: status={status_code}, detail={detail}")
            if status_code == 401:
                raise RuntimeError("调用 AI 检索服务失败：知识管理检索服务认证失败（401）") from e
            if status_code >= 500:
                raise RuntimeError(f"调用 AI 检索服务失败：知识管理检索服务异常（{status_code}）：{detail}") from e
            raise RuntimeError(f"调用 AI 检索服务失败：HTTP {status_code}：{detail}") from e
        except httpx.HTTPError as e:
            logger.error(f"调用知识管理检索失败: {e}")
            raise RuntimeError(f"调用 AI 检索服务失败：{e}") from e
        except Exception as e:
            logger.error(f"解析知识管理检索结果失败: {e}")
            raise RuntimeError(f"调用 AI 检索服务失败：{e}") from e

    def _extract_rows(self, body: Any) -> list[dict[str, Any]]:
        rows = self._find_rows(body)
        if rows:
            return [item for item in rows if isinstance(item, dict)]
        return []

    def _find_rows(self, value: Any) -> list[Any]:
        if isinstance(value, list):
            return value
        if not isinstance(value, dict):
            return []

        for key in ("records", "results", "items", "rows", "list"):
            rows = value.get(key)
            if isinstance(rows, list):
                return rows

        for key in ("data", "result", "payload"):
            nested = value.get(key)
            rows = self._find_rows(nested)
            if rows:
                return rows

        return []

    def _to_search_result(self, row: dict[str, Any]) -> SearchResult:
        metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
        chunk_id = self._first(row, metadata, "chunk_id", "chunkId", "id")
        score = self._float(
            self._first(row, metadata, "score", "normalized_score", "normalizedScore", "similarity", "vector_score", "vectorScore"),
            1.0,
        )
        normalized_score = self._float(
            self._first(row, metadata, "normalized_score", "normalizedScore", "vector_score", "vectorScore", "similarity", "score"),
            score,
        )
        raw_score = self._float(self._first(row, metadata, "raw_score", "rawScore", "distance", "score"), score)
        merged_metadata = {
            **metadata,
            "id": self._string(self._first(row, metadata, "id", "chunk_id", "chunkId")),
            "chunk_id": self._string(chunk_id),
            "document_id": self._string(self._first(row, metadata, "document_id", "documentId")),
            "knowledge_base_id": self._string(self._first(row, metadata, "knowledge_base_id", "knowledgeBaseId")),
            "knowledge_base_name": self._first(row, metadata, "knowledge_base_name", "knowledgeBaseName"),
            "file_name": self._first(row, metadata, "document_name", "documentName", "file_name", "fileName", "filename"),
            "section_path": self._first(row, metadata, "section_path", "sectionPath"),
            "raw_score": raw_score,
            "normalized_score": normalized_score,
            "retrieval_source": "knowledge_management",
        }
        return SearchResult(
            id=str(chunk_id or merged_metadata["id"] or ""),
            content=str(self._first(row, metadata, "content", "page_content", "pageContent", "content_preview", "contentPreview", "text") or ""),
            score=score,
            metadata=merged_metadata,
        )

    def _first(self, row: dict[str, Any], metadata: dict[str, Any], *keys: str) -> Any:
        for source in (row, metadata):
            for key in keys:
                value = source.get(key)
                if value is not None and value != "":
                    return value
        return None

    def _float(self, value: Any, default: float) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _string(self, value: Any) -> str | None:
        if value is None or value == "":
            return None
        return str(value)

    def _extract_error_message(self, response: httpx.Response) -> str:
        try:
            body = response.json()
        except ValueError:
            return response.text.strip() or response.reason_phrase or "未知错误"

        if isinstance(body, dict):
            for key in ("message", "detail", "error"):
                value = body.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
                if isinstance(value, dict):
                    nested = value.get("message") or value.get("detail") or value.get("code")
                    if nested:
                        return str(nested)
        return response.reason_phrase or "未知错误"


# 全局单例
vector_search_service = VectorSearchService()
