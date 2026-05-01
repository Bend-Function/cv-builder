# CV Builder MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local single-user CV Builder MVP that stores a master CV as JSON, ingests JDs from text/file/url/fixtures, runs an OpenAI `gpt-5.4` LangGraph workflow, generates structured ATS/portfolio/cover-letter documents, reviews them, and exports PDFs.

**Architecture:** Implement a FastAPI backend with focused service modules for storage, JD ingestion, AI workflow, review, and PDF rendering. Add a React + Ant Design frontend that edits the master CV, creates application runs, chooses assisted/auto mode, displays generated documents, and triggers exports. Keep provider-specific OpenAI calls isolated behind an AI client so LangGraph nodes exchange typed Pydantic models.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, pytest, LangChain/LangGraph, OpenAI-compatible client via `langchain-openai` or OpenAI SDK, Playwright/Chromium PDF rendering, React, TypeScript, Vite, Ant Design, Vitest.

---

## File Structure

### Backend

- `backend/pyproject.toml` — backend dependencies and test configuration.
- `backend/app/main.py` — FastAPI app factory and router registration.
- `backend/app/config.py` — local settings, data directory, model name, API key env names.
- `backend/app/models/master_cv.py` — Pydantic master CV schema with structured fields and narrative text.
- `backend/app/models/application.py` — Pydantic application run, JD input, analysis, positioning, gap questions, exports.
- `backend/app/models/documents.py` — structured ATS CV, portfolio CV, and cover letter document schemas.
- `backend/app/models/review.py` — review rubric result schema.
- `backend/app/services/storage.py` — atomic JSON load/save and application-run directory management.
- `backend/app/services/jd_ingestion.py` — JD ingestion from text, local file, URL, and SEEK fixture JSON.
- `backend/app/services/pdf_renderer.py` — HTML template rendering and Playwright PDF export.
- `backend/app/ai/client.py` — OpenAI `gpt-5.4` structured generation boundary.
- `backend/app/ai/state.py` — LangGraph state schema.
- `backend/app/ai/graph.py` — graph assembly and revision-loop routing.
- `backend/app/ai/nodes/*.py` — JD extraction, research, analysis, positioning, gap questions, writer, reviewer, revision nodes.
- `backend/app/api/master_cv.py` — master CV endpoints.
- `backend/app/api/applications.py` — application run and workflow endpoints.
- `backend/app/api/documents.py` — document preview/export endpoints.
- `backend/app/api/settings.py` — local settings and provider health endpoints.
- `backend/app/templates/*.html` — ATS CV, portfolio CV, cover letter HTML templates.
- `backend/app/static/*.css` — PDF print CSS.
- `backend/tests/**` — pytest suite.

### Frontend

- `frontend/package.json` — frontend dependencies and scripts.
- `frontend/src/api/client.ts` — typed fetch wrapper.
- `frontend/src/api/masterCv.ts` — master CV API calls.
- `frontend/src/api/applications.ts` — application workflow API calls.
- `frontend/src/types/masterCv.ts` — TypeScript master CV types matching backend schemas.
- `frontend/src/types/application.ts` — TypeScript application and document types.
- `frontend/src/pages/Dashboard.tsx` — application history and quick actions.
- `frontend/src/pages/MasterCvEditor.tsx` — manual master CV JSON-backed editor.
- `frontend/src/pages/ApplicationWorkspace.tsx` — JD input, assisted/auto mode, analysis/gap/generate flow.
- `frontend/src/pages/GeneratedDocuments.tsx` — document tabs, review output, export links.
- `frontend/src/pages/Settings.tsx` — provider/model/search/PDF settings.
- `frontend/src/components/**` — focused form and display components.
- `frontend/src/App.tsx` — layout and navigation.

---

### Task 1: Backend project scaffold and health endpoint

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/config.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Write the failing health test**

Create `backend/tests/test_health.py`:

```python
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_returns_ok():
    client = TestClient(create_app())

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 2: Add backend dependencies and pytest config**

Create `backend/pyproject.toml`:

```toml
[project]
name = "cv-builder-backend"
version = "0.1.0"
description = "Local single-user CV Builder backend"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115.0",
  "uvicorn[standard]>=0.30.0",
  "pydantic>=2.8.0",
  "pydantic-settings>=2.4.0",
  "python-multipart>=0.0.9",
  "httpx>=0.27.0",
  "beautifulsoup4>=4.12.0",
  "langchain>=0.3.0",
  "langchain-openai>=0.2.0",
  "langgraph>=0.2.0",
  "jinja2>=3.1.0",
  "playwright>=1.46.0"
]

[project.optional-dependencies]
dev = [
  "pytest>=8.3.0",
  "pytest-asyncio>=0.24.0",
  "ruff>=0.6.0",
  "mypy>=1.11.0"
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]
```

- [ ] **Step 3: Implement config and app factory**

Create `backend/app/__init__.py`:

```python
__all__ = ["create_app"]
```

Create `backend/app/config.py`:

```python
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
```

Create `backend/app/main.py`:

```python
from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(title="CV Builder", version="0.1.0")

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
```

- [ ] **Step 4: Run the health test**

Run:

```bash
cd backend && pytest tests/test_health.py -v
```

Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/pyproject.toml backend/app/__init__.py backend/app/main.py backend/app/config.py backend/tests/test_health.py
git commit -m "feat: scaffold FastAPI backend"
```

---

### Task 2: Master CV models and atomic JSON storage

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/master_cv.py`
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/storage.py`
- Create: `backend/tests/test_storage.py`

- [ ] **Step 1: Write failing storage tests**

Create `backend/tests/test_storage.py`:

```python
from pathlib import Path

from app.models.master_cv import MasterCv, Profile, Project, WorkExperience
from app.services.storage import JsonStorage


def test_master_cv_round_trip(tmp_path: Path):
    storage = JsonStorage(tmp_path)
    cv = MasterCv(
        profile=Profile(
            full_name="Alex Chen",
            email="alex@example.com",
            github_url="https://github.com/alexchen",
            linkedin_url="https://linkedin.com/in/alexchen",
        ),
        work_experience=[
            WorkExperience(
                id="work_001",
                company="Fictional AI Studio",
                title="AI Developer Intern",
                narrative="Built retrieval prototypes and evaluation scripts for internal demos.",
            )
        ],
        projects=[
            Project(
                id="project_001",
                name="StudyMate RAG",
                type="academic",
                technologies=["Python", "FastAPI", "PostgreSQL", "pgvector"],
                narrative="Designed a RAG study assistant with document ingestion and cited answers.",
                tier="A",
            )
        ],
    )

    storage.save_master_cv(cv)
    loaded = storage.load_master_cv()

    assert loaded.profile.full_name == "Alex Chen"
    assert loaded.profile.github_url == "https://github.com/alexchen"
    assert loaded.work_experience[0].narrative.startswith("Built retrieval")
    assert loaded.projects[0].tier == "A"


def test_load_master_cv_creates_default_when_missing(tmp_path: Path):
    storage = JsonStorage(tmp_path)

    loaded = storage.load_master_cv()

    assert loaded.profile.full_name == ""
    assert (tmp_path / "master_cv.json").exists()
```

- [ ] **Step 2: Implement Master CV models**

Create `backend/app/models/__init__.py`:

```python
from app.models.master_cv import MasterCv

__all__ = ["MasterCv"]
```

Create `backend/app/models/master_cv.py`:

