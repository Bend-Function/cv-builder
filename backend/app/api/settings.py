from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.config import Settings
from app.services.settings_storage import SettingsStorage

router = APIRouter(prefix="/api/settings", tags=["settings"])


class EditableSettings(BaseModel):
    ai_model: str = "gpt-5.4"
    default_mode: Literal["assisted", "auto"] = "assisted"
    gap_questions_enabled: bool = True
    max_revision_loops: int = Field(default=2, ge=0, le=5)


class SettingsResponse(EditableSettings):
    ai_provider: str = "openai"
    data_dir: str = ""
    openai_api_key_env: str = "OPENAI_API_KEY"


def _build_response(editable: dict, config: Settings) -> SettingsResponse:
    return SettingsResponse(
        ai_model=editable.get("ai_model", config.ai_model),
        default_mode=editable.get("default_mode", config.default_mode),
        gap_questions_enabled=editable.get("gap_questions_enabled", config.gap_questions_enabled),
        max_revision_loops=editable.get("max_revision_loops", config.max_revision_loops),
        ai_provider=config.ai_provider,
        data_dir=str(config.data_dir),
        openai_api_key_env=config.openai_api_key_env,
    )


def _storage(request: Request) -> SettingsStorage:
    config: Settings = request.app.state.settings
    return SettingsStorage(config.data_dir)


@router.get("")
def get_settings(request: Request) -> SettingsResponse:
    config: Settings = request.app.state.settings
    storage = _storage(request)
    editable = storage.load(config)
    return _build_response(editable, config)


@router.put("")
def put_settings(payload: EditableSettings, request: Request) -> SettingsResponse:
    config: Settings = request.app.state.settings
    storage = _storage(request)
    saved = storage.save(payload.model_dump())
    return _build_response(saved, config)
