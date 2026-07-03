"""Milvus 客户端工厂模块。"""

from __future__ import annotations

from typing import Any

from loguru import logger
from pymilvus import DataType, MilvusClient, MilvusException

from app.config import config


class MilvusClientManager:
    """Milvus 客户端管理器。"""

    COLLECTION_NAME: str = "biz"
    VECTOR_DIM: int = 1024
    ID_MAX_LENGTH: int = 100
    CONTENT_MAX_LENGTH: int = 8000
    SECTION_PATH_MAX_LENGTH: int = 500
    FILE_NAME_MAX_LENGTH: int = 300
    CHUNK_ID_MAX_LENGTH: int = 120
    DOC_ID_MAX_LENGTH: int = 120
    KB_ID_MAX_LENGTH: int = 120

    def __init__(self) -> None:
        self._client: MilvusClient | None = None

    def connect(self) -> MilvusClient:
        """连接到 Milvus 并确保 collection 可用。"""
        if self._client is not None:
            logger.debug("Milvus 已连接，跳过重复 connect")
            return self._client

        try:
            logger.info(f"正在连接到 Milvus: {config.milvus_host}:{config.milvus_port}")
            uri = f"http://{config.milvus_host}:{config.milvus_port}"
            self._client = MilvusClient(uri=uri)
            logger.info("成功连接到 Milvus")

            if not self._client.has_collection(self.COLLECTION_NAME):
                logger.info(f"collection '{self.COLLECTION_NAME}' 不存在，正在创建...")
                self._create_collection()
                logger.info(f"成功创建 collection '{self.COLLECTION_NAME}'")
            else:
                logger.info(f"collection '{self.COLLECTION_NAME}' 已存在")
                schema_info = self._client.describe_collection(self.COLLECTION_NAME)
                if not self._is_schema_compatible(schema_info):
                    logger.warning(
                        f"检测到 collection '{self.COLLECTION_NAME}' schema 与当前 RAG 结构不兼容，准备重建"
                    )
                    self._client.drop_collection(self.COLLECTION_NAME)
                    self._create_collection()
                    logger.info(f"已重建 collection '{self.COLLECTION_NAME}' 以匹配当前 schema")

            self._load_collection()
            return self._client
        except MilvusException as exc:
            logger.error(f"Milvus 操作失败: {exc}")
            self.close()
            raise RuntimeError(f"Milvus 操作失败: {exc}") from exc
        except ConnectionError as exc:
            logger.error(f"连接 Milvus 失败: {exc}")
            self.close()
            raise RuntimeError(f"连接 Milvus 失败: {exc}") from exc
        except Exception as exc:
            logger.error(f"连接 Milvus 失败: {exc}")
            self.close()
            raise RuntimeError(f"连接 Milvus 失败: {exc}") from exc

    def get_client(self) -> MilvusClient:
        """获取 MilvusClient 实例。"""
        if self._client is None:
            return self.connect()
        return self._client

    def insert_rows(self, rows: list[dict[str, Any]]) -> dict[str, Any]:
        """写入多行向量数据。"""
        if not rows:
            return {"insert_count": 0, "ids": []}
        client = self.get_client()
        result = client.insert(collection_name=self.COLLECTION_NAME, data=rows)
        client.flush(self.COLLECTION_NAME)
        return result

    def search(
        self,
        data: list[list[float]],
        limit: int,
        output_fields: list[str] | None = None,
        filter_expr: str | None = None,
        search_params: dict[str, Any] | None = None,
        anns_field: str = "vector",
    ) -> list[list[dict[str, Any]]]:
        """执行向量搜索。"""
        client = self.get_client()
        return client.search(
            collection_name=self.COLLECTION_NAME,
            data=data,
            filter=filter_expr or "",
            limit=limit,
            output_fields=output_fields,
            search_params=search_params,
            anns_field=anns_field,
        )

    def delete(self, filter_expr: str | None = None, ids: list[str] | None = None) -> int:
        """删除向量数据。"""
        client = self.get_client()
        result = client.delete(
            collection_name=self.COLLECTION_NAME,
            ids=ids,
            filter=filter_expr,
        )
        client.flush(self.COLLECTION_NAME)
        return int(result.get("delete_count", 0) or 0)

    def query(
        self,
        filter_expr: str = "",
        output_fields: list[str] | None = None,
        ids: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """查询 collection 中的标量字段。"""
        client = self.get_client()
        return client.query(
            collection_name=self.COLLECTION_NAME,
            filter=filter_expr,
            output_fields=output_fields,
            ids=ids,
        )

    def _create_collection(self) -> None:
        client = self.get_client()
        schema = client.create_schema(auto_id=False, enable_dynamic_field=False)
        schema.add_field("id", DataType.VARCHAR, max_length=self.ID_MAX_LENGTH, is_primary=True)
        schema.add_field("vector", DataType.FLOAT_VECTOR, dim=self.VECTOR_DIM)
        schema.add_field("chunk_id", DataType.VARCHAR, max_length=self.CHUNK_ID_MAX_LENGTH)
        schema.add_field("document_id", DataType.VARCHAR, max_length=self.DOC_ID_MAX_LENGTH)
        schema.add_field("knowledge_base_id", DataType.VARCHAR, max_length=self.KB_ID_MAX_LENGTH)
        schema.add_field("content", DataType.VARCHAR, max_length=self.CONTENT_MAX_LENGTH)
        schema.add_field("section_path", DataType.VARCHAR, max_length=self.SECTION_PATH_MAX_LENGTH)
        schema.add_field("file_name", DataType.VARCHAR, max_length=self.FILE_NAME_MAX_LENGTH)
        schema.add_field("metadata", DataType.JSON)

        index_params = client.prepare_index_params()
        index_params.add_index(
            field_name="vector",
            index_type="IVF_FLAT",
            metric_type="L2",
            params={"nlist": 128},
        )

        client.create_collection(
            collection_name=self.COLLECTION_NAME,
            schema=schema,
            index_params=index_params,
        )

    def _is_schema_compatible(self, schema_info: dict[str, Any]) -> bool:
        expected_fields = {
            "id": (DataType.VARCHAR, {"max_length": self.ID_MAX_LENGTH}),
            "chunk_id": (DataType.VARCHAR, {"max_length": self.CHUNK_ID_MAX_LENGTH}),
            "document_id": (DataType.VARCHAR, {"max_length": self.DOC_ID_MAX_LENGTH}),
            "knowledge_base_id": (DataType.VARCHAR, {"max_length": self.KB_ID_MAX_LENGTH}),
            "content": (DataType.VARCHAR, {"max_length": self.CONTENT_MAX_LENGTH}),
            "section_path": (DataType.VARCHAR, {"max_length": self.SECTION_PATH_MAX_LENGTH}),
            "file_name": (DataType.VARCHAR, {"max_length": self.FILE_NAME_MAX_LENGTH}),
            "metadata": (DataType.JSON, {}),
            "vector": (DataType.FLOAT_VECTOR, {"dim": self.VECTOR_DIM}),
        }
        fields = {field["name"]: field for field in schema_info.get("fields", [])}
        if set(expected_fields) - set(fields):
            return False
        for field_name, (dtype, expected_params) in expected_fields.items():
            field = fields[field_name]
            if field.get("type") != dtype:
                return False
            params = field.get("params") or {}
            for key, value in expected_params.items():
                if params.get(key) != value:
                    return False
        return True

    def _load_collection(self) -> None:
        client = self.get_client()
        load_state = client.get_load_state(self.COLLECTION_NAME)
        state_name = getattr(load_state.get("state"), "name", str(load_state.get("state")))
        if state_name != "Loaded":
            client.load_collection(self.COLLECTION_NAME)
            logger.info(f"成功加载 collection '{self.COLLECTION_NAME}'")
        else:
            logger.info(f"Collection '{self.COLLECTION_NAME}' 已加载")

    def health_check(self) -> bool:
        """健康检查。"""
        try:
            client = self.get_client()
            if not client.has_collection(self.COLLECTION_NAME):
                return False
            _ = client.get_load_state(self.COLLECTION_NAME)
            return True
        except (MilvusException, ConnectionError) as exc:
            logger.error(f"Milvus 健康检查失败: {exc}")
            return False
        except Exception as exc:
            logger.error(f"Milvus 健康检查失败: {exc}")
            return False

    def close(self) -> None:
        """关闭连接。"""
        errors = []
        try:
            if self._client is not None:
                try:
                    self._client.release_collection(self.COLLECTION_NAME)
                except Exception:
                    pass
                self._client.close()
        except Exception as exc:
            errors.append(f"关闭 MilvusClient 失败: {exc}")
        self._client = None

        if errors:
            logger.error(f"关闭 Milvus 连接时出现错误: {'; '.join(errors)}")
        else:
            logger.info("已关闭 Milvus 连接")

    def __enter__(self) -> "MilvusClientManager":
        _ = self.connect()
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: object,
    ) -> None:
        self.close()


milvus_manager = MilvusClientManager()