```python
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class Confidence(BaseModel):
    facts_verified: bool = True
    needs_user_review: list[str] = Field(default_factory=list)


class Link(BaseModel):
    label: str = ""
    url: HttpUrl | str = ""


class Profile(BaseModel):
    full_name: str = ""
    preferred_name: str = ""
    headline: str = ""
    location: str = ""
    phone: str = ""
    email: str = ""
    github_url: HttpUrl | str = ""
    linkedin_url: HttpUrl | str = ""
    portfolio_url: HttpUrl | str = ""
    personal_website_url: HttpUrl | str = ""
    target_roles: list[str] = Field(default_factory=list)
    summary_source: str = ""
    work_authorisation: str = ""
    referees: str = "available_on_request"


class GitHubPresence(BaseModel):
    url: HttpUrl | str = ""
    profile_readme_summary: str = ""
    pinned_projects: list[Link] = Field(default_factory=list)


class LinkedInPresence(BaseModel):
    url: HttpUrl | str = ""
    headline: str = ""
    summary: str = ""


class PortfolioPresence(BaseModel):
    url: HttpUrl | str = ""
    featured_links: list[Link] = Field(default_factory=list)


class OnlinePresence(BaseModel):
    github: GitHubPresence = Field(default_factory=GitHubPresence)
    linkedin: LinkedInPresence = Field(default_factory=LinkedInPresence)
    portfolio: PortfolioPresence = Field(default_factory=PortfolioPresence)
    other_links: list[Link] = Field(default_factory=list)


class Education(BaseModel):
    institution: str = ""
    qualification: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    highlights: list[str] = Field(default_factory=list)


class Skills(BaseModel):
    languages: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    databases: list[str] = Field(default_factory=list)
    cloud_devops: list[str] = Field(default_factory=list)
    ai_data: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)


class Certification(BaseModel):
    name: str = ""
    issuer: str = ""
    date: str = ""
    url: HttpUrl | str = ""


class WorkExperience(BaseModel):
    id: str
    company: str = ""
    title: str = ""
    location: str = ""
    start_date: str = ""
    end_date: str = ""
    employment_type: str = ""
    technologies: list[str] = Field(default_factory=list)
    domains: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    collaboration: list[str] = Field(default_factory=list)
    evidence_links: list[Link] = Field(default_factory=list)
    narrative: str = ""
    confidence: Confidence = Field(default_factory=Confidence)


class Project(BaseModel):
    id: str
    name: str = ""
    type: Literal["commercial", "academic", "personal", "open_source"] | str = "personal"
    status: str = ""
    role: str = ""
    technologies: list[str] = Field(default_factory=list)
    problem: str = ""
    solution: str = ""
    features: list[str] = Field(default_factory=list)
    technical_depth: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    metrics: list[str] = Field(default_factory=list)
    links: list[Link] = Field(default_factory=list)
    tier: Literal["A", "B", "C"] | str = "B"
    narrative: str = ""
    confidence: Confidence = Field(default_factory=Confidence)


class Preferences(BaseModel):
    target_locations: list[str] = Field(default_factory=list)
    target_roles: list[str] = Field(default_factory=list)
    industries: list[str] = Field(default_factory=list)
    default_cv_variant: str = "ats"


class MasterCv(BaseModel):
    profile: Profile = Field(default_factory=Profile)
    online_presence: OnlinePresence = Field(default_factory=OnlinePresence)
    education: list[Education] = Field(default_factory=list)
    skills: Skills = Field(default_factory=Skills)
    certifications: list[Certification] = Field(default_factory=list)
    work_experience: list[WorkExperience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    preferences: Preferences = Field(default_factory=Preferences)
```

- [ ] **Step 3: Implement atomic storage**

Create `backend/app/services/__init__.py`:

```python
__all__: list[str] = []
```

Create `backend/app/services/storage.py`:

```python
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
```

- [ ] **Step 4: Run storage tests**

Run:

```bash
cd backend && pytest tests/test_storage.py -v
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models backend/app/services backend/tests/test_storage.py
git commit -m "feat: add master CV storage"
```

---

### Task 3: Master CV API endpoints

