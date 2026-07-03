"""向量检索服务模块"""

import json
from typing import Any, Dict, List

from loguru import logger

from app.core.milvus_client import milvus_manager
from app.services.vector_embedding_service import vector_embedding_service


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
    """向量检索服务 - 负责从 Milvus 中搜索相似向量"""

    def __init__(self):
        """初始化向量检索服务"""
        logger.info("向量检索服务初始化完成")

    def search_similar_documents(
        self,
        query: str,
        top_k: int = 3,
        knowledge_base_ids: list[str] | None = None,
    ) -> List[SearchResult]:
        """
        搜索相似文档

        Args:
            query: 查询文本
            top_k: 返回最相似的K个结果

        Returns:
            List[SearchResult]: 搜索结果列表

        Raises:
            RuntimeError: 搜索失败时抛出
        """
        try:
            logger.info(f"开始搜索相似文档, 查询: {query}, topK: {top_k}")

            # 1. 将查询文本向量化
            query_vector = vector_embedding_service.embed_query(query)
            logger.debug(f"查询向量生成成功, 维度: {len(query_vector)}")

            # 2. 获取 MilvusClient 并执行搜索
            milvus_manager.connect()

            # 3. 构建搜索参数
            search_params = {
                "metric_type": "L2",  # 欧氏距离
                "params": {"nprobe": 10},
            }

            # 4. 执行搜索
            expr = None
            if knowledge_base_ids:
                quoted = ", ".join(json.dumps(item, ensure_ascii=False) for item in knowledge_base_ids if item)
                expr = f"knowledge_base_id in [{quoted}]" if quoted else None

            results = milvus_manager.search(
                data=[query_vector],
                limit=top_k,
                filter_expr=expr,
                search_params=search_params,
                anns_field="vector",
                output_fields=[
                    "id",
                    "chunk_id",
                    "document_id",
                    "knowledge_base_id",
                    "content",
                    "section_path",
                    "file_name",
                    "metadata",
                ],
            )

            # 5. 解析搜索结果
            search_results = []
            for hits in results:
                for hit in hits:
                    entity = hit.get("entity", {}) or {}
                    result = SearchResult(
                        id=entity.get("id") or hit.get("id"),
                        content=entity.get("content", ""),
                        score=float(hit.get("distance", 0.0)),
                        metadata={
                            **(entity.get("metadata", {}) or {}),
                            "id": entity.get("id") or hit.get("id"),
                            "chunk_id": entity.get("chunk_id") or entity.get("id") or hit.get("id"),
                            "document_id": entity.get("document_id"),
                            "knowledge_base_id": entity.get("knowledge_base_id"),
                            "file_name": entity.get("file_name"),
                            "section_path": entity.get("section_path"),
                            "raw_score": float(hit.get("distance", 0.0)),
                            "normalized_score": 1.0 / (1.0 + max(float(hit.get("distance", 0.0)), 0.0)),
                            "retrieval_source": "milvus",
                        },
                    )
                    search_results.append(result)

            logger.info(f"搜索完成, 找到 {len(search_results)} 个相似文档")
            return search_results

        except Exception as e:
            logger.error(f"搜索相似文档失败: {e}")
            raise RuntimeError(f"搜索失败: {e}") from e


# 全局单例
vector_search_service = VectorSearchService()
