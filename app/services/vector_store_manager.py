"""向量存储管理器 - 基于 MilvusClient 封装检索与写入。"""

from __future__ import annotations

from typing import List

from langchain_core.documents import Document
from loguru import logger

from app.core.milvus_client import milvus_manager
from app.services.vector_embedding_service import vector_embedding_service


class _SimpleRetriever:
    def __init__(self, manager: "VectorStoreManager", k: int):
        self.manager = manager
        self.k = k

    def invoke(self, query: str) -> List[Document]:
        return self.manager.similarity_search(query, k=self.k)


class _SimpleVectorStoreFacade:
    def __init__(self, manager: "VectorStoreManager"):
        self.manager = manager

    def as_retriever(self, search_kwargs: dict | None = None) -> _SimpleRetriever:
        search_kwargs = search_kwargs or {}
        return _SimpleRetriever(self.manager, int(search_kwargs.get("k", 3)))


class VectorStoreManager:
    """向量存储管理器。"""

    def __init__(self):
        self.collection_name = milvus_manager.COLLECTION_NAME

    def _ensure_connected(self) -> None:
        milvus_manager.connect()

    def add_documents(self, documents: List[Document]) -> List[str]:
        """批量添加文档到 Milvus。"""
        try:
            self._ensure_connected()
            import time
            import uuid

            start_time = time.time()
            ids = [str(uuid.uuid4()) for _ in documents]
            embeddings = vector_embedding_service.embed_documents([doc.page_content for doc in documents])
            payload = []

            for doc, vector, doc_id in zip(documents, embeddings, ids, strict=False):
                metadata = doc.metadata or {}
                payload.append(
                    {
                        "id": doc_id,
                        "chunk_id": metadata.get("chunk_id") or doc_id,
                        "document_id": metadata.get("document_id") or "",
                        "knowledge_base_id": metadata.get("knowledge_base_id") or "",
                        "content": doc.page_content,
                        "section_path": metadata.get("section_path") or "全文",
                        "file_name": metadata.get("_file_name") or metadata.get("file_name") or "",
                        "metadata": metadata,
                        "vector": vector,
                    }
                )

            milvus_manager.insert_rows(payload)
            elapsed = time.time() - start_time
            logger.info(
                f"批量添加 {len(documents)} 个文档到 Milvus 完成, "
                f"耗时: {elapsed:.2f}秒, 平均: {elapsed/len(documents):.2f}秒/个"
            )
            return ids
        except Exception as e:
            logger.error(f"添加文档失败: {e}")
            raise

    def delete_by_source(self, file_path: str) -> int:
        """删除指定来源文件的所有文档。"""
        try:
            self._ensure_connected()
            expr = f'metadata["_source"] == "{file_path}"'
            deleted_count = milvus_manager.delete(filter_expr=expr)
            logger.info(f"删除文件旧数据: {file_path}, 删除数量: {deleted_count}")
            return deleted_count
        except Exception as e:
            logger.warning(f"删除旧数据失败 (可能是首次索引): {e}")
            return 0

    def get_vector_store(self) -> _SimpleVectorStoreFacade:
        """返回兼容旧调用方式的轻量 facade。"""
        self._ensure_connected()
        return _SimpleVectorStoreFacade(self)

    def similarity_search(self, query: str, k: int = 3) -> List[Document]:
        """相似度搜索。"""
        try:
            self._ensure_connected()
            query_vector = vector_embedding_service.embed_query(query)
            rows = milvus_manager.search(
                data=[query_vector],
                limit=k,
                search_params={"metric_type": "L2", "params": {"nprobe": 10}},
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
            docs: List[Document] = []
            for hits in rows:
                for hit in hits:
                    entity = hit.get("entity", {}) or {}
                    metadata = dict(entity.get("metadata", {}) or {})
                    metadata.setdefault("_file_name", entity.get("file_name", ""))
                    metadata.setdefault("file_name", entity.get("file_name", ""))
                    metadata.setdefault("section_path", entity.get("section_path", ""))
                    metadata.setdefault("chunk_id", entity.get("chunk_id") or entity.get("id") or hit.get("id"))
                    metadata.setdefault("document_id", entity.get("document_id", ""))
                    metadata.setdefault("knowledge_base_id", entity.get("knowledge_base_id", ""))
                    metadata["score"] = float(hit.get("distance", 0.0))
                    docs.append(Document(page_content=entity.get("content", ""), metadata=metadata))
            logger.debug(f"相似度搜索完成: query='{query}', 结果数={len(docs)}")
            return docs
        except Exception as e:
            logger.error(f"相似度搜索失败: {e}")
            return []


vector_store_manager = VectorStoreManager()