**Files:**
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/master_cv.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_master_cv_api.py`

- [ ] **Step 1: Write failing API tests**

Create `backend/tests/test_master_cv_api.py`:

```python
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_get_master_cv_returns_default(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.get("/api/master-cv")

    assert response.status_code == 200
    assert response.json()["profile"]["full_name"] == ""


def test_put_master_cv_persists_profile_links(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    payload = client.get("/api/master-cv").json()
    payload["profile"]["full_name"] = "Alex Chen"
    payload["profile"]["github_url"] = "https://github.com/alexchen"
    payload["profile"]["linkedin_url"] = "https://linkedin.com/in/alexchen"

    response = client.put("/api/master-cv", json=payload)
    reloaded = client.get("/api/master-cv")

    assert response.status_code == 200
    assert reloaded.json()["profile"]["full_name"] == "Alex Chen"
    assert reloaded.json()["profile"]["github_url"] == "https://github.com/alexchen"
```

- [ ] **Step 2: Implement router**

Create `backend/app/api/__init__.py`:

```python
__all__: list[str] = []
```

Create `backend/app/api/master_cv.py`:

```python
from fastapi import APIRouter, Request

from app.models.master_cv import MasterCv
from app.services.storage import JsonStorage

router = APIRouter(prefix="/api/master-cv", tags=["master-cv"])


def get_storage(request: Request) -> JsonStorage:
    return request.app.state.storage


@router.get("")
def get_master_cv(request: Request) -> MasterCv:
    return get_storage(request).load_master_cv()


@router.put("")
def put_master_cv(cv: MasterCv, request: Request) -> MasterCv:
    get_storage(request).save_master_cv(cv)
    return cv


@router.post("/validate")
def validate_master_cv(cv: MasterCv) -> dict[str, bool]:
    return {"valid": True}
```

- [ ] **Step 3: Register router and injectable settings**

Replace `backend/app/main.py` with:

```python
from fastapi import FastAPI

from app.api import master_cv
from app.config import Settings, get_settings
from app.services.storage import JsonStorage


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    app = FastAPI(title="CV Builder", version="0.1.0")
    app.state.settings = resolved_settings
    app.state.storage = JsonStorage(resolved_settings.data_dir)
    app.include_router(master_cv.router)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
```

- [ ] **Step 4: Run API tests**

Run:

```bash
cd backend && pytest tests/test_master_cv_api.py tests/test_health.py -v
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api backend/app/main.py backend/tests/test_master_cv_api.py
git commit -m "feat: expose master CV API"
```

---

### Task 4: Application models and run storage

**Files:**
- Create: `backend/app/models/application.py`
- Modify: `backend/app/services/storage.py`
- Create: `backend/tests/test_application_storage.py`

- [ ] **Step 1: Write failing application storage tests**

Create `backend/tests/test_application_storage.py`:

```python
from pathlib import Path

from app.models.application import ApplicationRun, JdInput
from app.services.storage import JsonStorage


def test_create_application_run(tmp_path: Path):
    storage = JsonStorage(tmp_path)
    run = ApplicationRun(
        application_id="app_001",
        company="Example Co",
        role_title="Junior AI Developer",
        mode="assisted",
        jd_input=JdInput(type="text", source="manual", extracted_text="We need Python and RAG."),
    )

    storage.save_application_run(run)
    loaded = storage.load_application_run("app_001")

    assert loaded.company == "Example Co"
    assert loaded.jd_input.extracted_text == "We need Python and RAG."
    assert (tmp_path / "applications" / "app_001" / "input.json").exists()


def test_list_application_runs(tmp_path: Path):
    storage = JsonStorage(tmp_path)
    storage.save_application_run(ApplicationRun(application_id="app_001", company="A"))
    storage.save_application_run(ApplicationRun(application_id="app_002", company="B"))

    runs = storage.list_application_runs()

    assert [run.application_id for run in runs] == ["app_001", "app_002"]
```

- [ ] **Step 2: Implement application model**

Create `backend/app/models/application.py`:

```python
from typing import Literal

from pydantic import BaseModel, Field


class JdInput(BaseModel):
    type: Literal["text", "file", "url", "fixture_json"] | str = "text"
    source: str = ""
    extracted_text: str = ""


class ResearchSource(BaseModel):
    title: str = ""
    url: str = ""
    summary: str = ""
    used_for: str = ""


class CompanyResearch(BaseModel):
    company_summary: str = ""
    products_services: list[str] = Field(default_factory=list)
    business_model: str = ""
    industry: str = ""
    likely_team_context: str = ""
    technology_signals: list[str] = Field(default_factory=list)
    sources: list[ResearchSource] = Field(default_factory=list)
    needs_user_confirmation: list[str] = Field(default_factory=list)


class JdAnalysis(BaseModel):
    must_have: list[str] = Field(default_factory=list)
    nice_to_have: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    soft_skills: list[str] = Field(default_factory=list)
    domain_signals: list[str] = Field(default_factory=list)
    seniority_signals: list[str] = Field(default_factory=list)
    keywords_by_priority: dict[str, list[str]] = Field(default_factory=lambda: {"high": [], "medium": [], "low": []})
    ideal_candidate_profile: str = ""
    hiring_manager_priorities: list[str] = Field(default_factory=list)
    risk_factors_for_candidate: list[str] = Field(default_factory=list)
    evidence_needed: list[str] = Field(default_factory=list)


class EvidenceMapItem(BaseModel):
    jd_signal: str = ""
    cv_source_id: str = ""
    evidence_summary: str = ""
    strength: Literal["strong", "medium", "weak", "missing"] | str = "missing"


class CandidatePositioning(BaseModel):
    positioning_statement: str = ""
    selected_work_experience_ids: list[str] = Field(default_factory=list)
    selected_project_ids: list[str] = Field(default_factory=list)
    selected_skills: list[str] = Field(default_factory=list)
    evidence_map: list[EvidenceMapItem] = Field(default_factory=list)
    omit_or_deemphasize: list[str] = Field(default_factory=list)


class GapQuestion(BaseModel):
    question: str = ""
    why_asking: str = ""
    suggested_fields_to_update: list[str] = Field(default_factory=list)
    answer_type: str = "free_text"


class GapAnswer(BaseModel):
    question: str = ""
    answer: str = ""
    save_to_master_cv: bool = False


class ApplicationRun(BaseModel):
    application_id: str
    company: str = ""
    role_title: str = ""
    location: str = ""
    mode: Literal["assisted", "auto"] | str = "assisted"
    jd_input: JdInput = Field(default_factory=JdInput)
    company_research: CompanyResearch = Field(default_factory=CompanyResearch)
    jd_analysis: JdAnalysis = Field(default_factory=JdAnalysis)
    candidate_positioning: CandidatePositioning = Field(default_factory=CandidatePositioning)
    gap_questions: list[GapQuestion] = Field(default_factory=list)
    user_gap_answers: list[GapAnswer] = Field(default_factory=list)
    generated_documents: dict = Field(default_factory=dict)
    review_result: dict = Field(default_factory=dict)
    exports: dict[str, str] = Field(default_factory=dict)
```

- [ ] **Step 3: Extend storage for application runs**

Add these imports to `backend/app/services/storage.py`:

```python
from app.models.application import ApplicationRun
```

Add these methods to `JsonStorage`:

```python
    @property
    def applications_dir(self) -> Path:
        return self.data_dir / "applications"

    def application_dir(self, application_id: str) -> Path:
        return self.applications_dir / application_id

    def save_application_run(self, run: ApplicationRun) -> None:
        run_dir = self.application_dir(run.application_id)
        self._atomic_write(run_dir / "input.json", run.model_dump(mode="json"))

    def load_application_run(self, application_id: str) -> ApplicationRun:
        return self._load_model(self.application_dir(application_id) / "input.json", ApplicationRun)

    def list_application_runs(self) -> list[ApplicationRun]:
        if not self.applications_dir.exists():
            return []
        runs = []
        for input_path in sorted(self.applications_dir.glob("*/input.json")):
            runs.append(self._load_model(input_path, ApplicationRun))
        return runs
```

- [ ] **Step 4: Run application storage tests**

Run:

```bash
cd backend && pytest tests/test_application_storage.py tests/test_storage.py -v
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/application.py backend/app/services/storage.py backend/tests/test_application_storage.py
git commit -m "feat: store application runs"
```

---

### Task 5: JD ingestion for text and SEEK fixtures

**Files:**
- Create: `backend/app/services/jd_ingestion.py`
- Create: `backend/tests/test_jd_ingestion.py`

- [ ] **Step 1: Write failing JD ingestion tests**

Create `backend/tests/test_jd_ingestion.py`:

```python
import json
from pathlib import Path

from app.services.jd_ingestion import JdIngestionService


def test_ingest_text_jd():
    service = JdIngestionService()

    result = service.from_text("We need Python, FastAPI, RAG experience.")

    assert result.type == "text"
    assert result.source == "manual"
    assert "FastAPI" in result.extracted_text


def test_ingest_seek_fixture(tmp_path: Path):
    fixture = {
        "job": {
            "title": "Junior AI Developer",
            "company": "Example Co",
            "location": "Auckland",
            "skills": ["Python", "RAG"],
            "responsibilities": ["Build APIs"],
            "requirements": ["FastAPI"]
        },
        "raw": {"bodyText": "Full JD body mentioning vector search."}
    }
    fixture_path = tmp_path / "seek-job.json"
    fixture_path.write_text(json.dumps(fixture), encoding="utf-8")
    service = JdIngestionService()

    result = service.from_fixture_json(fixture_path)

    assert result.type == "fixture_json"
    assert result.source == str(fixture_path)
    assert "Junior AI Developer" in result.extracted_text
    assert "vector search" in result.extracted_text
```

- [ ] **Step 2: Implement JD ingestion service**

Create `backend/app/services/jd_ingestion.py`:

```python
import json
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

from app.models.application import JdInput


class JdIngestionService:
    def from_text(self, text: str) -> JdInput:
        return JdInput(type="text", source="manual", extracted_text=text.strip())

    def from_file(self, path: Path) -> JdInput:
        text = path.read_text(encoding="utf-8").strip()
        return JdInput(type="file", source=str(path), extracted_text=text)

    def from_url(self, url: str) -> JdInput:
        response = httpx.get(url, timeout=20.0)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        for element in soup(["script", "style", "noscript"]):
            element.decompose()
        text = " ".join(soup.get_text(" ").split())
        return JdInput(type="url", source=url, extracted_text=text)

    def from_fixture_json(self, path: Path) -> JdInput:
        payload = json.loads(path.read_text(encoding="utf-8"))
        job = payload.get("job", {})
        raw = payload.get("raw", {})
        parts = [
            job.get("title", ""),
            job.get("company", ""),
            job.get("location", ""),
            "Skills: " + ", ".join(job.get("skills", [])),
            "Responsibilities: " + " ".join(job.get("responsibilities", [])),
            "Requirements: " + " ".join(job.get("requirements", [])),
            raw.get("bodyText", ""),
        ]
        extracted_text = "\n".join(part for part in parts if part).strip()
        return JdInput(type="fixture_json", source=str(path), extracted_text=extracted_text)
```

- [ ] **Step 3: Run JD ingestion tests**

Run:

```bash
cd backend && pytest tests/test_jd_ingestion.py -v
```

Expected: `2 passed`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/jd_ingestion.py backend/tests/test_jd_ingestion.py
git commit -m "feat: ingest JD inputs"
```

---

### Task 6: Application API for creating runs and ingesting JDs

**Files:**
- Create: `backend/app/api/applications.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_applications_api.py`

- [ ] **Step 1: Write failing applications API tests**

Create `backend/tests/test_applications_api.py`:

```python
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_create_application_from_text(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.post(
        "/api/applications",
        json={
            "company": "Example Co",
            "role_title": "Junior AI Developer",
            "mode": "assisted",
            "jd_text": "We need Python and RAG."
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["application_id"].startswith("app_")
    assert payload["company"] == "Example Co"
    assert payload["jd_input"]["extracted_text"] == "We need Python and RAG."


def test_list_applications(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    client.post("/api/applications", json={"company": "A", "role_title": "Developer", "jd_text": "Python"})

    response = client.get("/api/applications")

    assert response.status_code == 200
    assert response.json()[0]["company"] == "A"
```

- [ ] **Step 2: Implement applications router**

Create `backend/app/api/applications.py`:

```python
from datetime import UTC, datetime

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.models.application import ApplicationRun
from app.services.jd_ingestion import JdIngestionService
from app.services.storage import JsonStorage

router = APIRouter(prefix="/api/applications", tags=["applications"])


class CreateApplicationRequest(BaseModel):
    company: str = ""
    role_title: str = ""
    location: str = ""
    mode: str = "assisted"
    jd_text: str = ""


def get_storage(request: Request) -> JsonStorage:
    return request.app.state.storage


@router.post("")
def create_application(payload: CreateApplicationRequest, request: Request) -> ApplicationRun:
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S%f")
    jd_input = JdIngestionService().from_text(payload.jd_text)
    run = ApplicationRun(
        application_id=f"app_{timestamp}",
        company=payload.company,
        role_title=payload.role_title,
        location=payload.location,
        mode=payload.mode,
        jd_input=jd_input,
    )
    get_storage(request).save_application_run(run)
    return run


@router.get("")
def list_applications(request: Request) -> list[ApplicationRun]:
    return get_storage(request).list_application_runs()


@router.get("/{application_id}")
def get_application(application_id: str, request: Request) -> ApplicationRun:
    return get_storage(request).load_application_run(application_id)
```

- [ ] **Step 3: Register applications router**

Modify `backend/app/main.py` imports:

```python
from app.api import applications, master_cv
```

Add router registration after master CV:

```python
    app.include_router(master_cv.router)
    app.include_router(applications.router)
```

- [ ] **Step 4: Run applications API tests**

Run:

```bash
cd backend && pytest tests/test_applications_api.py -v
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/applications.py backend/app/main.py backend/tests/test_applications_api.py
git commit -m "feat: create application runs"
```

---

### Task 7: Document and review schemas

**Files:**
- Create: `backend/app/models/documents.py`
- Create: `backend/app/models/review.py`
- Create: `backend/tests/test_document_models.py`

- [ ] **Step 1: Write failing schema tests**

Create `backend/tests/test_document_models.py`:

```python
from app.models.documents import ApplicationDocuments, CvDocument, DocumentSection
from app.models.review import ReviewResult


def test_application_documents_include_three_outputs():
    docs = ApplicationDocuments(
        ats_cv=CvDocument(title="ATS CV", sections=[DocumentSection(heading="Summary", items=["Python developer"])]),
        portfolio_cv=CvDocument(title="Portfolio CV"),
        cover_letter="Dear hiring team,\n\nI am interested in this role.",
    )

    assert docs.ats_cv.sections[0].heading == "Summary"
    assert docs.cover_letter.startswith("Dear hiring team")


def test_review_result_defaults_blocking_lists():
    review = ReviewResult(passed=False, overall_score=62)

    assert review.scores.truthfulness == 0
    assert review.blocking_issues == []
```

- [ ] **Step 2: Implement document schemas**

Create `backend/app/models/documents.py`:

```python
from pydantic import BaseModel, Field


class SourceTrace(BaseModel):
    claim: str = ""
    source_id: str = ""
    source_type: str = "master_cv"


class DocumentSection(BaseModel):
    heading: str = ""
    items: list[str] = Field(default_factory=list)


class CvDocument(BaseModel):
    title: str = ""
    contact_header: str = ""
    sections: list[DocumentSection] = Field(default_factory=list)
    source_traces: list[SourceTrace] = Field(default_factory=list)


class ApplicationDocuments(BaseModel):
    ats_cv: CvDocument = Field(default_factory=CvDocument)
    portfolio_cv: CvDocument = Field(default_factory=CvDocument)
    cover_letter: str = ""
```

- [ ] **Step 3: Implement review schemas**

Create `backend/app/models/review.py`:

```python
from pydantic import BaseModel, Field


class ReviewScores(BaseModel):
    truthfulness: int = 0
    jd_alignment: int = 0
    evidence_strength: int = 0
    ats_safety: int = 0
    layout_and_length: int = 0
    impact_and_quantification: int = 0
    nz_au_convention_fit: int = 0
    cover_letter_quality: int = 0


class SourceTraceCheck(BaseModel):
    claim: str = ""
    source_id: str = ""
    passed: bool = False
    message: str = ""


class ReviewResult(BaseModel):
    passed: bool = False
    overall_score: int = 0
    scores: ReviewScores = Field(default_factory=ReviewScores)
    blocking_issues: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    suggested_revisions: list[str] = Field(default_factory=list)
    missing_user_information: list[str] = Field(default_factory=list)
    source_trace_checks: list[SourceTraceCheck] = Field(default_factory=list)
```

- [ ] **Step 4: Run schema tests**

Run:

```bash
cd backend && pytest tests/test_document_models.py -v
```

Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/documents.py backend/app/models/review.py backend/tests/test_document_models.py
git commit -m "feat: define generated document schemas"
```

---

### Task 8: OpenAI gpt-5.4 AI client boundary

**Files:**
- Create: `backend/app/ai/__init__.py`
- Create: `backend/app/ai/client.py`
- Create: `backend/tests/test_ai_client.py`

- [ ] **Step 1: Write failing AI client tests without network calls**

Create `backend/tests/test_ai_client.py`:

```python
from pydantic import BaseModel

from app.ai.client import OpenAiStructuredClient


class ExampleOutput(BaseModel):
    name: str


class FakeChatModel:
    def with_structured_output(self, schema):
        self.schema = schema
        return self

    def invoke(self, messages):
        self.messages = messages
        return self.schema(name="Alex")


def test_structured_client_uses_configured_model_name():
    client = OpenAiStructuredClient(model="gpt-5.4", chat_model=FakeChatModel())

    result = client.generate(
        system_prompt="Return a name.",
        user_prompt="Name the candidate.",
        output_schema=ExampleOutput,
    )

    assert result.name == "Alex"
    assert client.model == "gpt-5.4"
```

- [ ] **Step 2: Implement AI client**

Create `backend/app/ai/__init__.py`:

```python
__all__: list[str] = []
```

Create `backend/app/ai/client.py`:

```python
from typing import TypeVar

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class OpenAiStructuredClient:
    def __init__(self, model: str = "gpt-5.4", chat_model: object | None = None):
        self.model = model
        self.chat_model = chat_model or ChatOpenAI(model=model, streaming=True)

    def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        output_schema: type[SchemaT],
    ) -> SchemaT:
        structured_model = self.chat_model.with_structured_output(output_schema)
        result = structured_model.invoke(
            [
                ("system", system_prompt),
                ("user", user_prompt),
            ]
        )
        if isinstance(result, output_schema):
            return result
        return output_schema.model_validate(result)
```

- [ ] **Step 3: Run AI client test**

Run:

```bash
cd backend && pytest tests/test_ai_client.py -v
```

Expected: `1 passed` without external API calls.

- [ ] **Step 4: Commit**

```bash
git add backend/app/ai backend/tests/test_ai_client.py
git commit -m "feat: add OpenAI structured AI client"
```

---

### Task 9: Deterministic local workflow skeleton

**Files:**
- Create: `backend/app/ai/state.py`
- Create: `backend/app/ai/graph.py`
- Create: `backend/app/ai/nodes/__init__.py`
- Create: `backend/app/ai/nodes/jd_extract.py`
- Create: `backend/app/ai/nodes/company_research.py`
- Create: `backend/app/ai/nodes/jd_analysis.py`
- Create: `backend/app/ai/nodes/positioning.py`
- Create: `backend/app/ai/nodes/gap_questions.py`
- Create: `backend/app/ai/nodes/writer.py`
- Create: `backend/app/ai/nodes/reviewer.py`
- Create: `backend/tests/test_workflow_skeleton.py`

- [ ] **Step 1: Write failing workflow test**

Create `backend/tests/test_workflow_skeleton.py`:

```python
from app.ai.graph import run_workflow
from app.models.application import ApplicationRun, JdInput
from app.models.master_cv import MasterCv, Profile, Project


def test_workflow_generates_docs_and_review_without_network():
    cv = MasterCv(
        profile=Profile(full_name="Alex Chen", email="alex@example.com"),
        projects=[Project(id="project_001", name="StudyMate RAG", technologies=["Python", "RAG"], tier="A")],
    )
    run = ApplicationRun(
        application_id="app_001",
        company="Example Co",
        role_title="Junior AI Developer",
        jd_input=JdInput(type="text", source="manual", extracted_text="Python RAG FastAPI"),
    )

    result = run_workflow(cv, run)

    assert result.generated_documents["ats_cv"]["title"] == "ATS CV"
    assert result.review_result["passed"] is True
```

- [ ] **Step 2: Implement workflow state**

Create `backend/app/ai/state.py`:

```python
from typing import TypedDict

from app.models.application import ApplicationRun
from app.models.master_cv import MasterCv


class WorkflowState(TypedDict):
    master_cv: MasterCv
    application: ApplicationRun
```

- [ ] **Step 3: Implement deterministic nodes**

Create `backend/app/ai/nodes/__init__.py`:

```python
__all__: list[str] = []
```

Create `backend/app/ai/nodes/jd_extract.py`:

```python
from app.ai.state import WorkflowState


def jd_extract_node(state: WorkflowState) -> WorkflowState:
    return state
```

Create `backend/app/ai/nodes/company_research.py`:

```python
from app.ai.state import WorkflowState


def company_research_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    application.company_research.company_summary = f"Research summary for {application.company}".strip()
    application.company_research.sources = []
    return state
```

Create `backend/app/ai/nodes/jd_analysis.py`:

```python
from app.ai.state import WorkflowState


def jd_analysis_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    text = application.jd_input.extracted_text
    application.jd_analysis.must_have = [word for word in ["Python", "FastAPI", "RAG"] if word.lower() in text.lower()]
    application.jd_analysis.ideal_candidate_profile = "Candidate with relevant Python project evidence."
    return state
```

Create `backend/app/ai/nodes/positioning.py`:

```python
from app.ai.state import WorkflowState
from app.models.application import EvidenceMapItem


def positioning_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    master_cv = state["master_cv"]
    selected_projects = [project.id for project in master_cv.projects if project.tier in {"A", "B"}]
    application.candidate_positioning.selected_project_ids = selected_projects
    application.candidate_positioning.positioning_statement = "Position around strongest relevant project evidence."
    application.candidate_positioning.evidence_map = [
        EvidenceMapItem(
            jd_signal="Python",
            cv_source_id=selected_projects[0] if selected_projects else "",
            evidence_summary="Selected project includes Python evidence.",
            strength="strong" if selected_projects else "missing",
        )
    ]
    return state
```

Create `backend/app/ai/nodes/gap_questions.py`:

```python
from app.ai.state import WorkflowState
from app.models.application import GapQuestion


def gap_questions_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    text = application.jd_input.extracted_text.lower()
    has_rag_evidence = any("rag" in item.evidence_summary.lower() for item in application.candidate_positioning.evidence_map)
    if "rag" in text and not has_rag_evidence:
        application.gap_questions = [
            GapQuestion(
                question="The JD emphasises RAG. Have you used embeddings, vector databases, retrieval pipelines, or RAG evaluation?",
                why_asking="RAG is present in the JD but not strongly evidenced in the selected CV sources.",
                suggested_fields_to_update=["projects.project_001.technical_depth"],
            )
        ]
    return state
```

Create `backend/app/ai/nodes/writer.py`:

```python
from app.ai.state import WorkflowState
from app.models.documents import ApplicationDocuments, CvDocument, DocumentSection


def writer_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    master_cv = state["master_cv"]
    docs = ApplicationDocuments(
        ats_cv=CvDocument(
            title="ATS CV",
            contact_header=f"{master_cv.profile.full_name} | {master_cv.profile.email}",
            sections=[
                DocumentSection(heading="Summary", items=[application.candidate_positioning.positioning_statement]),
                DocumentSection(heading="Technical Skills", items=application.jd_analysis.must_have),
            ],
        ),
        portfolio_cv=CvDocument(
            title="Portfolio CV",
            contact_header=f"{master_cv.profile.full_name} | {master_cv.profile.email}",
            sections=[DocumentSection(heading="Selected Projects", items=application.candidate_positioning.selected_project_ids)],
        ),
        cover_letter=f"Dear hiring team,\n\nI am interested in the {application.role_title} role at {application.company}.",
    )
    application.generated_documents = docs.model_dump(mode="json")
    return state
```

Create `backend/app/ai/nodes/reviewer.py`:

```python
from app.ai.state import WorkflowState
from app.models.review import ReviewResult, ReviewScores


def reviewer_node(state: WorkflowState) -> WorkflowState:
    application = state["application"]
    has_documents = bool(application.generated_documents)
    review = ReviewResult(
        passed=has_documents,
        overall_score=80 if has_documents else 0,
        scores=ReviewScores(
            truthfulness=80 if has_documents else 0,
            jd_alignment=80 if has_documents else 0,
            evidence_strength=75 if has_documents else 0,
            ats_safety=85 if has_documents else 0,
            layout_and_length=80 if has_documents else 0,
            impact_and_quantification=70 if has_documents else 0,
            nz_au_convention_fit=85 if has_documents else 0,
            cover_letter_quality=80 if has_documents else 0,
        ),
    )
    application.review_result = review.model_dump(mode="json")
    return state
```

- [ ] **Step 4: Implement graph runner**

Create `backend/app/ai/graph.py`:

```python
from app.ai.nodes.company_research import company_research_node
from app.ai.nodes.gap_questions import gap_questions_node
from app.ai.nodes.jd_analysis import jd_analysis_node
from app.ai.nodes.jd_extract import jd_extract_node
from app.ai.nodes.positioning import positioning_node
from app.ai.nodes.reviewer import reviewer_node
from app.ai.nodes.writer import writer_node
from app.ai.state import WorkflowState
from app.models.application import ApplicationRun
from app.models.master_cv import MasterCv


def run_workflow(master_cv: MasterCv, application: ApplicationRun) -> ApplicationRun:
    state: WorkflowState = {"master_cv": master_cv, "application": application}
    for node in [
        jd_extract_node,
        company_research_node,
        jd_analysis_node,
        positioning_node,
        gap_questions_node,
        writer_node,
        reviewer_node,
    ]:
        state = node(state)
    return state["application"]
```

- [ ] **Step 5: Run workflow test**

Run:

```bash
cd backend && pytest tests/test_workflow_skeleton.py -v
```

Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add backend/app/ai/state.py backend/app/ai/graph.py backend/app/ai/nodes backend/tests/test_workflow_skeleton.py
git commit -m "feat: add application workflow skeleton"
```

---

### Task 10: Workflow API endpoints for generate and review

**Files:**
- Modify: `backend/app/api/applications.py`
- Create: `backend/tests/test_workflow_api.py`

- [ ] **Step 1: Write failing workflow API test**

Create `backend/tests/test_workflow_api.py`:

```python
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_generate_runs_workflow_and_persists_documents(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    cv = client.get("/api/master-cv").json()
    cv["profile"]["full_name"] = "Alex Chen"
    cv["profile"]["email"] = "alex@example.com"
    cv["projects"] = [{"id": "project_001", "name": "StudyMate RAG", "tier": "A", "technologies": ["Python", "RAG"]}]
    client.put("/api/master-cv", json=cv)
    created = client.post(
        "/api/applications",
        json={"company": "Example Co", "role_title": "Junior AI Developer", "jd_text": "Python RAG"},
    ).json()

    response = client.post(f"/api/applications/{created['application_id']}/generate")

    assert response.status_code == 200
    payload = response.json()
    assert payload["generated_documents"]["ats_cv"]["title"] == "ATS CV"
    assert payload["review_result"]["passed"] is True
```

- [ ] **Step 2: Add generate endpoint**

Add import to `backend/app/api/applications.py`:

```python
from app.ai.graph import run_workflow
```

Add endpoint to `backend/app/api/applications.py`:

```python
@router.post("/{application_id}/generate")
def generate_application(application_id: str, request: Request) -> ApplicationRun:
    storage = get_storage(request)
    master_cv = storage.load_master_cv()
    run = storage.load_application_run(application_id)
    updated = run_workflow(master_cv, run)
    storage.save_application_run(updated)
    return updated
```

- [ ] **Step 3: Run workflow API test**

Run:

```bash
cd backend && pytest tests/test_workflow_api.py -v
```

Expected: `1 passed`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/applications.py backend/tests/test_workflow_api.py
git commit -m "feat: expose generation workflow"
```

---

### Task 11: PDF rendering service and export endpoint

**Files:**
- Create: `backend/app/services/pdf_renderer.py`
- Create: `backend/app/templates/ats_cv.html`
- Create: `backend/app/templates/portfolio_cv.html`
- Create: `backend/app/templates/cover_letter.html`
- Create: `backend/app/static/ats.css`
- Create: `backend/app/static/portfolio.css`
- Create: `backend/app/static/cover_letter.css`
- Modify: `backend/app/api/applications.py`
- Create: `backend/tests/test_pdf_renderer.py`

- [ ] **Step 1: Write failing renderer test using fake PDF engine**

Create `backend/tests/test_pdf_renderer.py`:

```python
from pathlib import Path

from app.models.documents import ApplicationDocuments, CvDocument, DocumentSection
from app.services.pdf_renderer import PdfRenderer


class FakePdfEngine:
    def render(self, html: str, output_path: Path) -> None:
        output_path.write_bytes(b"%PDF-1.4 fake pdf")


def test_pdf_renderer_writes_three_files(tmp_path: Path):
    docs = ApplicationDocuments(
        ats_cv=CvDocument(title="ATS CV", sections=[DocumentSection(heading="Summary", items=["Python developer"])]),
        portfolio_cv=CvDocument(title="Portfolio CV"),
        cover_letter="Dear hiring team,\n\nI am interested.",
    )
    renderer = PdfRenderer(engine=FakePdfEngine())

    exports = renderer.export_documents(docs, tmp_path)

    assert (tmp_path / "ats_cv.pdf").exists()
    assert (tmp_path / "portfolio_cv.pdf").exists()
    assert (tmp_path / "cover_letter.pdf").exists()
    assert exports["ats_cv"].endswith("ats_cv.pdf")
```

- [ ] **Step 2: Implement PDF renderer with injectable engine**

Create `backend/app/services/pdf_renderer.py`:

```python
from pathlib import Path
from typing import Protocol

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.models.documents import ApplicationDocuments


class PdfEngine(Protocol):
    def render(self, html: str, output_path: Path) -> None: ...


class PlaywrightPdfEngine:
    def render(self, html: str, output_path: Path) -> None:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            page = browser.new_page()
            page.set_content(html, wait_until="networkidle")
            page.pdf(path=str(output_path), print_background=True, format="A4")
            browser.close()


class PdfRenderer:
    def __init__(self, engine: PdfEngine | None = None):
        self.engine = engine or PlaywrightPdfEngine()
        template_dir = Path(__file__).resolve().parents[1] / "templates"
        self.environment = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(["html"]),
        )

    def export_documents(self, documents: ApplicationDocuments, output_dir: Path) -> dict[str, str]:
        output_dir.mkdir(parents=True, exist_ok=True)
        files = {
            "ats_cv": ("ats_cv.html", output_dir / "ats_cv.pdf", documents.ats_cv),
            "portfolio_cv": ("portfolio_cv.html", output_dir / "portfolio_cv.pdf", documents.portfolio_cv),
            "cover_letter": ("cover_letter.html", output_dir / "cover_letter.pdf", documents.cover_letter),
        }
        exports: dict[str, str] = {}
        for key, (template_name, output_path, payload) in files.items():
            html = self.environment.get_template(template_name).render(document=payload)
            self.engine.render(html, output_path)
            exports[key] = str(output_path)
        return exports
