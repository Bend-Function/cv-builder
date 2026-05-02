import json
import os
import tempfile
from pathlib import Path

from app.config import Settings

EDITABLE_FIELDS = ("ai_model", "default_mode", "gap_questions_enabled", "max_revision_loops")


class SettingsStorage:
    def __init__(self, data_dir: Path) -> None:
        self._path = Path(data_dir) / "settings.json"

    def load(self, defaults: Settings) -> dict:
        if not self._path.exists():
            return {
                "ai_model": defaults.ai_model,
                "default_mode": defaults.default_mode,
                "gap_questions_enabled": defaults.gap_questions_enabled,
                "max_revision_loops": defaults.max_revision_loops,
            }
        with open(self._path, encoding="utf-8") as fh:
            stored = json.load(fh)
        return {
            "ai_model": stored.get("ai_model", defaults.ai_model),
            "default_mode": stored.get("default_mode", defaults.default_mode),
            "gap_questions_enabled": stored.get("gap_questions_enabled", defaults.gap_questions_enabled),
            "max_revision_loops": stored.get("max_revision_loops", defaults.max_revision_loops),
        }

    def save(self, payload: dict) -> dict:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        filtered = {key: payload[key] for key in EDITABLE_FIELDS if key in payload}
        fd, tmp_name = tempfile.mkstemp(prefix="settings.", suffix=".json.tmp", dir=self._path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as fh:
                json.dump(filtered, fh, indent=2)
            os.replace(tmp_name, self._path)
        except Exception:
            try:
                os.unlink(tmp_name)
            except OSError:
                pass
            raise
        return filtered
