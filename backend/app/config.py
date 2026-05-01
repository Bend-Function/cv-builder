from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CV_BUILDER_", env_file=".env")

    data_dir: Path = Field(default=Path("data"))
    ai_provider: str = Field(default="openai")
    ai_model: str = Field(default="gpt-5.4")
    openai_api_key_env: str = Field(default="OPENAI_API_KEY")
    max_revision_loops: int = Field(default=2, ge=0, le=5)
    default_mode: str = Field(default="assisted")
    gap_questions_enabled: bool = Field(default=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