```

- [ ] **Step 3: Add HTML templates and print CSS**

Create `backend/app/templates/ats_cv.html`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>{% include "../static/ats.css" %}</style>
  </head>
  <body>
    <main class="page">
      <h1>{{ document.contact_header }}</h1>
      {% for section in document.sections %}
      <section>
        <h2>{{ section.heading }}</h2>
        <ul>
          {% for item in section.items %}<li>{{ item }}</li>{% endfor %}
        </ul>
      </section>
      {% endfor %}
    </main>
  </body>
</html>
```

Create `backend/app/templates/portfolio_cv.html`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>{% include "../static/portfolio.css" %}</style>
  </head>
  <body>
    <main class="page">
      <h1>{{ document.contact_header }}</h1>
      {% for section in document.sections %}
      <section>
        <h2>{{ section.heading }}</h2>
        <ul>
          {% for item in section.items %}<li>{{ item }}</li>{% endfor %}
        </ul>
      </section>
      {% endfor %}
    </main>
  </body>
</html>
```

Create `backend/app/templates/cover_letter.html`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>{% include "../static/cover_letter.css" %}</style>
  </head>
  <body>
    <main class="page">
      {% for paragraph in document.split('\n\n') %}
      <p>{{ paragraph }}</p>
      {% endfor %}
    </main>
  </body>
</html>
```

