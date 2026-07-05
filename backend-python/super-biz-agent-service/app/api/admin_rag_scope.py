"""Admin APIs for formal knowledge-base scope and RAG settings."""

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.permissions import require_login
from app.config import config
from app.db.session import get_db
from app.models.orm.user import User
from app.services.km_catalog_service import KmCatalogService
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/admin/rag")


class KnowledgeScopeUpdateRequest(BaseModel):
    knowledge_base_ids: list[str] = Field(default_factory=list)


def _normalize_scope_ids(value) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    for item in value or []:
        kb_id = str(item or "").strip()
        if not kb_id or kb_id in seen:
            continue
        seen.add(kb_id)
        normalized.append(kb_id)
    return normalized


@router.get("/knowledge-bases")
async def list_knowledge_bases(user: User = Depends(require_login)):
    try:
        items = await KmCatalogService().list_selectable(str(user.id))
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {
        "code": 200,
        "message": "success",
        "data": {
            "items": items,
            "console_url": config.km_console_url,
        },
    }


@router.get("/knowledge-scope")
def get_knowledge_scope(user: User = Depends(require_login), db: Session = Depends(get_db)):
    settings = SettingsService(db)
    settings.initialize_defaults()
    return {
        "code": 200,
        "message": "success",
        "data": {
            "knowledge_base_ids": _normalize_scope_ids(
                settings.get("rag.km_default_knowledge_base_ids", [])
            ),
            "console_url": config.km_console_url,
        },
    }


@router.put("/knowledge-scope")
async def update_knowledge_scope(
    request: KnowledgeScopeUpdateRequest,
    user: User = Depends(require_login),
    db: Session = Depends(get_db),
):
    service = SettingsService(db)
    service.initialize_defaults()
    try:
        knowledge_base_ids = await KmCatalogService().validate_scope(
            str(user.id),
            request.knowledge_base_ids,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    service.update("rag.km_default_knowledge_base_ids", knowledge_base_ids, str(user.id))
    return {
        "code": 200,
        "message": "success",
        "data": {
            "knowledge_base_ids": knowledge_base_ids,
            "console_url": config.km_console_url,
        },
    }
