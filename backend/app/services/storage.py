import json
import os
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

from app.models.master_cv import MasterCv

ModelT = TypeVar("ModelT", bound=BaseModel)


class JsonStorage:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)

    @property
    def master_cv_path(self) -> Path:
        return self.data_dir / "master_cv.json"

    def load_master_cv(self) -> MasterCv:
        if not self.master_cv_path.exists():
            cv = MasterCv()
            self.save_master_cv(cv)
            return cv
        return self._load_model(self.master_cv_path, MasterCv)

    def save_master_cv(self, cv: MasterCv) -> None:
        self._atomic_write(self.master_cv_path, cv.model_dump(mode="json"))

    @property
    def applications_dir(self) -> Path:
        return self.data_dir / "applications"

    def application_dir(self, application_id: str) -> Path:
        return self.applications_dir / application_id

    def save_application_run(self, run: "ApplicationRun") -> None:
        from app.models.application import ApplicationRun
        run_dir = self.application_dir(run.application_id)
        self._atomic_write(run_dir / "input.json", run.model_dump(mode="json"))

    def load_application_run(self, application_id: str) -> "ApplicationRun":
        from app.models.application import ApplicationRun
        return self._load_model(self.application_dir(application_id) / "input.json", ApplicationRun)

    def list_application_runs(self) -> list["ApplicationRun"]:
        from app.models.application import ApplicationRun
        if not self.applications_dir.exists():
            return []
        runs = []
        for input_path in sorted(self.applications_dir.glob("*/input.json")):
            runs.append(self._load_model(input_path, ApplicationRun))
        return runs

    def _load_model(self, path: Path, model_type: type[ModelT]) -> ModelT:
        with path.open("r", encoding="utf-8") as file:
            payload = json.load(file)
        return model_type.model_validate(payload)

    def _atomic_write(self, path: Path, payload: dict) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = path.with_suffix(path.suffix + ".tmp")
        with temp_path.open("w", encoding="utf-8") as file:
            json.dump(payload, file, ensure_ascii=False, indent=2)
            file.write("\n")
        os.replace(temp_path, path)