Create `backend/app/static/ats.css`:

```css
@page { size: A4; margin: 14mm; }
body { font-family: Arial, Calibri, sans-serif; color: #111; font-size: 10.5pt; line-height: 1.35; }
h1 { font-size: 15pt; margin: 0 0 8pt; text-align: center; }
h2 { font-size: 11pt; margin: 10pt 0 4pt; border-bottom: 1px solid #222; }
ul { margin: 0; padding-left: 16pt; }
li { margin-bottom: 3pt; }
```

Create `backend/app/static/portfolio.css`:

```css
@page { size: A4; margin: 16mm; }
body { font-family: Georgia, 'Times New Roman', serif; color: #172033; font-size: 10.8pt; line-height: 1.42; }
h1 { font-size: 17pt; margin: 0 0 10pt; color: #12355b; }
h2 { font-size: 12pt; margin: 12pt 0 5pt; color: #0b6b78; }
ul { margin: 0; padding-left: 16pt; }
li { margin-bottom: 4pt; }
```

Create `backend/app/static/cover_letter.css`:

```css
@page { size: A4; margin: 18mm; }
body { font-family: Arial, Calibri, sans-serif; color: #111; font-size: 11pt; line-height: 1.5; }
p { margin: 0 0 11pt; }
```

- [ ] **Step 4: Run renderer test**

