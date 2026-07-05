"""Knowledge-management catalog proxy for selectable knowledge bases."""

from typing import Any

import httpx

from app.config import config


class KmCatalogService:
    async def list_selectable(self, user_id: str) -> list[dict]:
        headers = {
            "X-Internal-Token": config.km_internal_token,
        }
        if user_id:
            headers["X-User-Id"] = str(user_id)

        try:
            async with httpx.AsyncClient(timeout=config.retrieval_request_timeout) as client:
                response = await client.get(config.km_catalog_url, headers=headers)
                response.raise_for_status()
                body = response.json()
        except httpx.TimeoutException as exc:
            raise RuntimeError("调用知识管理目录失败：请求超时") from exc
        except httpx.HTTPStatusError as exc:
            status_code = exc.response.status_code
            detail = self._extract_error_message(exc.response)
            if status_code == 401:
                raise RuntimeError("调用知识管理目录失败：内部认证未通过（401）") from exc
            if status_code >= 500:
                raise RuntimeError(f"调用知识管理目录失败：知识管理服务异常（{status_code}）：{detail}") from exc
            raise RuntimeError(f"调用知识管理目录失败：HTTP {status_code}：{detail}") from exc
        except httpx.HTTPError as exc:
            raise RuntimeError(f"调用知识管理目录失败：{exc}") from exc

        code = body.get("code") if isinstance(body, dict) else None
        data = body.get("data") if isinstance(body, dict) else None
        if code not in (0, 200):
            message = body.get("message") if isinstance(body, dict) else "响应格式不合法"
            raise RuntimeError(f"调用知识管理目录失败：{message}")
        if not isinstance(data, list):
            raise RuntimeError("调用知识管理目录失败：返回数据格式不合法")

        items: list[dict] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            kb_id = item.get("id")
            if kb_id is None:
                continue
            items.append(
                {
                    "id": str(kb_id),
                    "name": str(item.get("name") or ""),
                    "description": str(item.get("description") or ""),
                    "document_type": str(item.get("documentType") or item.get("document_type") or ""),
                    "document_count": self._to_int(item.get("documentCount") or item.get("document_count")),
                    "ready_document_count": self._to_int(
                        item.get("readyDocumentCount") or item.get("ready_document_count")
                    ),
                    "enabled": bool(item.get("enabled", True)),
                }
            )
        return items

    async def validate_scope(
        self,
        user_id: str,
        knowledge_base_ids: list[str],
    ) -> list[str]:
        normalized = self._normalize_ids(knowledge_base_ids)
        if not normalized:
            return []

        selectable = await self.list_selectable(user_id)
        selectable_map = {str(item["id"]): item for item in selectable}

        invalid_ids = [kb_id for kb_id in normalized if kb_id not in selectable_map]
        if invalid_ids:
            raise ValueError("存在非法知识库 ID：" + ", ".join(invalid_ids))

        disabled_ids = [kb_id for kb_id in normalized if not selectable_map[kb_id].get("enabled", True)]
        if disabled_ids:
            raise ValueError("存在不可检索的知识库：" + ", ".join(disabled_ids))

        return normalized

    def _normalize_ids(self, knowledge_base_ids: list[str] | None) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for item in knowledge_base_ids or []:
            value = str(item or "").strip()
            if not value or value in seen:
                continue
            seen.add(value)
            normalized.append(value)
        return normalized

    def _extract_error_message(self, response: httpx.Response) -> str:
        try:
            body = response.json()
        except ValueError:
            text = response.text.strip()
            return text or response.reason_phrase or "未知错误"

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

    def _to_int(self, value: Any) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return 0