Run:

```bash
cd backend && pytest tests/test_pdf_renderer.py -v
```

Expected: `1 passed`.

- [ ] **Step 5: Add export endpoint**

Add imports to `backend/app/api/applications.py`:

```python
from fastapi.responses import FileResponse

from app.models.documents import ApplicationDocuments
from app.services.pdf_renderer import PdfRenderer
```

Add endpoint to `backend/app/api/applications.py`:

```python
@router.post("/{application_id}/export")
def export_application(application_id: str, request: Request) -> ApplicationRun:
    storage = get_storage(request)
    run = storage.load_application_run(application_id)
    documents = ApplicationDocuments.model_validate(run.generated_documents)
    output_dir = storage.application_dir(application_id) / "exports"
    run.exports = PdfRenderer().export_documents(documents, output_dir)
    storage.save_application_run(run)
    return run


@router.get("/{application_id}/exports/{filename}")
def get_export(application_id: str, filename: str, request: Request) -> FileResponse:
    export_path = get_storage(request).application_dir(application_id) / "exports" / filename
    return FileResponse(export_path, media_type="application/pdf", filename=filename)
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/pdf_renderer.py backend/app/templates backend/app/static backend/app/api/applications.py backend/tests/test_pdf_renderer.py
git commit -m "feat: render generated PDFs"
```

---

### Task 12: Frontend scaffold with Ant Design navigation

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/index.html`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/pages/MasterCvEditor.tsx`
- Create: `frontend/src/pages/ApplicationWorkspace.tsx`
- Create: `frontend/src/pages/GeneratedDocuments.tsx`
- Create: `frontend/src/pages/Settings.tsx`
- Create: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add frontend dependencies**

Create `frontend/package.json`:

```json
{
  "name": "cv-builder-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "antd": "latest",
    "vite": "latest",
    "typescript": "latest",
    "react": "latest",
    "react-dom": "latest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "jsdom": "latest",
    "vitest": "latest"
  }
}
```

Create `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": []
}
```

Create `frontend/vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: []
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000'
    }
  }
});
```

Create `frontend/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CV Builder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Write failing navigation test**

Create `frontend/src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App', () => {
  it('renders CV Builder navigation', () => {
    render(<App />);

    expect(screen.getByText('CV Builder')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Master CV')).toBeInTheDocument();
    expect(screen.getByText('Application Workspace')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement app layout and pages**

Create `frontend/src/main.tsx`:

```tsx
import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Create `frontend/src/pages/Dashboard.tsx`:

```tsx
import { Card, Typography } from 'antd';

export default function Dashboard() {
  return (
    <Card>
      <Typography.Title level={2}>Dashboard</Typography.Title>
      <Typography.Paragraph>Track master CV completeness and recent application runs.</Typography.Paragraph>
    </Card>
  );
}
```

Create `frontend/src/pages/MasterCvEditor.tsx`:

```tsx
import { Card, Typography } from 'antd';

export default function MasterCvEditor() {
  return (
    <Card>
      <Typography.Title level={2}>Master CV</Typography.Title>
      <Typography.Paragraph>Edit structured profile, skills, work, and project narrative data.</Typography.Paragraph>
    </Card>
  );
}
```

Create `frontend/src/pages/ApplicationWorkspace.tsx`:

```tsx
import { Card, Typography } from 'antd';

export default function ApplicationWorkspace() {
  return (
    <Card>
      <Typography.Title level={2}>Application Workspace</Typography.Title>
      <Typography.Paragraph>Create assisted or auto JD-targeted application runs.</Typography.Paragraph>
    </Card>
  );
}
```

Create `frontend/src/pages/GeneratedDocuments.tsx`:

```tsx
import { Card, Typography } from 'antd';

export default function GeneratedDocuments() {
  return (
    <Card>
      <Typography.Title level={2}>Generated Documents</Typography.Title>
      <Typography.Paragraph>Review ATS CV, portfolio CV, cover letter, and review results.</Typography.Paragraph>
    </Card>
  );
}
```

Create `frontend/src/pages/Settings.tsx`:

```tsx
import { Card, Typography } from 'antd';

export default function Settings() {
  return (
    <Card>
      <Typography.Title level={2}>Settings</Typography.Title>
      <Typography.Paragraph>Configure OpenAI gpt-5.4, search, PDF export, and workflow defaults.</Typography.Paragraph>
    </Card>
  );
}
```

Create `frontend/src/App.tsx`:

```tsx
import { Layout, Menu, Typography } from 'antd';
import { useState } from 'react';

import ApplicationWorkspace from './pages/ApplicationWorkspace';
import Dashboard from './pages/Dashboard';
import GeneratedDocuments from './pages/GeneratedDocuments';
import MasterCvEditor from './pages/MasterCvEditor';
import Settings from './pages/Settings';

const pages = {
  dashboard: <Dashboard />,
  masterCv: <MasterCvEditor />,
  workspace: <ApplicationWorkspace />,
  documents: <GeneratedDocuments />,
  settings: <Settings />
};

export default function App() {
  const [selectedKey, setSelectedKey] = useState<keyof typeof pages>('dashboard');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Sider width={260} theme="light">
        <Typography.Title level={3} style={{ padding: 24, margin: 0 }}>
          CV Builder
        </Typography.Title>
        <Menu
          selectedKeys={[selectedKey]}
          onClick={(item) => setSelectedKey(item.key as keyof typeof pages)}
          items={[
            { key: 'dashboard', label: 'Dashboard' },
            { key: 'masterCv', label: 'Master CV' },
            { key: 'workspace', label: 'Application Workspace' },
            { key: 'documents', label: 'Generated Documents' },
            { key: 'settings', label: 'Settings' }
          ]}
        />
      </Layout.Sider>
      <Layout.Content style={{ padding: 24 }}>{pages[selectedKey]}</Layout.Content>
    </Layout>
  );
}
```

- [ ] **Step 4: Run frontend test**

Run:

```bash
cd frontend && npm install && npm test
```

Expected: test passes.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/index.html frontend/tsconfig.json frontend/vite.config.ts frontend/src
git commit -m "feat: scaffold Ant Design frontend"
```

---

### Task 13: Frontend API types and Master CV editor loading

**Files:**
- Create: `frontend/src/types/masterCv.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/masterCv.ts`
- Modify: `frontend/src/pages/MasterCvEditor.tsx`
- Create: `frontend/src/pages/MasterCvEditor.test.tsx`

- [ ] **Step 1: Add types and API wrappers**

Create `frontend/src/types/masterCv.ts`:

```ts
export interface Profile {
  full_name: string;
  email: string;
  github_url: string;
  linkedin_url: string;
  portfolio_url: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  narrative: string;
  technologies: string[];
}

export interface Project {
  id: string;
  name: string;
  type: string;
  technologies: string[];
  narrative: string;
  tier: string;
}

export interface MasterCv {
  profile: Profile;
  work_experience: WorkExperience[];
  projects: Project[];
}
```

Create `frontend/src/api/client.ts`:

```ts
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`GET ${path} failed with ${response.status}`);
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`PUT ${path} failed with ${response.status}`);
  return response.json() as Promise<T>;
}
```

Create `frontend/src/api/masterCv.ts`:

```ts
import { apiGet, apiPut } from './client';
import type { MasterCv } from '../types/masterCv';

export function getMasterCv(): Promise<MasterCv> {
  return apiGet<MasterCv>('/api/master-cv');
}

export function saveMasterCv(masterCv: MasterCv): Promise<MasterCv> {
  return apiPut<MasterCv>('/api/master-cv', masterCv);
}
```

- [ ] **Step 2: Write Master CV editor test**

Create `frontend/src/pages/MasterCvEditor.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MasterCvEditor from './MasterCvEditor';

const masterCv = {
  profile: {
    full_name: 'Alex Chen',
    email: 'alex@example.com',
    github_url: 'https://github.com/alexchen',
    linkedin_url: 'https://linkedin.com/in/alexchen',
    portfolio_url: ''
  },
  work_experience: [],
  projects: []
};

describe('MasterCvEditor', () => {
  it('loads profile fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => masterCv }));

    render(<MasterCvEditor />);

    await waitFor(() => expect(screen.getByDisplayValue('Alex Chen')).toBeInTheDocument());
    expect(screen.getByDisplayValue('https://github.com/alexchen')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement Master CV editor loading**

Replace `frontend/src/pages/MasterCvEditor.tsx` with:

```tsx
import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';

import { getMasterCv, saveMasterCv } from '../api/masterCv';
import type { MasterCv } from '../types/masterCv';

export default function MasterCvEditor() {
  const [form] = Form.useForm<MasterCv>();
  const [masterCv, setMasterCv] = useState<MasterCv | null>(null);

  useEffect(() => {
    getMasterCv().then((loaded) => {
      setMasterCv(loaded);
      form.setFieldsValue(loaded);
    });
  }, [form]);

  async function handleSave(values: MasterCv) {
    const saved = await saveMasterCv({ ...masterCv, ...values } as MasterCv);
    setMasterCv(saved);
    message.success('Master CV saved');
  }

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Typography.Title level={2}>Master CV</Typography.Title>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="Full name" name={['profile', 'full_name']}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name={['profile', 'email']}>
            <Input />
          </Form.Item>
          <Form.Item label="GitHub" name={['profile', 'github_url']}>
            <Input />
          </Form.Item>
          <Form.Item label="LinkedIn" name={['profile', 'linkedin_url']}>
            <Input />
          </Form.Item>
          <Form.Item label="Portfolio" name={['profile', 'portfolio_url']}>
            <Input />
          </Form.Item>
          <Button type="primary" htmlType="submit">Save Master CV</Button>
        </Form>
      </Space>
    </Card>
  );
}
```

- [ ] **Step 4: Run frontend tests**

Run:

```bash
cd frontend && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/masterCv.ts frontend/src/api frontend/src/pages/MasterCvEditor.tsx frontend/src/pages/MasterCvEditor.test.tsx
git commit -m "feat: connect master CV editor"
```

---

### Task 14: End-to-end smoke path

**Files:**
- Create: `backend/tests/test_e2e_smoke.py`
- Modify: `README.md`

- [ ] **Step 1: Write backend smoke test**

Create `backend/tests/test_e2e_smoke.py`:

```python
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_local_application_smoke_path(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    cv = client.get("/api/master-cv").json()
    cv["profile"]["full_name"] = "Alex Chen"
    cv["profile"]["email"] = "alex@example.com"
    cv["profile"]["github_url"] = "https://github.com/alexchen"
    cv["projects"] = [
        {
            "id": "project_001",
            "name": "StudyMate RAG",
            "type": "academic",
            "technologies": ["Python", "FastAPI", "RAG"],
            "tier": "A",
            "narrative": "Built a retrieval assistant with cited answers."
        }
    ]
    assert client.put("/api/master-cv", json=cv).status_code == 200

    run = client.post(
        "/api/applications",
        json={
            "company": "Example Co",
            "role_title": "Junior AI Developer",
            "mode": "assisted",
            "jd_text": "We need Python, FastAPI, and RAG experience."
        },
    ).json()

    generated = client.post(f"/api/applications/{run['application_id']}/generate").json()

    assert generated["generated_documents"]["ats_cv"]["title"] == "ATS CV"
    assert generated["generated_documents"]["portfolio_cv"]["title"] == "Portfolio CV"
    assert generated["review_result"]["passed"] is True
```

- [ ] **Step 2: Update README with local commands**

Replace `README.md` with:

```markdown
# cv-builder

Local single-user CV Builder for generating JD-targeted NZ/AU IT application packages.

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
pytest -v
uvicorn app.main:app --reload
```

## Frontend

```bash
cd frontend
npm install
npm test
npm run dev
```

## AI Provider

The MVP default model is OpenAI `gpt-5.4`. API keys must be provided through environment variables or local-only config. Do not commit or print secret values from `ref/ai.txt`.

## MVP Flow

1. Edit the master CV manually.
2. Create an application run from pasted JD text, uploaded file, job URL, or fixture JSON.
3. Run assisted or auto generation.
4. Review ATS CV, portfolio CV, cover letter, and review result.
5. Export PDFs locally.
```

- [ ] **Step 3: Run backend smoke test and full backend suite**

Run:

```bash
cd backend && pytest -v
```

Expected: all backend tests pass.

- [ ] **Step 4: Run frontend suite**

Run:

```bash
cd frontend && npm test
```

Expected: all frontend tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/test_e2e_smoke.py README.md
git commit -m "test: add local MVP smoke path"
```

---

## Self-Review Notes

### Spec coverage

- Manual deterministic master CV editing is covered by Tasks 2, 3, and 13.
- Structured fields plus long narrative fields are covered by Task 2.
- JD text/file/url/fixture ingestion is introduced in Task 5 and exposed incrementally in Task 6 for text. File/url/fixture API upload UI should be added after this MVP skeleton using the same `JdIngestionService` methods.
- Assisted/auto modes are stored in Task 4 and accepted in Task 6. Mode-specific pauses become meaningful when the AI nodes are replaced with real OpenAI calls.
- OpenAI `gpt-5.4` is isolated in Task 8.
- LangGraph-compatible workflow boundaries are created in Task 9; replacing the simple runner with compiled LangGraph is a focused follow-up once nodes are stable.
- Review Agent schema and initial review gate are covered by Tasks 7 and 9.
- ATS/portfolio/cover-letter document outputs are covered by Tasks 7, 9, and 11.
- PDF export is covered by Task 11.
- Single-user local JSON storage and security boundary are covered by Tasks 2, 4, and README guidance in Task 14.

### Follow-up implementation slices after this plan

1. Replace deterministic workflow nodes with OpenAI `gpt-5.4` structured generation prompts.
2. Add UI controls for file upload, URL ingestion, and fixture JSON selection.
3. Add real web search provider integration with source confirmation.
4. Add generated document editing UI and source-trace display.
5. Add PDF page-count and text-extraction checks.
6. Add Playwright browser verification for the frontend golden path.

### Placeholder scan

This plan avoids placeholder markers and gives exact file paths, test code, implementation code, commands, expected outcomes, and commit boundaries for each task.

### Type consistency

Backend Pydantic models use snake_case JSON fields and frontend TypeScript mirrors those fields. Application run fields match across storage, API, workflow, and smoke tests. The AI model string is consistently OpenAI `gpt-5.4`.
