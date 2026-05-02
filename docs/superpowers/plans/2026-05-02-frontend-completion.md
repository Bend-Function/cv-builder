# CV Builder Frontend Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all five frontend pages (Dashboard, Master CV Editor with split-pane preview, Application Workspace with JD ingestion, Generated Documents with block-level CV editor, Settings) and add the small backend changes needed to support them.

**Architecture:** Props-based navigation (no router, no global context). `App.tsx` holds `currentPage` and `selectedRunId` state and passes `navigate(page, runId?)` down to pages. Backend gets two new endpoints: `GET/PUT /api/settings` (persisted to `data/settings.json`) and `PUT /api/applications/{id}/documents` (saves block-edited CV documents back to the run).

**Tech Stack:** Backend — FastAPI, Pydantic v2, pytest. Frontend — React 18, TypeScript, Ant Design 5, `@ant-design/icons`, Vite, Vitest, Testing Library.

**Spec reference:** `docs/superpowers/specs/2026-05-02-frontend-completion-design.md`

---

## File Map

### Backend

| File | Action | Purpose |
|------|--------|---------|
| `backend/app/services/settings_storage.py` | create | Read/write `data/settings.json` with editable fields only |
| `backend/app/api/settings.py` | create | `GET/PUT /api/settings` router |
| `backend/app/main.py` | modify | Register settings router |
| `backend/tests/test_settings_api.py` | create | Settings API unit tests |
| `backend/app/api/applications.py` | modify | Add `PUT /{application_id}/documents` endpoint |
| `backend/tests/test_applications_api.py` | modify | Add tests for `PUT /documents` |
| `backend/tests/test_e2e_smoke.py` | modify | Add full-workflow + settings round-trip tests |

### Frontend

| File | Action | Purpose |
|------|--------|---------|
| `frontend/package.json` | modify | Add `@ant-design/icons` dependency |
| `frontend/src/types/masterCv.ts` | rewrite | All Master CV interfaces matching backend model |
| `frontend/src/types/application.ts` | create | `ApplicationRun`, `JdInput`, `ApplicationDocuments`, `CvDocument`, `DocumentSection`, `ReviewResult` |
| `frontend/src/types/settings.ts` | create | `Settings`, `EditableSettings` |
| `frontend/src/api/client.ts` | modify | Add `apiPost`, `apiPostForm` |
| `frontend/src/api/applications.ts` | create | All applications API helpers |
| `frontend/src/api/settings.ts` | create | `getSettings`, `saveSettings` |
| `frontend/src/App.tsx` | rewrite | Render-prop pages with `navigate` and `selectedRunId` |
| `frontend/src/pages/Dashboard.tsx` | rewrite | Completeness card + recent runs |
| `frontend/src/pages/Dashboard.test.tsx` | create | Dashboard unit tests |
| `frontend/src/pages/ApplicationWorkspace.tsx` | rewrite | JD input form + create+generate flow + recent runs |
| `frontend/src/pages/ApplicationWorkspace.test.tsx` | create | Workspace unit tests |
| `frontend/src/pages/GeneratedDocuments.tsx` | rewrite | Run selector + CV block editor + cover letter + review + export |
| `frontend/src/pages/GeneratedDocuments.test.tsx` | create | Block-editor unit tests |
| `frontend/src/pages/MasterCvEditor.tsx` | rewrite | Split-pane editor with all sections + live preview |
| `frontend/src/pages/MasterCvEditor.test.tsx` | modify | Extend tests for new sections |
| `frontend/src/pages/Settings.tsx` | rewrite | Settings form |
| `frontend/src/pages/Settings.test.tsx` | create | Settings unit tests |

---

## Task 1: Backend Settings API

**Files:**
- Create: `backend/app/services/settings_storage.py`
- Create: `backend/app/api/settings.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_settings_api.py`

- [ ] **Step 1: Write the failing settings test file**

Create `backend/tests/test_settings_api.py`:

```python
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def test_get_settings_returns_defaults_when_no_file(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.get("/api/settings")

    assert response.status_code == 200
    data = response.json()
    assert data["ai_model"] == "gpt-5.4"
    assert data["default_mode"] == "assisted"
    assert data["gap_questions_enabled"] is True
    assert data["max_revision_loops"] == 2
    assert data["ai_provider"] == "openai"
    assert data["openai_api_key_env"] == "OPENAI_API_KEY"
    assert data["data_dir"] == str(tmp_path)


def test_put_settings_persists_editable_fields(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.put(
        "/api/settings",
        json={
            "ai_model": "gpt-5.4",
            "default_mode": "auto",
            "gap_questions_enabled": False,
            "max_revision_loops": 1,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["default_mode"] == "auto"
    assert data["gap_questions_enabled"] is False
    assert data["max_revision_loops"] == 1
    assert data["ai_provider"] == "openai"


def test_get_settings_returns_persisted_values_after_put(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    client.put(
        "/api/settings",
        json={
            "ai_model": "gpt-5.4",
            "default_mode": "auto",
            "gap_questions_enabled": False,
            "max_revision_loops": 3,
        },
    )

    response = client.get("/api/settings")

    assert response.status_code == 200
    data = response.json()
    assert data["default_mode"] == "auto"
    assert data["gap_questions_enabled"] is False
    assert data["max_revision_loops"] == 3


def test_put_settings_rejects_out_of_range_revision_loops(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.put(
        "/api/settings",
        json={
            "ai_model": "gpt-5.4",
            "default_mode": "assisted",
            "gap_questions_enabled": True,
            "max_revision_loops": 99,
        },
    )

    assert response.status_code == 422


def test_put_settings_rejects_invalid_default_mode(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.put(
        "/api/settings",
        json={
            "ai_model": "gpt-5.4",
            "default_mode": "supersonic",
            "gap_questions_enabled": True,
            "max_revision_loops": 2,
        },
    )

    assert response.status_code == 422
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd backend
uv run --extra dev pytest tests/test_settings_api.py -v
```
Expected: FAIL with `404 Not Found` for the `/api/settings` route (router not registered yet).

- [ ] **Step 3: Implement `SettingsStorage` service**

Create `backend/app/services/settings_storage.py`:

```python
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
```

- [ ] **Step 4: Implement settings API router**

Create `backend/app/api/settings.py`:

```python
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
```

- [ ] **Step 5: Register the settings router in `main.py`**

Edit `backend/app/main.py`:

```python
from fastapi import FastAPI

from app.api import applications, master_cv, settings as settings_api
from app.config import Settings, get_settings
from app.services.storage import JsonStorage


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()
    app = FastAPI(title="CV Builder", version="0.1.0")
    app.state.settings = resolved_settings
    app.state.storage = JsonStorage(resolved_settings.data_dir)
    app.include_router(master_cv.router)
    app.include_router(applications.router)
    app.include_router(settings_api.router)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
```

- [ ] **Step 6: Run settings tests to verify pass**

Run:
```bash
cd backend
uv run --extra dev pytest tests/test_settings_api.py -v
```
Expected: 5 tests PASS.

- [ ] **Step 7: Run all backend tests to confirm no regressions**

Run:
```bash
cd backend
uv run --extra dev pytest -v
```
Expected: all existing tests + 5 new settings tests PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/app/services/settings_storage.py backend/app/api/settings.py backend/app/main.py backend/tests/test_settings_api.py
git commit -m "feat(backend): add GET/PUT /api/settings endpoint with json persistence"
```

---

## Task 2: Backend `PUT /api/applications/{id}/documents`

**Files:**
- Modify: `backend/app/api/applications.py`
- Test: `backend/tests/test_applications_api.py`

- [ ] **Step 1: Write failing tests for the new endpoint**

Append to `backend/tests/test_applications_api.py` (add at end of file):

```python
def test_put_documents_persists_edited_documents(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)
    created = client.post(
        "/api/applications",
        json={"company": "Acme", "role_title": "Dev", "jd_text": "Python"},
    ).json()
    application_id = created["application_id"]

    payload = {
        "ats_cv": {
            "title": "ATS CV",
            "contact_header": "Alex Chen | Auckland | alex@example.com",
            "sections": [
                {"heading": "SUMMARY", "items": ["Junior dev focused on backend Python."]},
                {"heading": "TECHNICAL SKILLS", "items": ["Languages: Python, TypeScript"]},
            ],
            "source_traces": [],
        },
        "portfolio_cv": {
            "title": "Portfolio CV",
            "contact_header": "Alex Chen",
            "sections": [],
            "source_traces": [],
        },
        "cover_letter": "Dear Hiring Manager, ...",
    }

    response = client.put(
        f"/api/applications/{application_id}/documents",
        json=payload,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["generated_documents"]["ats_cv"]["sections"][0]["heading"] == "SUMMARY"
    assert body["generated_documents"]["cover_letter"] == "Dear Hiring Manager, ..."

    # confirm round-trip via GET
    fetched = client.get(f"/api/applications/{application_id}").json()
    assert fetched["generated_documents"]["ats_cv"]["sections"][1]["items"] == [
        "Languages: Python, TypeScript"
    ]
    assert fetched["generated_documents"]["cover_letter"] == "Dear Hiring Manager, ..."


def test_put_documents_returns_404_for_unknown_application(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.put(
        "/api/applications/app_does_not_exist/documents",
        json={
            "ats_cv": {"title": "ATS CV", "contact_header": "", "sections": [], "source_traces": []},
            "portfolio_cv": {"title": "Portfolio CV", "contact_header": "", "sections": [], "source_traces": []},
            "cover_letter": "",
        },
    )

    assert response.status_code == 404


def test_put_documents_rejects_invalid_application_id(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    response = client.put(
        "/api/applications/..%2Fevil/documents",
        json={
            "ats_cv": {"title": "ATS CV", "contact_header": "", "sections": [], "source_traces": []},
            "portfolio_cv": {"title": "Portfolio CV", "contact_header": "", "sections": [], "source_traces": []},
            "cover_letter": "",
        },
    )

    assert response.status_code in (400, 404)
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
cd backend
uv run --extra dev pytest tests/test_applications_api.py::test_put_documents_persists_edited_documents -v
```
Expected: FAIL with 405 Method Not Allowed (no PUT route defined yet).

- [ ] **Step 3: Add the endpoint to `applications.py`**

In `backend/app/api/applications.py`, add this endpoint **immediately after the existing `generate_application` endpoint** (between `generate_application` at line 202–212 and `export_application` at line 215):

```python
@router.put("/{application_id}/documents")
def update_documents(
    application_id: str,
    documents: ApplicationDocuments,
    request: Request,
) -> ApplicationRun:
    storage = get_storage(request)
    run = _load_application_or_404(storage, application_id)
    run.generated_documents = documents.model_dump()
    storage.save_application_run(run)
    return run
```

- [ ] **Step 4: Run the new tests to verify they pass**

Run:
```bash
cd backend
uv run --extra dev pytest tests/test_applications_api.py -v
```
Expected: all existing + 3 new tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/applications.py backend/tests/test_applications_api.py
git commit -m "feat(backend): add PUT /api/applications/{id}/documents for block-edited CV save"
```

---

## Task 3: Backend E2E smoke test extension

**Files:**
- Modify: `backend/tests/test_e2e_smoke.py`

- [ ] **Step 1: Replace the test file with extended coverage**

Replace the entire content of `backend/tests/test_e2e_smoke.py` with:

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


def test_settings_round_trip_in_app_context(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    defaults = client.get("/api/settings").json()
    assert defaults["ai_model"] == "gpt-5.4"
    assert defaults["gap_questions_enabled"] is True

    saved = client.put(
        "/api/settings",
        json={
            "ai_model": "gpt-5.4",
            "default_mode": "auto",
            "gap_questions_enabled": False,
            "max_revision_loops": 1,
        },
    ).json()
    assert saved["default_mode"] == "auto"
    assert saved["gap_questions_enabled"] is False

    again = client.get("/api/settings").json()
    assert again["default_mode"] == "auto"
    assert again["gap_questions_enabled"] is False


def test_full_application_workflow(tmp_path: Path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    cv = client.get("/api/master-cv").json()
    cv["profile"]["full_name"] = "Alex Chen"
    cv["profile"]["email"] = "alex@example.com"
    cv["profile"]["github_url"] = "https://github.com/alexchen"
    cv["work_experience"] = [
        {
            "id": "work_001",
            "company": "Acme Corp",
            "title": "Software Intern",
            "start_date": "January 2025",
            "end_date": "June 2025",
            "responsibilities": ["Built internal tools"],
            "achievements": ["Reduced manual process time by 30%"],
        }
    ]
    cv["projects"] = [
        {
            "id": "project_001",
            "name": "RAG Assistant",
            "tier": "A",
            "technologies": ["Python", "FastAPI"],
            "narrative": "Retrieval assistant with citations.",
        }
    ]
    cv["education"] = [
        {
            "institution": "University of Auckland",
            "qualification": "BSc Computer Science",
            "start_date": "March 2022",
            "end_date": "November 2024",
        }
    ]
    assert client.put("/api/master-cv", json=cv).status_code == 200

    run = client.post(
        "/api/applications",
        json={
            "company": "TechCo",
            "role_title": "Junior AI Developer",
            "mode": "assisted",
            "jd_text": "Python, FastAPI, RAG experience required.",
        },
    ).json()
    application_id = run["application_id"]
    assert application_id.startswith("app_")

    listing = client.get("/api/applications").json()
    assert any(item["application_id"] == application_id for item in listing)

    generated = client.post(f"/api/applications/{application_id}/generate").json()
    assert generated["generated_documents"]["ats_cv"]["title"] == "ATS CV"
    assert generated["review_result"]["passed"] is True

    edited_documents = generated["generated_documents"]
    edited_documents["cover_letter"] = "Dear Hiring Manager, I am writing about..."
    edited_documents["ats_cv"]["sections"].append({
        "heading": "ADDITIONAL",
        "items": ["Personal touch added by user"],
    })
    saved_run = client.put(
        f"/api/applications/{application_id}/documents",
        json=edited_documents,
    ).json()
    assert saved_run["generated_documents"]["cover_letter"].startswith("Dear Hiring Manager")
    assert saved_run["generated_documents"]["ats_cv"]["sections"][-1]["heading"] == "ADDITIONAL"

    exported = client.post(f"/api/applications/{application_id}/export").json()
    assert "ats_cv" in exported["exports"]
    assert "portfolio_cv" in exported["exports"]
    assert "cover_letter" in exported["exports"]

    for filename in ("ats_cv.pdf", "portfolio_cv.pdf", "cover_letter.pdf"):
        resp = client.get(f"/api/applications/{application_id}/exports/{filename}")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
```

- [ ] **Step 2: Run the e2e tests**

Run:
```bash
cd backend
uv run --extra dev pytest tests/test_e2e_smoke.py -v
```
Expected: 3 tests PASS (the original smoke test + 2 new ones).

- [ ] **Step 3: Run the full backend suite to confirm green**

Run:
```bash
cd backend
uv run --extra dev pytest -v
```
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_e2e_smoke.py
git commit -m "test(backend): expand e2e smoke to cover settings round-trip and full workflow"
```

---

## Task 4: Frontend types and `@ant-design/icons` dependency

**Files:**
- Modify: `frontend/package.json`
- Rewrite: `frontend/src/types/masterCv.ts`
- Create: `frontend/src/types/application.ts`
- Create: `frontend/src/types/settings.ts`

- [ ] **Step 1: Install `@ant-design/icons`**

Run:
```bash
cd frontend
npm install @ant-design/icons
```
Expected: `package.json` updated with the new dependency, no errors.

- [ ] **Step 2: Rewrite `frontend/src/types/masterCv.ts`**

Replace the entire content of `frontend/src/types/masterCv.ts` with:

```typescript
export interface Confidence {
  facts_verified: boolean;
  needs_user_review: string[];
}

export interface Link {
  label: string;
  url: string;
}

export interface Profile {
  full_name: string;
  preferred_name: string;
  headline: string;
  location: string;
  phone: string;
  email: string;
  github_url: string;
  linkedin_url: string;
  portfolio_url: string;
  personal_website_url: string;
  target_roles: string[];
  summary_source: string;
  work_authorisation: string;
  referees: string;
}

export interface GitHubPresence {
  url: string;
  profile_readme_summary: string;
  pinned_projects: Link[];
}

export interface LinkedInPresence {
  url: string;
  headline: string;
  summary: string;
}

export interface PortfolioPresence {
  url: string;
  featured_links: Link[];
}

export interface OnlinePresence {
  github: GitHubPresence;
  linkedin: LinkedInPresence;
  portfolio: PortfolioPresence;
  other_links: Link[];
}

export interface Education {
  institution: string;
  qualification: string;
  location: string;
  start_date: string;
  end_date: string;
  highlights: string[];
}

export interface Skills {
  languages: string[];
  frameworks: string[];
  databases: string[];
  cloud_devops: string[];
  ai_data: string[];
  tools: string[];
  soft_skills: string[];
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  employment_type: string;
  technologies: string[];
  domains: string[];
  responsibilities: string[];
  achievements: string[];
  metrics: string[];
  collaboration: string[];
  evidence_links: Link[];
  narrative: string;
  confidence: Confidence;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  role: string;
  technologies: string[];
  problem: string;
  solution: string;
  features: string[];
  technical_depth: string[];
  achievements: string[];
  metrics: string[];
  links: Link[];
  tier: string;
  narrative: string;
  confidence: Confidence;
}

export interface Preferences {
  target_locations: string[];
  target_roles: string[];
  industries: string[];
  default_cv_variant: string;
}

export interface MasterCv {
  profile: Profile;
  online_presence: OnlinePresence;
  education: Education[];
  skills: Skills;
  certifications: Certification[];
  work_experience: WorkExperience[];
  projects: Project[];
  preferences: Preferences;
}
```

- [ ] **Step 3: Create `frontend/src/types/application.ts`**

Create `frontend/src/types/application.ts`:

```typescript
export interface JdInput {
  type: string;
  source: string;
  extracted_text: string;
}

export interface SourceTrace {
  claim: string;
  source_id: string;
  excerpt: string;
}

export interface DocumentSection {
  heading: string;
  items: string[];
}

export interface CvDocument {
  title: string;
  contact_header: string;
  sections: DocumentSection[];
  source_traces: SourceTrace[];
}

export interface ApplicationDocuments {
  ats_cv: CvDocument;
  portfolio_cv: CvDocument;
  cover_letter: string;
}

export interface ReviewScores {
  truthfulness: number;
  jd_alignment: number;
  evidence_strength: number;
  ats_safety: number;
  layout_and_length: number;
  impact_and_quantification: number;
  nz_au_convention_fit: number;
  cover_letter_quality: number;
}

export interface ReviewResult {
  passed: boolean;
  overall_score: number;
  scores: ReviewScores;
  blocking_issues: string[];
  warnings: string[];
  suggested_revisions: string[];
}

export interface ApplicationRun {
  application_id: string;
  company: string;
  role_title: string;
  location: string;
  mode: string;
  jd_input: JdInput;
  generated_documents: Record<string, unknown>;
  review_result: Record<string, unknown>;
  exports: Record<string, string>;
}
```

- [ ] **Step 4: Create `frontend/src/types/settings.ts`**

Create `frontend/src/types/settings.ts`:

```typescript
export type AppMode = 'assisted' | 'auto';

export interface Settings {
  ai_model: string;
  default_mode: AppMode;
  gap_questions_enabled: boolean;
  max_revision_loops: number;
  ai_provider: string;
  data_dir: string;
  openai_api_key_env: string;
}

export type EditableSettings = Pick<
  Settings,
  'ai_model' | 'default_mode' | 'gap_questions_enabled' | 'max_revision_loops'
>;
```

- [ ] **Step 5: Verify TypeScript compiles**

Run:
```bash
cd frontend
npx tsc --noEmit
```
Expected: errors only in pages that need to be rewritten — `MasterCvEditor.tsx` (uses old `Profile` shape) is the most likely culprit. That's fine for this task; the page rewrites in later tasks fix them. As long as the type files themselves compile cleanly, this step is done.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/types/masterCv.ts frontend/src/types/application.ts frontend/src/types/settings.ts
git commit -m "feat(frontend): expand MasterCv types and add application/settings type definitions"
```

---

## Task 5: Frontend API layer

**Files:**
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/src/api/applications.ts`
- Create: `frontend/src/api/settings.ts`

- [ ] **Step 1: Extend `client.ts` with `apiPost` and `apiPostForm`**

Replace the entire content of `frontend/src/api/client.ts` with:

```typescript
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body === 'object' && 'detail' in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === 'string') return detail;
    }
  } catch {
    // body wasn't JSON
  }
  return `${response.status} ${response.statusText}`.trim();
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${await readErrorMessage(response)}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`PUT ${path} failed: ${await readErrorMessage(response)}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, payload?: unknown): Promise<T> {
  const init: RequestInit = { method: 'POST' };
  if (payload !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(payload);
  }
  const response = await fetch(path, init);
  if (!response.ok) {
    throw new Error(`POST ${path} failed: ${await readErrorMessage(response)}`);
  }
  return response.json() as Promise<T>;
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(path, { method: 'POST', body: formData });
  if (!response.ok) {
    throw new Error(`POST ${path} failed: ${await readErrorMessage(response)}`);
  }
  return response.json() as Promise<T>;
}
```

- [ ] **Step 2: Create `frontend/src/api/applications.ts`**

Create `frontend/src/api/applications.ts`:

```typescript
import { apiGet, apiPost, apiPostForm, apiPut } from './client';
import type { ApplicationDocuments, ApplicationRun } from '../types/application';

export interface ApplicationMeta {
  company?: string;
  role_title?: string;
  location?: string;
  mode?: string;
}

export interface CreateApplicationRequest extends ApplicationMeta {
  jd_text: string;
}

export interface CreateFromUrlRequest extends ApplicationMeta {
  url: string;
}

function appendMeta(form: FormData, meta: ApplicationMeta): void {
  if (meta.company) form.append('company', meta.company);
  if (meta.role_title) form.append('role_title', meta.role_title);
  if (meta.location) form.append('location', meta.location);
  if (meta.mode) form.append('mode', meta.mode);
}

export function createApplication(payload: CreateApplicationRequest): Promise<ApplicationRun> {
  return apiPost<ApplicationRun>('/api/applications', payload);
}

export function createApplicationFromFile(
  file: File,
  meta: ApplicationMeta
): Promise<ApplicationRun> {
  const form = new FormData();
  form.append('file', file);
  appendMeta(form, meta);
  return apiPostForm<ApplicationRun>('/api/applications/from-file', form);
}

export function createApplicationFromFixture(
  file: File,
  meta: ApplicationMeta
): Promise<ApplicationRun> {
  const form = new FormData();
  form.append('file', file);
  appendMeta(form, meta);
  return apiPostForm<ApplicationRun>('/api/applications/from-fixture', form);
}

export function createApplicationFromUrl(payload: CreateFromUrlRequest): Promise<ApplicationRun> {
  return apiPost<ApplicationRun>('/api/applications/from-url', payload);
}

export function listApplications(): Promise<ApplicationRun[]> {
  return apiGet<ApplicationRun[]>('/api/applications');
}

export function getApplication(applicationId: string): Promise<ApplicationRun> {
  return apiGet<ApplicationRun>(`/api/applications/${applicationId}`);
}

export function generateApplication(applicationId: string): Promise<ApplicationRun> {
  return apiPost<ApplicationRun>(`/api/applications/${applicationId}/generate`);
}

export function saveDocuments(
  applicationId: string,
  documents: ApplicationDocuments
): Promise<ApplicationRun> {
  return apiPut<ApplicationRun>(`/api/applications/${applicationId}/documents`, documents);
}

export function exportApplication(applicationId: string): Promise<ApplicationRun> {
  return apiPost<ApplicationRun>(`/api/applications/${applicationId}/export`);
}

export function getExportUrl(applicationId: string, filename: string): string {
  return `/api/applications/${applicationId}/exports/${filename}`;
}
```

- [ ] **Step 3: Create `frontend/src/api/settings.ts`**

Create `frontend/src/api/settings.ts`:

```typescript
import { apiGet, apiPut } from './client';
import type { EditableSettings, Settings } from '../types/settings';

export function getSettings(): Promise<Settings> {
  return apiGet<Settings>('/api/settings');
}

export function saveSettings(payload: EditableSettings): Promise<Settings> {
  return apiPut<Settings>('/api/settings', payload);
}
```

- [ ] **Step 4: Type-check the new files**

Run:
```bash
cd frontend
npx tsc --noEmit
```
Expected: same set of errors as Task 4 Step 5 (page rewrites still pending) — but no errors in the `api/` or `types/` folders.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/client.ts frontend/src/api/applications.ts frontend/src/api/settings.ts
git commit -m "feat(frontend): add applications and settings API helpers"
```

---

## Task 6: Frontend `App.tsx` navigation

**Files:**
- Rewrite: `frontend/src/App.tsx`

- [ ] **Step 1: Replace `App.tsx` with the navigation-aware version**

Replace the entire content of `frontend/src/App.tsx` with:

```tsx
import { Layout, Menu, theme } from 'antd';
import { useState } from 'react';

import ApplicationWorkspace from './pages/ApplicationWorkspace';
import Dashboard from './pages/Dashboard';
import GeneratedDocuments from './pages/GeneratedDocuments';
import MasterCvEditor from './pages/MasterCvEditor';
import Settings from './pages/Settings';

const { Content, Sider } = Layout;

export type PageKey =
  | 'dashboard'
  | 'masterCv'
  | 'applicationWorkspace'
  | 'generatedDocuments'
  | 'settings';

export type NavigateFn = (page: PageKey, runId?: string) => void;

const menuItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'masterCv', label: 'Master CV' },
  { key: 'applicationWorkspace', label: 'Application Workspace' },
  { key: 'generatedDocuments', label: 'Generated Documents' },
  { key: 'settings', label: 'Settings' }
];

export default function App() {
  const [selectedKey, setSelectedKey] = useState<PageKey>('dashboard');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const {
    token: { colorBgContainer, borderRadiusLG }
  } = theme.useToken();

  const navigate: NavigateFn = (page, runId) => {
    setSelectedKey(page);
    setSelectedRunId(runId ?? null);
  };

  function renderPage() {
    switch (selectedKey) {
      case 'dashboard':
        return <Dashboard navigate={navigate} />;
      case 'masterCv':
        return <MasterCvEditor />;
      case 'applicationWorkspace':
        return <ApplicationWorkspace navigate={navigate} />;
      case 'generatedDocuments':
        return <GeneratedDocuments navigate={navigate} selectedRunId={selectedRunId} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard navigate={navigate} />;
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div
          style={{
            color: 'white',
            fontSize: 20,
            fontWeight: 600,
            padding: '24px 16px'
          }}
        >
          CV Builder
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => {
            setSelectedKey(key as PageKey);
            setSelectedRunId(null);
          }}
        />
      </Sider>
      <Layout>
        <Content style={{ margin: 24 }}>
          <div
            style={{
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              minHeight: 360,
              padding: 24
            }}
          >
            {renderPage()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
```

- [ ] **Step 2: Run the existing App test to verify the menu still renders**

Run:
```bash
cd frontend
npx vitest run src/App.test.tsx
```
Expected: TypeScript may now complain inside `Dashboard.tsx`, `ApplicationWorkspace.tsx`, `GeneratedDocuments.tsx` because they don't accept the new props yet. Test fails compile-wise. That's fine — this is a checkpoint commit; pages get rewritten in the next tasks.

If you need a temporary green checkpoint for the build, simply leave this commit out and bundle the App rewrite into Task 7 instead. Otherwise:

- [ ] **Step 3: Commit (no test run required since pages are about to be rewritten)**

```bash
git add frontend/src/App.tsx
git commit -m "feat(frontend): wire navigate prop and selectedRunId state into App.tsx"
```

---

## Task 7: Frontend Dashboard page

**Files:**
- Rewrite: `frontend/src/pages/Dashboard.tsx`
- Create: `frontend/src/pages/Dashboard.test.tsx`

- [ ] **Step 1: Write the Dashboard test file**

Create `frontend/src/pages/Dashboard.test.tsx`:

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as applicationsApi from '../api/applications';
import * as masterCvApi from '../api/masterCv';
import type { ApplicationRun } from '../types/application';
import type { MasterCv } from '../types/masterCv';
import Dashboard from './Dashboard';

vi.mock('../api/applications');
vi.mock('../api/masterCv');

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

function makeMasterCv(overrides: Partial<MasterCv> = {}): MasterCv {
  return {
    profile: {
      full_name: 'Alex Chen',
      preferred_name: '',
      headline: '',
      location: '',
      phone: '',
      email: 'alex@example.com',
      github_url: '',
      linkedin_url: '',
      portfolio_url: '',
      personal_website_url: '',
      target_roles: [],
      summary_source: 'Junior dev focused on backend Python.',
      work_authorisation: '',
      referees: 'available_on_request'
    },
    online_presence: {
      github: { url: '', profile_readme_summary: '', pinned_projects: [] },
      linkedin: { url: '', headline: '', summary: '' },
      portfolio: { url: '', featured_links: [] },
      other_links: []
    },
    education: [
      {
        institution: 'Uni',
        qualification: 'BSc',
        location: '',
        start_date: '',
        end_date: '',
        highlights: []
      }
    ],
    skills: {
      languages: ['Python'],
      frameworks: [],
      databases: [],
      cloud_devops: [],
      ai_data: [],
      tools: [],
      soft_skills: []
    },
    certifications: [{ name: 'AWS', issuer: 'Amazon', date: '', url: '' }],
    work_experience: [
      {
        id: 'work_001',
        company: 'Acme',
        title: 'Dev',
        location: '',
        start_date: '',
        end_date: '',
        employment_type: '',
        technologies: [],
        domains: [],
        responsibilities: [],
        achievements: [],
        metrics: [],
        collaboration: [],
        evidence_links: [],
        narrative: '',
        confidence: { facts_verified: true, needs_user_review: [] }
      }
    ],
    projects: [
      {
        id: 'project_001',
        name: 'RAG',
        type: 'personal',
        status: '',
        role: '',
        technologies: [],
        problem: '',
        solution: '',
        features: [],
        technical_depth: [],
        achievements: [],
        metrics: [],
        links: [],
        tier: 'A',
        narrative: '',
        confidence: { facts_verified: true, needs_user_review: [] }
      }
    ],
    preferences: {
      target_locations: [],
      target_roles: [],
      industries: [],
      default_cv_variant: 'ats'
    },
    ...overrides
  };
}

const sampleRun: ApplicationRun = {
  application_id: 'app_001',
  company: 'TechCo',
  role_title: 'Junior Developer',
  location: 'Auckland',
  mode: 'assisted',
  jd_input: { type: 'text', source: 'inline', extracted_text: '' },
  generated_documents: { ats_cv: { title: 'ATS CV' } },
  review_result: {},
  exports: {}
};

describe('Dashboard', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.mocked(masterCvApi.getMasterCv).mockResolvedValue(makeMasterCv());
    vi.mocked(applicationsApi.listApplications).mockResolvedValue([sampleRun]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows completeness fraction with sample master CV', async () => {
    render(<Dashboard navigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/sections complete/i)).toBeInTheDocument());
    expect(screen.getByText(/7 \/ 7 sections complete/i)).toBeInTheDocument();
  });

  it('lists recent runs from the API', async () => {
    render(<Dashboard navigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Junior Developer')).toBeInTheDocument());
    expect(screen.getByText(/TechCo/)).toBeInTheDocument();
  });

  it('navigates to documents when View is clicked on a run', async () => {
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<Dashboard navigate={navigate} />);
    await waitFor(() => screen.getByText('Junior Developer'));
    await user.click(screen.getByRole('button', { name: /view/i }));
    expect(navigate).toHaveBeenCalledWith('generatedDocuments', 'app_001');
  });

  it('navigates to workspace when New Application is clicked', async () => {
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<Dashboard navigate={navigate} />);
    await waitFor(() => screen.getByText(/sections complete/i));
    await user.click(screen.getByRole('button', { name: /new application/i }));
    expect(navigate).toHaveBeenCalledWith('applicationWorkspace');
  });
});
```

- [ ] **Step 2: Implement Dashboard**

Replace the entire content of `frontend/src/pages/Dashboard.tsx` with:

```tsx
import { CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons';
import { Button, Card, Col, Empty, List, Progress, Row, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { listApplications } from '../api/applications';
import { getMasterCv } from '../api/masterCv';
import type { NavigateFn } from '../App';
import type { ApplicationRun } from '../types/application';
import type { MasterCv } from '../types/masterCv';

interface SectionStatus {
  name: string;
  done: boolean;
}

interface CompletenessSummary {
  done: number;
  total: number;
  sections: SectionStatus[];
}

function calcCompleteness(cv: MasterCv): CompletenessSummary {
  const sections: SectionStatus[] = [
    { name: 'Profile', done: Boolean(cv.profile.full_name && cv.profile.email) },
    { name: 'Summary', done: Boolean(cv.profile.summary_source) },
    {
      name: 'Skills',
      done:
        cv.skills.languages.length +
          cv.skills.frameworks.length +
          cv.skills.databases.length +
          cv.skills.cloud_devops.length +
          cv.skills.ai_data.length +
          cv.skills.tools.length +
          cv.skills.soft_skills.length >
        0
    },
    { name: 'Work Experience', done: cv.work_experience.length > 0 },
    { name: 'Projects', done: cv.projects.length > 0 },
    { name: 'Education', done: cv.education.length > 0 },
    { name: 'Certifications', done: cv.certifications.length > 0 }
  ];
  const done = sections.filter((s) => s.done).length;
  return { done, total: sections.length, sections };
}

function isGenerated(run: ApplicationRun): boolean {
  const docs = run.generated_documents;
  return Boolean(docs && Object.keys(docs).length > 0);
}

interface Props {
  navigate: NavigateFn;
}

export default function Dashboard({ navigate }: Props) {
  const [cv, setCv] = useState<MasterCv | null>(null);
  const [runs, setRuns] = useState<ApplicationRun[]>([]);
  const [loadingCv, setLoadingCv] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);

  useEffect(() => {
    getMasterCv()
      .then((loaded) => setCv(loaded))
      .catch(() => setCv(null))
      .finally(() => setLoadingCv(false));
    listApplications()
      .then((loaded) => setRuns([...loaded].reverse().slice(0, 5)))
      .catch(() => setRuns([]))
      .finally(() => setLoadingRuns(false));
  }, []);

  const completeness = cv ? calcCompleteness(cv) : null;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={2}>Dashboard</Typography.Title>
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="Master CV Completeness" loading={loadingCv}>
            {completeness ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Progress
                  percent={Math.round((completeness.done / completeness.total) * 100)}
                  format={() => `${completeness.done} / ${completeness.total} sections complete`}
                />
                <List
                  size="small"
                  dataSource={completeness.sections}
                  renderItem={(section) => (
                    <List.Item>
                      <Space>
                        {section.done ? (
                          <CheckCircleTwoTone twoToneColor="#52c41a" />
                        ) : (
                          <CloseCircleTwoTone twoToneColor="#ff4d4f" />
                        )}
                        <Typography.Text>{section.name}</Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Space>
            ) : (
              <Empty description="Master CV unavailable" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Recent Applications"
            loading={loadingRuns}
            extra={
              <Button type="primary" onClick={() => navigate('applicationWorkspace')}>
                New Application
              </Button>
            }
          >
            {runs.length === 0 ? (
              <Empty description="No application runs yet." />
            ) : (
              <List
                dataSource={runs}
                renderItem={(run) => (
                  <List.Item
                    actions={[
                      <Button
                        key="view"
                        type="link"
                        onClick={() => navigate('generatedDocuments', run.application_id)}
                      >
                        View
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={run.role_title || '(Untitled role)'}
                      description={run.company || '(No company)'}
                    />
                    <Space>
                      <Tag color={run.mode === 'auto' ? 'blue' : 'purple'}>{run.mode}</Tag>
                      <Tag color={isGenerated(run) ? 'green' : 'default'}>
                        {isGenerated(run) ? 'Generated' : 'Draft'}
                      </Tag>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
```

- [ ] **Step 3: Run the Dashboard tests**

Run:
```bash
cd frontend
npx vitest run src/pages/Dashboard.test.tsx
```
Expected: 4 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Dashboard.tsx frontend/src/pages/Dashboard.test.tsx
git commit -m "feat(frontend): implement Dashboard with completeness card and recent runs"
```

---

## Task 8: Frontend Application Workspace

**Files:**
- Rewrite: `frontend/src/pages/ApplicationWorkspace.tsx`
- Create: `frontend/src/pages/ApplicationWorkspace.test.tsx`

- [ ] **Step 1: Write the Application Workspace test file**

Create `frontend/src/pages/ApplicationWorkspace.test.tsx`:

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { message } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '../api/applications';
import type { ApplicationRun } from '../types/application';
import ApplicationWorkspace from './ApplicationWorkspace';

vi.mock('../api/applications');

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

const baseRun: ApplicationRun = {
  application_id: 'app_001',
  company: 'TechCo',
  role_title: 'Junior Developer',
  location: 'Auckland',
  mode: 'assisted',
  jd_input: { type: 'text', source: 'inline', extracted_text: 'Python, FastAPI' },
  generated_documents: {},
  review_result: {},
  exports: {}
};

describe('ApplicationWorkspace', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.mocked(api.listApplications).mockResolvedValue([]);
    vi.mocked(api.createApplication).mockResolvedValue(baseRun);
    vi.mocked(api.generateApplication).mockResolvedValue({
      ...baseRun,
      generated_documents: { ats_cv: { title: 'ATS CV' } }
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders all four JD input tabs including SEEK Fixture JSON', async () => {
    render(<ApplicationWorkspace navigate={vi.fn()} />);
    expect(await screen.findByText('Text')).toBeInTheDocument();
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('SEEK Fixture JSON')).toBeInTheDocument();
  });

  it('calls createApplication then generateApplication and navigates on success', async () => {
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<ApplicationWorkspace navigate={navigate} />);

    const textArea = await screen.findByPlaceholderText(/paste the job description/i);
    await user.type(textArea, 'Python role.');
    await user.click(screen.getByRole('button', { name: /create & generate/i }));

    await waitFor(() => expect(api.createApplication).toHaveBeenCalledTimes(1));
    expect(api.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({ jd_text: 'Python role.', mode: 'assisted' })
    );
    await waitFor(() =>
      expect(api.generateApplication).toHaveBeenCalledWith('app_001')
    );
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('generatedDocuments', 'app_001')
    );
  });

  it('shows an error and does not navigate when generation fails', async () => {
    vi.mocked(api.generateApplication).mockRejectedValue(new Error('boom'));
    const messageError = vi
      .spyOn(message, 'error')
      .mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
    const navigate = vi.fn();
    const user = userEvent.setup();
    render(<ApplicationWorkspace navigate={navigate} />);

    const textArea = await screen.findByPlaceholderText(/paste the job description/i);
    await user.type(textArea, 'Python role.');
    await user.click(screen.getByRole('button', { name: /create & generate/i }));

    await waitFor(() => expect(messageError).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement Application Workspace**

Replace the entire content of `frontend/src/pages/ApplicationWorkspace.tsx` with:

```tsx
import { InboxOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  List,
  Radio,
  Row,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  Upload,
  message
} from 'antd';
import type { UploadFile } from 'antd';
import { useEffect, useState } from 'react';

import {
  createApplication,
  createApplicationFromFile,
  createApplicationFromFixture,
  createApplicationFromUrl,
  generateApplication,
  listApplications
} from '../api/applications';
import type { ApplicationMeta } from '../api/applications';
import type { NavigateFn } from '../App';
import type { ApplicationRun } from '../types/application';

interface MetaFormValues {
  company?: string;
  role_title?: string;
  location?: string;
  mode: string;
}

interface Props {
  navigate: NavigateFn;
}

function isGenerated(run: ApplicationRun): boolean {
  const docs = run.generated_documents;
  return Boolean(docs && Object.keys(docs).length > 0);
}

export default function ApplicationWorkspace({ navigate }: Props) {
  const [form] = Form.useForm<MetaFormValues>();
  const [activeTab, setActiveTab] = useState<'text' | 'file' | 'url' | 'fixture'>('text');
  const [jdText, setJdText] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [jdFiles, setJdFiles] = useState<UploadFile[]>([]);
  const [fixtureFiles, setFixtureFiles] = useState<UploadFile[]>([]);
  const [runs, setRuns] = useState<ApplicationRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyTip, setBusyTip] = useState('');

  async function refreshRuns() {
    try {
      const all = await listApplications();
      setRuns([...all].reverse());
    } catch {
      setRuns([]);
    }
  }

  useEffect(() => {
    refreshRuns();
  }, []);

  function readMeta(): ApplicationMeta {
    const values = form.getFieldsValue();
    return {
      company: values.company,
      role_title: values.role_title,
      location: values.location,
      mode: values.mode
    };
  }

  async function handleCreateAndGenerate() {
    const meta = readMeta();
    let created: ApplicationRun;

    setBusy(true);
    setBusyTip('Creating…');
    try {
      if (activeTab === 'text') {
        if (!jdText.trim()) {
          message.error('Please paste the JD text.');
          setBusy(false);
          return;
        }
        created = await createApplication({ ...meta, jd_text: jdText });
      } else if (activeTab === 'file') {
        const file = jdFiles[0]?.originFileObj as File | undefined;
        if (!file) {
          message.error('Please attach a JD file.');
          setBusy(false);
          return;
        }
        created = await createApplicationFromFile(file, meta);
      } else if (activeTab === 'fixture') {
        const file = fixtureFiles[0]?.originFileObj as File | undefined;
        if (!file) {
          message.error('Please attach a SEEK fixture JSON file.');
          setBusy(false);
          return;
        }
        created = await createApplicationFromFixture(file, meta);
      } else {
        if (!jdUrl.trim()) {
          message.error('Please enter a job URL.');
          setBusy(false);
          return;
        }
        created = await createApplicationFromUrl({ ...meta, url: jdUrl });
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create application run.');
      setBusy(false);
      return;
    }

    setBusyTip('Generating…');
    try {
      await generateApplication(created.application_id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Generation failed.');
      setBusy(false);
      await refreshRuns();
      return;
    }

    setBusy(false);
    await refreshRuns();
    message.success('Application generated.');
    navigate('generatedDocuments', created.application_id);
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={2}>Application Workspace</Typography.Title>
      <Spin spinning={busy} tip={busyTip}>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={14}>
            <Card title="Create Application Run">
              <Form form={form} layout="vertical" initialValues={{ mode: 'assisted' }}>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item label="Company" name="company">
                      <Input placeholder="e.g. TechCo" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Role Title" name="role_title">
                      <Input placeholder="e.g. Junior AI Developer" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item label="Location" name="location">
                      <Input placeholder="e.g. Auckland" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Mode" name="mode">
                  <Radio.Group>
                    <Radio value="assisted">Assisted</Radio>
                    <Radio value="auto">Auto</Radio>
                  </Radio.Group>
                </Form.Item>
                <Tabs
                  activeKey={activeTab}
                  onChange={(key) => setActiveTab(key as typeof activeTab)}
                  items={[
                    {
                      key: 'text',
                      label: 'Text',
                      children: (
                        <Form.Item label="Job Description Text">
                          <Input.TextArea
                            rows={8}
                            value={jdText}
                            onChange={(event) => setJdText(event.target.value)}
                            placeholder="Paste the job description here…"
                          />
                        </Form.Item>
                      )
                    },
                    {
                      key: 'file',
                      label: 'File',
                      children: (
                        <Form.Item label="Upload JD file (.txt, .pdf, .docx, .md)">
                          <Upload.Dragger
                            accept=".txt,.pdf,.docx,.md"
                            maxCount={1}
                            beforeUpload={() => false}
                            fileList={jdFiles}
                            onChange={({ fileList }) => setJdFiles(fileList)}
                          >
                            <p className="ant-upload-drag-icon">
                              <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Click or drag a JD file here.</p>
                          </Upload.Dragger>
                        </Form.Item>
                      )
                    },
                    {
                      key: 'url',
                      label: 'URL',
                      children: (
                        <Form.Item label="Job posting URL">
                          <Input
                            value={jdUrl}
                            onChange={(event) => setJdUrl(event.target.value)}
                            placeholder="https://nz.seek.com/job/…"
                          />
                        </Form.Item>
                      )
                    },
                    {
                      key: 'fixture',
                      label: 'SEEK Fixture JSON',
                      children: (
                        <Form.Item label="Upload a SEEK-style job fixture JSON (e.g. from ref/jobs/)">
                          <Upload.Dragger
                            accept=".json"
                            maxCount={1}
                            beforeUpload={() => false}
                            fileList={fixtureFiles}
                            onChange={({ fileList }) => setFixtureFiles(fileList)}
                          >
                            <p className="ant-upload-drag-icon">
                              <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">
                              Click or drag a SEEK fixture JSON here.
                            </p>
                          </Upload.Dragger>
                        </Form.Item>
                      )
                    }
                  ]}
                />
                <Button type="primary" onClick={handleCreateAndGenerate} disabled={busy}>
                  Create &amp; Generate
                </Button>
              </Form>
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Recent Runs">
              {runs.length === 0 ? (
                <Empty description="No application runs yet." />
              ) : (
                <List
                  dataSource={runs}
                  renderItem={(run) => (
                    <List.Item
                      actions={[
                        <Button
                          key="view"
                          type="link"
                          onClick={() => navigate('generatedDocuments', run.application_id)}
                        >
                          View
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        title={run.role_title || '(Untitled role)'}
                        description={run.company || '(No company)'}
                      />
                      <Space>
                        <Tag color={run.mode === 'auto' ? 'blue' : 'purple'}>{run.mode}</Tag>
                        <Tag color={isGenerated(run) ? 'green' : 'default'}>
                          {isGenerated(run) ? 'Generated' : 'Draft'}
                        </Tag>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </Space>
  );
}
```

- [ ] **Step 3: Run Application Workspace tests**

Run:
```bash
cd frontend
npx vitest run src/pages/ApplicationWorkspace.test.tsx
```
Expected: 3 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ApplicationWorkspace.tsx frontend/src/pages/ApplicationWorkspace.test.tsx
git commit -m "feat(frontend): implement Application Workspace with JD ingestion and create+generate flow"
```

---

## Task 9: Frontend Generated Documents (block editor)

**Files:**
- Rewrite: `frontend/src/pages/GeneratedDocuments.tsx`
- Create: `frontend/src/pages/GeneratedDocuments.test.tsx`

- [ ] **Step 1: Write the Generated Documents test file**

Create `frontend/src/pages/GeneratedDocuments.test.tsx`:

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '../api/applications';
import type { ApplicationRun } from '../types/application';
import GeneratedDocuments from './GeneratedDocuments';

vi.mock('../api/applications');

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

const fullRun: ApplicationRun = {
  application_id: 'app_001',
  company: 'TechCo',
  role_title: 'Junior Developer',
  location: 'Auckland',
  mode: 'assisted',
  jd_input: { type: 'text', source: 'inline', extracted_text: 'Python role' },
  generated_documents: {
    ats_cv: {
      title: 'ATS CV',
      contact_header: 'Alex Chen | Auckland | alex@example.com',
      sections: [
        { heading: 'SUMMARY', items: ['Junior dev focused on backend Python.'] },
        { heading: 'TECHNICAL SKILLS', items: ['Languages: Python, TypeScript'] }
      ],
      source_traces: []
    },
    portfolio_cv: {
      title: 'Portfolio CV',
      contact_header: 'Alex Chen',
      sections: [{ heading: 'PROJECTS', items: ['StudyMate RAG'] }],
      source_traces: []
    },
    cover_letter: 'Dear Hiring Manager,\nI am writing about the role.'
  },
  review_result: {
    passed: true,
    overall_score: 85,
    scores: { truthfulness: 95, jd_alignment: 80 },
    blocking_issues: [],
    warnings: [],
    suggested_revisions: ['Add metrics']
  },
  exports: {}
};

describe('GeneratedDocuments', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.mocked(api.listApplications).mockResolvedValue([fullRun]);
    vi.mocked(api.getApplication).mockResolvedValue(fullRun);
    vi.mocked(api.saveDocuments).mockImplementation((_id, docs) =>
      Promise.resolve({ ...fullRun, generated_documents: docs as unknown as Record<string, unknown> })
    );
    vi.mocked(api.exportApplication).mockResolvedValue({
      ...fullRun,
      exports: {
        ats_cv: 'ats_cv.pdf',
        portfolio_cv: 'portfolio_cv.pdf',
        cover_letter: 'cover_letter.pdf'
      }
    });
    vi.mocked(api.getExportUrl).mockImplementation(
      (id, filename) => `/api/applications/${id}/exports/${filename}`
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders contact header and section bullets as inputs for ATS CV', async () => {
    render(<GeneratedDocuments navigate={vi.fn()} selectedRunId="app_001" />);

    expect(
      await screen.findByDisplayValue('Alex Chen | Auckland | alex@example.com')
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue('SUMMARY')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Junior dev focused on backend Python.')
    ).toBeInTheDocument();
  });

  it('adds a bullet when Add bullet is clicked', async () => {
    const user = userEvent.setup();
    render(<GeneratedDocuments navigate={vi.fn()} selectedRunId="app_001" />);

    await screen.findByDisplayValue('SUMMARY');
    const addBulletButtons = screen.getAllByRole('button', { name: /add bullet/i });
    await user.click(addBulletButtons[0]);

    const summaryInputs = screen
      .getAllByRole('textbox')
      .filter((el) => (el as HTMLTextAreaElement).value === '');
    expect(summaryInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('reorders sections via the down arrow', async () => {
    const user = userEvent.setup();
    render(<GeneratedDocuments navigate={vi.fn()} selectedRunId="app_001" />);

    await screen.findByDisplayValue('SUMMARY');
    const downButtons = screen.getAllByRole('button', { name: /move section down/i });
    await user.click(downButtons[0]);

    const sectionInputs = screen
      .getAllByRole('textbox')
      .map((el) => (el as HTMLInputElement).value);
    const indexOfSummary = sectionInputs.indexOf('SUMMARY');
    const indexOfSkills = sectionInputs.indexOf('TECHNICAL SKILLS');
    expect(indexOfSkills).toBeLessThan(indexOfSummary);
  });

  it('saves edited documents through saveDocuments when Save Changes is clicked', async () => {
    const user = userEvent.setup();
    render(<GeneratedDocuments navigate={vi.fn()} selectedRunId="app_001" />);

    await screen.findByDisplayValue('SUMMARY');
    const saveButtons = screen.getAllByRole('button', { name: /save changes/i });
    await user.click(saveButtons[0]);

    await waitFor(() =>
      expect(api.saveDocuments).toHaveBeenCalledWith(
        'app_001',
        expect.objectContaining({
          ats_cv: expect.any(Object),
          portfolio_cv: expect.any(Object),
          cover_letter: expect.any(String)
        })
      )
    );
  });

  it('exports PDFs and shows download buttons', async () => {
    const user = userEvent.setup();
    render(<GeneratedDocuments navigate={vi.fn()} selectedRunId="app_001" />);

    await screen.findByDisplayValue('SUMMARY');
    await user.click(screen.getByRole('button', { name: /export pdfs/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /download ats_cv\.pdf/i })).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /download portfolio_cv\.pdf/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download cover_letter\.pdf/i })).toBeInTheDocument();
  });

  it('shows the review badge and overall score', async () => {
    render(<GeneratedDocuments navigate={vi.fn()} selectedRunId="app_001" />);
    const reviewCard = await screen.findByText('Review Result');
    const card = reviewCard.closest('.ant-card') as HTMLElement;
    expect(within(card).getByText(/passed/i)).toBeInTheDocument();
    expect(within(card).getByText(/85/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement Generated Documents (block editor)**

Replace the entire content of `frontend/src/pages/GeneratedDocuments.tsx` with:

```tsx
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Input,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import {
  exportApplication,
  getApplication,
  getExportUrl,
  listApplications,
  saveDocuments
} from '../api/applications';
import type { NavigateFn } from '../App';
import type {
  ApplicationDocuments,
  ApplicationRun,
  CvDocument,
  DocumentSection
} from '../types/application';

interface Props {
  navigate: NavigateFn;
  selectedRunId: string | null;
}

function emptyCvDocument(title: string): CvDocument {
  return {
    title,
    contact_header: '',
    sections: [],
    source_traces: []
  };
}

function emptyDocuments(): ApplicationDocuments {
  return {
    ats_cv: emptyCvDocument('ATS CV'),
    portfolio_cv: emptyCvDocument('Portfolio CV'),
    cover_letter: ''
  };
}

function coerceDocuments(raw: Record<string, unknown>): ApplicationDocuments {
  const ats = (raw.ats_cv as Partial<CvDocument>) ?? {};
  const portfolio = (raw.portfolio_cv as Partial<CvDocument>) ?? {};
  const coverLetter = typeof raw.cover_letter === 'string' ? raw.cover_letter : '';
  return {
    ats_cv: {
      title: ats.title ?? 'ATS CV',
      contact_header: ats.contact_header ?? '',
      sections: ats.sections ?? [],
      source_traces: ats.source_traces ?? []
    },
    portfolio_cv: {
      title: portfolio.title ?? 'Portfolio CV',
      contact_header: portfolio.contact_header ?? '',
      sections: portfolio.sections ?? [],
      source_traces: portfolio.source_traces ?? []
    },
    cover_letter: coverLetter
  };
}

interface CvBlockEditorProps {
  doc: CvDocument;
  onChange: (next: CvDocument) => void;
}

function CvBlockEditor({ doc, onChange }: CvBlockEditorProps) {
  function setContact(value: string) {
    onChange({ ...doc, contact_header: value });
  }

  function setSection(index: number, next: DocumentSection) {
    const sections = doc.sections.slice();
    sections[index] = next;
    onChange({ ...doc, sections });
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= doc.sections.length) return;
    const sections = doc.sections.slice();
    [sections[index], sections[target]] = [sections[target], sections[index]];
    onChange({ ...doc, sections });
  }

  function deleteSection(index: number) {
    const sections = doc.sections.filter((_, i) => i !== index);
    onChange({ ...doc, sections });
  }

  function addSection() {
    onChange({
      ...doc,
      sections: [...doc.sections, { heading: '', items: [''] }]
    });
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div>
        <Typography.Text type="secondary">Contact Header</Typography.Text>
        <Input
          value={doc.contact_header}
          onChange={(event) => setContact(event.target.value)}
          placeholder="Name | Location | Phone | Email | LinkedIn | GitHub"
        />
      </div>
      {doc.sections.length === 0 ? (
        <Empty description="No sections yet. Click Add Section to start." />
      ) : (
        doc.sections.map((section, index) => (
          <Card
            key={index}
            size="small"
            title={
              <Input
                value={section.heading}
                onChange={(event) => setSection(index, { ...section, heading: event.target.value })}
                placeholder="Section heading (e.g. WORK EXPERIENCE)"
                style={{ fontWeight: 600 }}
              />
            }
            extra={
              <Space size="small">
                <Button
                  size="small"
                  icon={<ArrowUpOutlined />}
                  aria-label={`Move section ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => moveSection(index, -1)}
                />
                <Button
                  size="small"
                  icon={<ArrowDownOutlined />}
                  aria-label={`Move section ${index + 1} down`}
                  disabled={index === doc.sections.length - 1}
                  onClick={() => moveSection(index, 1)}
                />
                <Popconfirm
                  title="Delete this section?"
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteSection(index)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} aria-label={`Delete section ${index + 1}`} />
                </Popconfirm>
              </Space>
            }
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {section.items.map((item, bulletIndex) => (
                <Row key={bulletIndex} gutter={8} align="top" wrap={false}>
                  <Col flex="auto">
                    <Input.TextArea
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      value={item}
                      onChange={(event) => {
                        const items = section.items.slice();
                        items[bulletIndex] = event.target.value;
                        setSection(index, { ...section, items });
                      }}
                      placeholder="Bullet"
                    />
                  </Col>
                  <Col flex="32px">
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={`Remove bullet ${bulletIndex + 1}`}
                      onClick={() => {
                        const items = section.items.filter((_, i) => i !== bulletIndex);
                        setSection(index, { ...section, items });
                      }}
                    />
                  </Col>
                </Row>
              ))}
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setSection(index, { ...section, items: [...section.items, ''] })}
              >
                Add bullet
              </Button>
            </Space>
          </Card>
        ))
      )}
      <Button type="dashed" icon={<PlusOutlined />} onClick={addSection} block>
        Add Section
      </Button>
    </Space>
  );
}

interface ReviewSummary {
  passed: boolean;
  overall_score: number;
  scores: Record<string, number>;
  blocking_issues: string[];
  warnings: string[];
  suggested_revisions: string[];
}

function coerceReview(raw: Record<string, unknown>): ReviewSummary | null {
  if (!raw || Object.keys(raw).length === 0) return null;
  return {
    passed: Boolean(raw.passed),
    overall_score: typeof raw.overall_score === 'number' ? raw.overall_score : 0,
    scores: (raw.scores as Record<string, number>) ?? {},
    blocking_issues: Array.isArray(raw.blocking_issues) ? (raw.blocking_issues as string[]) : [],
    warnings: Array.isArray(raw.warnings) ? (raw.warnings as string[]) : [],
    suggested_revisions: Array.isArray(raw.suggested_revisions)
      ? (raw.suggested_revisions as string[])
      : []
  };
}

export default function GeneratedDocuments({ navigate, selectedRunId }: Props) {
  const [runs, setRuns] = useState<ApplicationRun[]>([]);
  const [currentRunId, setCurrentRunId] = useState<string | null>(selectedRunId);
  const [docs, setDocs] = useState<ApplicationDocuments>(emptyDocuments());
  const [reviewRaw, setReviewRaw] = useState<Record<string, unknown>>({});
  const [exports, setExports] = useState<Record<string, string>>({});
  const [loadingRun, setLoadingRun] = useState(false);
  const [savingKey, setSavingKey] = useState<'ats' | 'portfolio' | 'cover' | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    listApplications()
      .then((all) => {
        setRuns(all);
        if (selectedRunId) {
          setCurrentRunId(selectedRunId);
        } else if (all.length > 0) {
          setCurrentRunId(all[all.length - 1].application_id);
        }
      })
      .catch(() => setRuns([]));
  }, [selectedRunId]);

  useEffect(() => {
    if (!currentRunId) return;
    setLoadingRun(true);
    getApplication(currentRunId)
      .then((run) => {
        setDocs(coerceDocuments(run.generated_documents ?? {}));
        setReviewRaw(run.review_result ?? {});
        setExports(run.exports ?? {});
      })
      .catch((err) => {
        message.error(err instanceof Error ? err.message : 'Failed to load run.');
        setDocs(emptyDocuments());
        setReviewRaw({});
        setExports({});
      })
      .finally(() => setLoadingRun(false));
  }, [currentRunId]);

  const review = useMemo(() => coerceReview(reviewRaw), [reviewRaw]);

  async function handleSave(scope: 'ats' | 'portfolio' | 'cover') {
    if (!currentRunId) return;
    setSavingKey(scope);
    try {
      await saveDocuments(currentRunId, docs);
      message.success('CV saved.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleExport() {
    if (!currentRunId) return;
    setExporting(true);
    try {
      const updated = await exportApplication(currentRunId);
      setExports(updated.exports ?? {});
      message.success('PDFs exported.');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={2}>Generated Documents</Typography.Title>

      {runs.length === 0 ? (
        <Empty description="No application runs available. Create one in Application Workspace first." />
      ) : (
        <>
          <Select
            style={{ width: 480, maxWidth: '100%' }}
            value={currentRunId ?? undefined}
            onChange={(value) => setCurrentRunId(value)}
            placeholder="Select an application run"
            options={runs.map((run) => ({
              value: run.application_id,
              label: `${run.role_title || '(Untitled)'} @ ${run.company || '—'} [${run.application_id}]`
            }))}
          />

          {currentRunId && (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card
                title="ATS CV"
                loading={loadingRun}
                extra={
                  <Button
                    type="primary"
                    loading={savingKey === 'ats'}
                    onClick={() => handleSave('ats')}
                  >
                    Save Changes
                  </Button>
                }
              >
                <CvBlockEditor
                  doc={docs.ats_cv}
                  onChange={(next) => setDocs({ ...docs, ats_cv: next })}
                />
              </Card>

              <Card
                title="Portfolio CV"
                loading={loadingRun}
                extra={
                  <Button
                    type="primary"
                    loading={savingKey === 'portfolio'}
                    onClick={() => handleSave('portfolio')}
                  >
                    Save Changes
                  </Button>
                }
              >
                <CvBlockEditor
                  doc={docs.portfolio_cv}
                  onChange={(next) => setDocs({ ...docs, portfolio_cv: next })}
                />
              </Card>

              <Card
                title="Cover Letter"
                loading={loadingRun}
                extra={
                  <Button
                    type="primary"
                    loading={savingKey === 'cover'}
                    onClick={() => handleSave('cover')}
                  >
                    Save Changes
                  </Button>
                }
              >
                <Input.TextArea
                  value={docs.cover_letter}
                  onChange={(event) => setDocs({ ...docs, cover_letter: event.target.value })}
                  autoSize={{ minRows: 6, maxRows: 24 }}
                  placeholder="Cover letter text…"
                />
              </Card>

              <Card title="Review Result" loading={loadingRun}>
                {review ? (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Space size="middle">
                      <Tag color={review.passed ? 'green' : 'red'}>
                        {review.passed ? 'Passed' : 'Failed'}
                      </Tag>
                      <Progress
                        type="circle"
                        size={64}
                        percent={Math.max(0, Math.min(100, review.overall_score))}
                      />
                    </Space>
                    {Object.keys(review.scores).length > 0 && (
                      <Descriptions size="small" column={2} bordered>
                        {Object.entries(review.scores).map(([key, value]) => (
                          <Descriptions.Item key={key} label={key.replace(/_/g, ' ')}>
                            {value}
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    )}
                    {review.blocking_issues.length > 0 && (
                      <Alert
                        type="error"
                        message="Blocking Issues"
                        description={
                          <ul style={{ paddingLeft: 16, margin: 0 }}>
                            {review.blocking_issues.map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        }
                      />
                    )}
                    {review.suggested_revisions.length > 0 && (
                      <div>
                        <Typography.Text strong>Suggested Revisions</Typography.Text>
                        <ul style={{ paddingLeft: 16, marginTop: 4 }}>
                          {review.suggested_revisions.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Space>
                ) : (
                  <Empty description="No review result yet." />
                )}
              </Card>

              <Card title="Export PDFs">
                <Space direction="vertical" size="middle">
                  <Button type="primary" loading={exporting} onClick={handleExport}>
                    Export PDFs
                  </Button>
                  {Object.keys(exports).length > 0 && (
                    <Space wrap>
                      {(['ats_cv', 'portfolio_cv', 'cover_letter'] as const).map((key) =>
                        exports[key] ? (
                          <Button
                            key={key}
                            icon={<DownloadOutlined />}
                            aria-label={`Download ${exports[key]}`}
                            onClick={() =>
                              window.open(getExportUrl(currentRunId, exports[key]), '_blank')
                            }
                          >
                            Download {exports[key]}
                          </Button>
                        ) : null
                      )}
                    </Space>
                  )}
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Note: export uses the last saved CV state; save your edits first.
                  </Typography.Text>
                </Space>
              </Card>

              <Divider />
            </Space>
          )}
        </>
      )}
    </Space>
  );
}
```

- [ ] **Step 3: Run Generated Documents tests**

Run:
```bash
cd frontend
npx vitest run src/pages/GeneratedDocuments.test.tsx
```
Expected: 6 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/GeneratedDocuments.tsx frontend/src/pages/GeneratedDocuments.test.tsx
git commit -m "feat(frontend): implement Generated Documents page with CV block editor and export"
```

---

## Task 10: Frontend Master CV Editor (split pane)

**Files:**
- Rewrite: `frontend/src/pages/MasterCvEditor.tsx`
- Modify: `frontend/src/pages/MasterCvEditor.test.tsx`

- [ ] **Step 1: Update the Master CV editor test fixture and add new tests**

Replace the entire content of `frontend/src/pages/MasterCvEditor.test.tsx` with:

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { message } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMasterCv, saveMasterCv } from '../api/masterCv';
import type { MasterCv } from '../types/masterCv';
import MasterCvEditor from './MasterCvEditor';

vi.mock('../api/masterCv', () => ({
  getMasterCv: vi.fn(),
  saveMasterCv: vi.fn()
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

function emptyMasterCv(): MasterCv {
  return {
    profile: {
      full_name: 'Alex Chen',
      preferred_name: '',
      headline: '',
      location: '',
      phone: '',
      email: 'alex@example.com',
      github_url: 'https://github.com/alexchen',
      linkedin_url: 'https://linkedin.com/in/alexchen',
      portfolio_url: '',
      personal_website_url: '',
      target_roles: [],
      summary_source: '',
      work_authorisation: '',
      referees: 'available_on_request'
    },
    online_presence: {
      github: { url: '', profile_readme_summary: '', pinned_projects: [] },
      linkedin: { url: '', headline: '', summary: '' },
      portfolio: { url: '', featured_links: [] },
      other_links: []
    },
    education: [],
    skills: {
      languages: [],
      frameworks: [],
      databases: [],
      cloud_devops: [],
      ai_data: [],
      tools: [],
      soft_skills: []
    },
    certifications: [],
    work_experience: [],
    projects: [],
    preferences: {
      target_locations: [],
      target_roles: [],
      industries: [],
      default_cv_variant: 'ats'
    }
  };
}

const getMasterCvMock = vi.mocked(getMasterCv);
const saveMasterCvMock = vi.mocked(saveMasterCv);

describe('MasterCvEditor', () => {
  beforeEach(() => {
    stubMatchMedia();
    getMasterCvMock.mockReset();
    saveMasterCvMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('disables saving before load and enables it after fields load', async () => {
    const loaded = deferred<MasterCv>();
    getMasterCvMock.mockReturnValue(loaded.promise);

    render(<MasterCvEditor />);

    const saveButton = screen.getByRole('button', { name: /save master cv/i });
    expect(saveButton).toBeDisabled();

    loaded.resolve(emptyMasterCv());

    await waitFor(() => expect(screen.getByDisplayValue('Alex Chen')).toBeInTheDocument());
    expect(saveButton).toBeEnabled();
  });

  it('saves the loaded master CV merged with submitted form values', async () => {
    const user = userEvent.setup();
    const cv = emptyMasterCv();
    getMasterCvMock.mockResolvedValue(cv);
    saveMasterCvMock.mockImplementation((payload) => Promise.resolve(payload));

    render(<MasterCvEditor />);

    const nameInput = await screen.findByDisplayValue('Alex Chen');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jordan Smith');
    await user.click(screen.getByRole('button', { name: /save master cv/i }));

    await waitFor(() =>
      expect(saveMasterCvMock).toHaveBeenCalledWith(
        expect.objectContaining({
          profile: expect.objectContaining({ full_name: 'Jordan Smith' })
        })
      )
    );
  });

  it('shows an error when loading fails', async () => {
    const messageError = vi
      .spyOn(message, 'error')
      .mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
    getMasterCvMock.mockRejectedValue(new Error('load failed'));

    render(<MasterCvEditor />);

    await waitFor(() =>
      expect(messageError).toHaveBeenCalledWith('Unable to load master CV')
    );
    expect(screen.getByRole('button', { name: /save master cv/i })).toBeDisabled();
  });

  it('shows an error and re-enables saving when saving fails', async () => {
    const user = userEvent.setup();
    const messageError = vi
      .spyOn(message, 'error')
      .mockImplementation(() => undefined as unknown as ReturnType<typeof message.error>);
    getMasterCvMock.mockResolvedValue(emptyMasterCv());
    saveMasterCvMock.mockRejectedValue(new Error('save failed'));

    render(<MasterCvEditor />);

    await screen.findByDisplayValue('Alex Chen');
    const saveButton = screen.getByRole('button', { name: /save master cv/i });
    await user.click(saveButton);

    await waitFor(() =>
      expect(messageError).toHaveBeenCalledWith('Unable to save master CV')
    );
    expect(saveButton).toBeEnabled();
  });

  it('renders all main tabs and the live preview', async () => {
    getMasterCvMock.mockResolvedValue(emptyMasterCv());
    render(<MasterCvEditor />);

    await screen.findByDisplayValue('Alex Chen');
    expect(screen.getByRole('tab', { name: /profile & summary/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^skills$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^work experience$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^projects$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^education$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^certifications$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^preferences$/i })).toBeInTheDocument();
    // Preview pane shows the name from profile
    const preview = screen.getByTestId('cv-preview');
    expect(within(preview).getByText('Alex Chen')).toBeInTheDocument();
  });

  it('adds a new work experience entry when Add Work Experience is clicked', async () => {
    const user = userEvent.setup();
    getMasterCvMock.mockResolvedValue(emptyMasterCv());
    render(<MasterCvEditor />);

    await screen.findByDisplayValue('Alex Chen');
    await user.click(screen.getByRole('tab', { name: /^work experience$/i }));
    await user.click(screen.getByRole('button', { name: /add work experience/i }));

    expect(
      await screen.findByText(/new work experience entry/i)
    ).toBeInTheDocument();
  });

  it('adds a new project entry when Add Project is clicked', async () => {
    const user = userEvent.setup();
    getMasterCvMock.mockResolvedValue(emptyMasterCv());
    render(<MasterCvEditor />);

    await screen.findByDisplayValue('Alex Chen');
    await user.click(screen.getByRole('tab', { name: /^projects$/i }));
    await user.click(screen.getByRole('button', { name: /add project/i }));

    expect(await screen.findByText(/new project entry/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement Master CV Editor with split pane**

Replace the entire content of `frontend/src/pages/MasterCvEditor.tsx` with:

```tsx
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Tabs,
  Typography,
  message
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { getMasterCv, saveMasterCv } from '../api/masterCv';
import type { MasterCv } from '../types/masterCv';

type FormShape = MasterCv;

function emptyMasterCv(): MasterCv {
  return {
    profile: {
      full_name: '',
      preferred_name: '',
      headline: '',
      location: '',
      phone: '',
      email: '',
      github_url: '',
      linkedin_url: '',
      portfolio_url: '',
      personal_website_url: '',
      target_roles: [],
      summary_source: '',
      work_authorisation: '',
      referees: 'available_on_request'
    },
    online_presence: {
      github: { url: '', profile_readme_summary: '', pinned_projects: [] },
      linkedin: { url: '', headline: '', summary: '' },
      portfolio: { url: '', featured_links: [] },
      other_links: []
    },
    education: [],
    skills: {
      languages: [],
      frameworks: [],
      databases: [],
      cloud_devops: [],
      ai_data: [],
      tools: [],
      soft_skills: []
    },
    certifications: [],
    work_experience: [],
    projects: [],
    preferences: {
      target_locations: [],
      target_roles: [],
      industries: [],
      default_cv_variant: 'ats'
    }
  };
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function newWorkEntry() {
  return {
    id: newId('work'),
    company: '',
    title: '',
    location: '',
    start_date: '',
    end_date: '',
    employment_type: '',
    technologies: [],
    domains: [],
    responsibilities: [],
    achievements: [],
    metrics: [],
    collaboration: [],
    evidence_links: [],
    narrative: '',
    confidence: { facts_verified: true, needs_user_review: [] }
  };
}

function newProjectEntry() {
  return {
    id: newId('project'),
    name: '',
    type: 'personal',
    status: '',
    role: '',
    technologies: [],
    problem: '',
    solution: '',
    features: [],
    technical_depth: [],
    achievements: [],
    metrics: [],
    links: [],
    tier: 'B',
    narrative: '',
    confidence: { facts_verified: true, needs_user_review: [] }
  };
}

function newEducationEntry() {
  return {
    institution: '',
    qualification: '',
    location: '',
    start_date: '',
    end_date: '',
    highlights: []
  };
}

function newCertificationEntry() {
  return { name: '', issuer: '', date: '', url: '' };
}

interface CvPreviewProps {
  cv: MasterCv;
}

function joinNonEmpty(parts: (string | undefined | null)[], sep: string): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join(sep);
}

function CvPreview({ cv }: CvPreviewProps) {
  const contactLine = joinNonEmpty(
    [
      cv.profile.location,
      cv.profile.phone,
      cv.profile.email,
      cv.profile.linkedin_url,
      cv.profile.github_url,
      cv.profile.portfolio_url
    ],
    ' | '
  );

  const skillEntries: [string, string[]][] = [
    ['Languages', cv.skills.languages],
    ['Frameworks', cv.skills.frameworks],
    ['Databases', cv.skills.databases],
    ['Cloud / DevOps', cv.skills.cloud_devops],
    ['AI / Data', cv.skills.ai_data],
    ['Tools', cv.skills.tools],
    ['Soft skills', cv.skills.soft_skills]
  ].filter(([, items]) => items.length > 0) as [string, string[]][];

  const featuredProjects = cv.projects.filter((p) => p.tier === 'A' || p.tier === 'B');

  return (
    <div
      data-testid="cv-preview"
      style={{
        padding: 16,
        background: '#ffffff',
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        fontFamily: 'Calibri, Arial, sans-serif',
        fontSize: 14,
        lineHeight: 1.45,
        minHeight: 480
      }}
    >
      <Typography.Title level={3} style={{ marginBottom: 4 }}>
        {cv.profile.full_name || 'Your Name'}
      </Typography.Title>
      {contactLine && (
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {contactLine}
        </Typography.Text>
      )}

      {cv.profile.summary_source && (
        <>
          <Typography.Title level={5} style={{ textTransform: 'uppercase', marginTop: 12 }}>
            Summary
          </Typography.Title>
          <Typography.Paragraph>{cv.profile.summary_source}</Typography.Paragraph>
        </>
      )}

      {skillEntries.length > 0 && (
        <>
          <Typography.Title level={5} style={{ textTransform: 'uppercase', marginTop: 12 }}>
            Technical Skills
          </Typography.Title>
          {skillEntries.map(([label, items]) => (
            <div key={label}>
              <strong>{label}:</strong> {items.join(', ')}
            </div>
          ))}
        </>
      )}

      {cv.work_experience.length > 0 && (
        <>
          <Typography.Title level={5} style={{ textTransform: 'uppercase', marginTop: 16 }}>
            Work Experience
          </Typography.Title>
          {cv.work_experience.map((entry) => {
            const headerLine = joinNonEmpty([entry.title, entry.company, entry.employment_type], ' | ');
            const dateLine = joinNonEmpty([entry.location, joinNonEmpty([entry.start_date, entry.end_date], ' – ')], ' | ');
            return (
              <div key={entry.id} style={{ marginBottom: 12 }}>
                {headerLine && <div><strong>{headerLine}</strong></div>}
                {dateLine && <Typography.Text type="secondary">{dateLine}</Typography.Text>}
                {(entry.responsibilities.length + entry.achievements.length) > 0 && (
                  <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                    {entry.responsibilities.map((r, i) => <li key={`r-${i}`}>{r}</li>)}
                    {entry.achievements.map((a, i) => <li key={`a-${i}`}>{a}</li>)}
                  </ul>
                )}
                {entry.narrative && (
                  <Typography.Paragraph style={{ fontStyle: 'italic' }}>
                    {entry.narrative}
                  </Typography.Paragraph>
                )}
              </div>
            );
          })}
        </>
      )}

      {featuredProjects.length > 0 && (
        <>
          <Typography.Title level={5} style={{ textTransform: 'uppercase', marginTop: 16 }}>
            Selected Projects
          </Typography.Title>
          {featuredProjects.map((p) => {
            const headerLine = joinNonEmpty([p.name, p.tier ? `[Tier ${p.tier}]` : '', p.type], ' | ');
            const techLine = p.technologies.length > 0 ? `Technologies: ${p.technologies.join(', ')}` : '';
            return (
              <div key={p.id} style={{ marginBottom: 12 }}>
                {headerLine && <div><strong>{headerLine}</strong></div>}
                {techLine && <Typography.Text type="secondary">{techLine}</Typography.Text>}
                {(p.features.length + p.achievements.length) > 0 && (
                  <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                    {p.features.map((f, i) => <li key={`f-${i}`}>{f}</li>)}
                    {p.achievements.map((a, i) => <li key={`a-${i}`}>{a}</li>)}
                  </ul>
                )}
                {p.narrative && <Typography.Paragraph style={{ fontStyle: 'italic' }}>{p.narrative}</Typography.Paragraph>}
              </div>
            );
          })}
        </>
      )}

      {cv.education.length > 0 && (
        <>
          <Typography.Title level={5} style={{ textTransform: 'uppercase', marginTop: 16 }}>
            Education
          </Typography.Title>
          {cv.education.map((edu, idx) => {
            const headerLine = joinNonEmpty([edu.qualification, edu.institution, edu.location], ' | ');
            const dates = joinNonEmpty([edu.start_date, edu.end_date], ' – ');
            return (
              <div key={idx} style={{ marginBottom: 8 }}>
                {headerLine && <div><strong>{headerLine}</strong></div>}
                {dates && <Typography.Text type="secondary">{dates}</Typography.Text>}
                {edu.highlights.length > 0 && (
                  <ul style={{ paddingLeft: 20, marginTop: 4 }}>
                    {edu.highlights.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </>
      )}

      {cv.certifications.length > 0 && (
        <>
          <Typography.Title level={5} style={{ textTransform: 'uppercase', marginTop: 16 }}>
            Certifications
          </Typography.Title>
          {cv.certifications.map((cert, idx) => (
            <div key={idx}>
              {joinNonEmpty([cert.name, cert.issuer, cert.date], ' | ')}
            </div>
          ))}
        </>
      )}

      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        Referees available on request
      </Typography.Paragraph>
    </div>
  );
}

function StringListField({ name }: { name: (string | number)[] }) {
  return (
    <Form.List name={name}>
      {(fields, { add, remove }) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {fields.map((field) => (
            <Row key={field.key} gutter={8} align="middle" wrap={false}>
              <Col flex="auto">
                <Form.Item {...field} noStyle>
                  <Input placeholder="…" />
                </Form.Item>
              </Col>
              <Col flex="32px">
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => remove(field.name)}
                  aria-label="Remove item"
                />
              </Col>
            </Row>
          ))}
          <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add('')}>
            Add
          </Button>
        </Space>
      )}
    </Form.List>
  );
}

export default function MasterCvEditor() {
  const [form] = Form.useForm<FormShape>();
  const [masterCv, setMasterCv] = useState<MasterCv | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewCv, setPreviewCv] = useState<MasterCv>(emptyMasterCv());

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getMasterCv()
      .then((loaded) => {
        if (!mounted) return;
        setMasterCv(loaded);
        form.setFieldsValue(loaded);
        setPreviewCv(loaded);
      })
      .catch(() => {
        if (mounted) message.error('Unable to load master CV');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [form]);

  function handleValuesChange() {
    const values = form.getFieldsValue(true) as Partial<MasterCv>;
    setPreviewCv({ ...emptyMasterCv(), ...masterCv, ...values } as MasterCv);
  }

  async function handleSave(values: FormShape) {
    if (!masterCv) {
      message.error('Unable to save master CV');
      return;
    }
    const payload: MasterCv = { ...masterCv, ...values };
    setSaving(true);
    try {
      const saved = await saveMasterCv(payload);
      setMasterCv(saved);
      form.setFieldsValue(saved);
      setPreviewCv(saved);
      message.success('Master CV saved');
    } catch {
      message.error('Unable to save master CV');
    } finally {
      setSaving(false);
    }
  }

  const profileTab = (
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Form.Item label="Full name" name={['profile', 'full_name']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Preferred name" name={['profile', 'preferred_name']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Headline" name={['profile', 'headline']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Location" name={['profile', 'location']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Phone" name={['profile', 'phone']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Email" name={['profile', 'email']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="GitHub URL" name={['profile', 'github_url']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="LinkedIn URL" name={['profile', 'linkedin_url']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Portfolio URL" name={['profile', 'portfolio_url']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Personal website URL" name={['profile', 'personal_website_url']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24}>
        <Form.Item label="Target roles" name={['profile', 'target_roles']}>
          <Select mode="tags" tokenSeparators={[',']} placeholder="e.g. Junior AI Developer" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Work authorisation" name={['profile', 'work_authorisation']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Referees" name={['profile', 'referees']}>
          <Input />
        </Form.Item>
      </Col>
      <Col xs={24}>
        <Form.Item label="Summary / Profile statement" name={['profile', 'summary_source']}>
          <Input.TextArea rows={4} placeholder="One short paragraph (35–80 words)…" />
        </Form.Item>
      </Col>
    </Row>
  );

  const skillsTab = (
    <Row gutter={16}>
      {(
        [
          ['Languages', 'languages'],
          ['Frameworks', 'frameworks'],
          ['Databases', 'databases'],
          ['Cloud / DevOps', 'cloud_devops'],
          ['AI / Data', 'ai_data'],
          ['Tools', 'tools'],
          ['Soft skills', 'soft_skills']
        ] as const
      ).map(([label, key]) => (
        <Col xs={24} md={12} key={key}>
          <Form.Item label={label} name={['skills', key]}>
            <Select mode="tags" tokenSeparators={[',']} placeholder={`Add ${label.toLowerCase()}…`} />
          </Form.Item>
        </Col>
      ))}
    </Row>
  );

  const workExperienceTab = (
    <Form.List name="work_experience">
      {(fields, { add, remove }) => (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {fields.length === 0 && (
            <Alert
              type="info"
              message="No work experience yet."
              description="Click Add Work Experience to create your first entry."
            />
          )}
          {fields.map((field) => (
            <Card
              key={field.key}
              size="small"
              title={
                <Form.Item
                  noStyle
                  shouldUpdate={(prev, next) =>
                    prev.work_experience?.[field.name]?.title !==
                      next.work_experience?.[field.name]?.title ||
                    prev.work_experience?.[field.name]?.company !==
                      next.work_experience?.[field.name]?.company
                  }
                >
                  {({ getFieldValue }) => {
                    const title = getFieldValue(['work_experience', field.name, 'title']) || '';
                    const company =
                      getFieldValue(['work_experience', field.name, 'company']) || '';
                    const headerText = title || company ? `${title}${company ? ` @ ${company}` : ''}` : 'New Work Experience entry';
                    return <Typography.Text strong>{headerText}</Typography.Text>;
                  }}
                </Form.Item>
              }
              extra={
                <Popconfirm
                  title="Remove this work experience entry?"
                  okText="Remove"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remove(field.name)}
                >
                  <Button danger size="small" icon={<DeleteOutlined />}>
                    Remove
                  </Button>
                </Popconfirm>
              }
            >
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item label="Company" name={[field.name, 'company']}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Title" name={[field.name, 'title']}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Location" name={[field.name, 'location']}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Start date" name={[field.name, 'start_date']}>
                    <Input placeholder="Month YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="End date" name={[field.name, 'end_date']}>
                    <Input placeholder="Month YYYY or Present" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Employment type" name={[field.name, 'employment_type']}>
                    <Input placeholder="e.g. Internship" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Technologies" name={[field.name, 'technologies']}>
                    <Select mode="tags" tokenSeparators={[',']} placeholder="Add tags…" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Responsibilities">
                    <StringListField name={[field.name, 'responsibilities']} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Achievements">
                    <StringListField name={[field.name, 'achievements']} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Narrative" name={[field.name, 'narrative']}>
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add(newWorkEntry())} block>
            Add Work Experience
          </Button>
        </Space>
      )}
    </Form.List>
  );

  const projectsTab = (
    <Form.List name="projects">
      {(fields, { add, remove }) => (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {fields.length === 0 && (
            <Alert
              type="info"
              message="No projects yet."
              description="Click Add Project to create your first entry."
            />
          )}
          {fields.map((field) => (
            <Card
              key={field.key}
              size="small"
              title={
                <Form.Item
                  noStyle
                  shouldUpdate={(prev, next) =>
                    prev.projects?.[field.name]?.name !== next.projects?.[field.name]?.name ||
                    prev.projects?.[field.name]?.tier !== next.projects?.[field.name]?.tier
                  }
                >
                  {({ getFieldValue }) => {
                    const name = getFieldValue(['projects', field.name, 'name']) || '';
                    const tier = getFieldValue(['projects', field.name, 'tier']) || '';
                    const header = name ? `${name}${tier ? ` [${tier}]` : ''}` : 'New Project entry';
                    return <Typography.Text strong>{header}</Typography.Text>;
                  }}
                </Form.Item>
              }
              extra={
                <Popconfirm
                  title="Remove this project entry?"
                  okText="Remove"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remove(field.name)}
                >
                  <Button danger size="small" icon={<DeleteOutlined />}>
                    Remove
                  </Button>
                </Popconfirm>
              }
            >
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item label="Name" name={[field.name, 'name']}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Type" name={[field.name, 'type']}>
                    <Select
                      options={[
                        { value: 'commercial', label: 'Commercial' },
                        { value: 'academic', label: 'Academic' },
                        { value: 'personal', label: 'Personal' },
                        { value: 'open_source', label: 'Open source' }
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Tier" name={[field.name, 'tier']}>
                    <Select
                      options={[
                        { value: 'A', label: 'A' },
                        { value: 'B', label: 'B' },
                        { value: 'C', label: 'C' }
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Status" name={[field.name, 'status']}>
                    <Input placeholder="e.g. shipped, in development" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Role" name={[field.name, 'role']}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Technologies" name={[field.name, 'technologies']}>
                    <Select mode="tags" tokenSeparators={[',']} placeholder="Add tags…" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Problem" name={[field.name, 'problem']}>
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Solution" name={[field.name, 'solution']}>
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Features">
                    <StringListField name={[field.name, 'features']} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Achievements">
                    <StringListField name={[field.name, 'achievements']} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Narrative" name={[field.name, 'narrative']}>
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add(newProjectEntry())} block>
            Add Project
          </Button>
        </Space>
      )}
    </Form.List>
  );

  const educationTab = (
    <Form.List name="education">
      {(fields, { add, remove }) => (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {fields.length === 0 && (
            <Alert
              type="info"
              message="No education entries yet."
              description="Click Add Education to create your first entry."
            />
          )}
          {fields.map((field) => (
            <Card
              key={field.key}
              size="small"
              title={
                <Form.Item
                  noStyle
                  shouldUpdate={(prev, next) =>
                    prev.education?.[field.name]?.qualification !==
                      next.education?.[field.name]?.qualification ||
                    prev.education?.[field.name]?.institution !==
                      next.education?.[field.name]?.institution
                  }
                >
                  {({ getFieldValue }) => {
                    const q = getFieldValue(['education', field.name, 'qualification']) || '';
                    const i = getFieldValue(['education', field.name, 'institution']) || '';
                    return <Typography.Text strong>{q || i ? `${q}${i ? ` — ${i}` : ''}` : 'New Education entry'}</Typography.Text>;
                  }}
                </Form.Item>
              }
              extra={
                <Popconfirm
                  title="Remove this education entry?"
                  okText="Remove"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remove(field.name)}
                >
                  <Button danger size="small" icon={<DeleteOutlined />}>
                    Remove
                  </Button>
                </Popconfirm>
              }
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Institution" name={[field.name, 'institution']}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Qualification" name={[field.name, 'qualification']}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Location" name={[field.name, 'location']}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Start date" name={[field.name, 'start_date']}>
                    <Input placeholder="Month YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="End date" name={[field.name, 'end_date']}>
                    <Input placeholder="Month YYYY or Present" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Highlights">
                    <StringListField name={[field.name, 'highlights']} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add(newEducationEntry())} block>
            Add Education
          </Button>
        </Space>
      )}
    </Form.List>
  );

  const certificationsTab = (
    <Form.List name="certifications">
      {(fields, { add, remove }) => (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {fields.length === 0 && (
            <Alert
              type="info"
              message="No certifications yet."
              description="Click Add Certification to add your first entry."
            />
          )}
          {fields.map((field) => (
            <Card
              key={field.key}
              size="small"
              title={
                <Form.Item
                  noStyle
                  shouldUpdate={(prev, next) =>
                    prev.certifications?.[field.name]?.name !==
                    next.certifications?.[field.name]?.name
                  }
                >
                  {({ getFieldValue }) => {
                    const name = getFieldValue(['certifications', field.name, 'name']) || '';
                    return <Typography.Text strong>{name || 'New Certification entry'}</Typography.Text>;
                  }}
                </Form.Item>
              }
              extra={
                <Popconfirm
                  title="Remove this certification?"
                  okText="Remove"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remove(field.name)}
                >
                  <Button danger size="small" icon={<DeleteOutlined />}>
                    Remove
                  </Button>
                </Popconfirm>
              }
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Name" name={[field.name, 'name']}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Issuer" name={[field.name, 'issuer']}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Date" name={[field.name, 'date']}>
                    <Input placeholder="Month YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="URL" name={[field.name, 'url']}>
                    <Input placeholder="https://…" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add(newCertificationEntry())} block>
            Add Certification
          </Button>
        </Space>
      )}
    </Form.List>
  );

  const preferencesTab = (
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Form.Item label="Target locations" name={['preferences', 'target_locations']}>
          <Select mode="tags" tokenSeparators={[',']} placeholder="e.g. Auckland, Wellington" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Target roles" name={['preferences', 'target_roles']}>
          <Select mode="tags" tokenSeparators={[',']} placeholder="e.g. Junior AI Developer" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Industries" name={['preferences', 'industries']}>
          <Select mode="tags" tokenSeparators={[',']} placeholder="e.g. SaaS, FinTech" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Default CV variant" name={['preferences', 'default_cv_variant']}>
          <Radio.Group>
            <Radio value="ats">ATS</Radio>
            <Radio value="portfolio">Portfolio</Radio>
          </Radio.Group>
        </Form.Item>
      </Col>
    </Row>
  );

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={2}>Master CV</Typography.Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        onValuesChange={handleValuesChange}
        initialValues={emptyMasterCv()}
      >
        <Row gutter={24}>
          <Col xs={24} lg={13}>
            <Card>
              <Tabs
                items={[
                  { key: 'profile', label: 'Profile & Summary', children: profileTab },
                  { key: 'skills', label: 'Skills', children: skillsTab },
                  { key: 'work_experience', label: 'Work Experience', children: workExperienceTab },
                  { key: 'projects', label: 'Projects', children: projectsTab },
                  { key: 'education', label: 'Education', children: educationTab },
                  { key: 'certifications', label: 'Certifications', children: certificationsTab },
                  { key: 'preferences', label: 'Preferences', children: preferencesTab }
                ]}
              />
              <Button
                type="primary"
                htmlType="submit"
                disabled={loading || !masterCv || saving}
                loading={saving}
              >
                Save Master CV
              </Button>
            </Card>
          </Col>
          <Col xs={24} lg={11}>
            <Card title="Live Preview" bodyStyle={{ padding: 12 }}>
              <CvPreview cv={previewCv} />
            </Card>
          </Col>
        </Row>
      </Form>
    </Space>
  );
}
```

- [ ] **Step 3: Run Master CV editor tests**

Run:
```bash
cd frontend
npx vitest run src/pages/MasterCvEditor.test.tsx
```
Expected: 7 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/MasterCvEditor.tsx frontend/src/pages/MasterCvEditor.test.tsx
git commit -m "feat(frontend): expand Master CV editor with all sections, list editors, and live preview"
```

---

## Task 11: Frontend Settings page

**Files:**
- Rewrite: `frontend/src/pages/Settings.tsx`
- Create: `frontend/src/pages/Settings.test.tsx`

- [ ] **Step 1: Write the Settings test file**

Create `frontend/src/pages/Settings.test.tsx`:

```tsx
/// <reference types="@testing-library/jest-dom/vitest" />

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '../api/settings';
import type { Settings as SettingsType } from '../types/settings';
import Settings from './Settings';

vi.mock('../api/settings');

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

const sampleSettings: SettingsType = {
  ai_model: 'gpt-5.4',
  default_mode: 'assisted',
  gap_questions_enabled: true,
  max_revision_loops: 2,
  ai_provider: 'openai',
  data_dir: '/tmp/data',
  openai_api_key_env: 'OPENAI_API_KEY'
};

describe('Settings', () => {
  beforeEach(() => {
    stubMatchMedia();
    vi.mocked(api.getSettings).mockResolvedValue(sampleSettings);
    vi.mocked(api.saveSettings).mockImplementation((p) =>
      Promise.resolve({ ...sampleSettings, ...p })
    );
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads ai_model from API into the form', async () => {
    render(<Settings />);
    expect(await screen.findByDisplayValue('gpt-5.4')).toBeInTheDocument();
  });

  it('displays read-only fields', async () => {
    render(<Settings />);
    expect(await screen.findByText('openai')).toBeInTheDocument();
    expect(screen.getByText('/tmp/data')).toBeInTheDocument();
    expect(screen.getByText('OPENAI_API_KEY')).toBeInTheDocument();
  });

  it('calls saveSettings with editable fields only', async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await screen.findByDisplayValue('gpt-5.4');
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() =>
      expect(api.saveSettings).toHaveBeenCalledWith({
        ai_model: 'gpt-5.4',
        default_mode: 'assisted',
        gap_questions_enabled: true,
        max_revision_loops: 2
      })
    );
  });
});
```

- [ ] **Step 2: Implement the Settings page**

Replace the entire content of `frontend/src/pages/Settings.tsx` with:

```tsx
import {
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Space,
  Switch,
  Typography,
  message
} from 'antd';
import { useEffect, useState } from 'react';

import { getSettings, saveSettings } from '../api/settings';
import type { EditableSettings, Settings as SettingsType } from '../types/settings';

interface ReadOnlyFields {
  ai_provider: string;
  data_dir: string;
  openai_api_key_env: string;
}

export default function Settings() {
  const [form] = Form.useForm<EditableSettings>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [readOnly, setReadOnly] = useState<ReadOnlyFields>({
    ai_provider: '',
    data_dir: '',
    openai_api_key_env: ''
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSettings()
      .then((s: SettingsType) => {
        if (!mounted) return;
        form.setFieldsValue({
          ai_model: s.ai_model,
          default_mode: s.default_mode,
          gap_questions_enabled: s.gap_questions_enabled,
          max_revision_loops: s.max_revision_loops
        });
        setReadOnly({
          ai_provider: s.ai_provider,
          data_dir: s.data_dir,
          openai_api_key_env: s.openai_api_key_env
        });
      })
      .catch(() => {
        if (mounted) message.error('Failed to load settings');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [form]);

  async function handleSave(values: EditableSettings) {
    setSaving(true);
    try {
      await saveSettings(values);
      message.success('Settings saved');
    } catch {
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={2}>Settings</Typography.Title>
      <Row gutter={24}>
        <Col xs={24} md={14}>
          <Card title="AI &amp; Workflow Configuration">
            <Form form={form} layout="vertical" onFinish={handleSave}>
              <Form.Item label="AI Model" name="ai_model">
                <Input placeholder="gpt-5.4" />
              </Form.Item>
              <Form.Item label="Default Mode" name="default_mode">
                <Radio.Group>
                  <Radio value="assisted">Assisted</Radio>
                  <Radio value="auto">Auto</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item
                label="Gap Questions Enabled"
                name="gap_questions_enabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item label="Max Revision Loops" name="max_revision_loops">
                <InputNumber min={0} max={5} />
              </Form.Item>
              <Button type="primary" htmlType="submit" disabled={loading || saving} loading={saving}>
                Save Settings
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card title="System Configuration (read-only)">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="AI Provider">{readOnly.ai_provider}</Descriptions.Item>
              <Descriptions.Item label="Data Directory">{readOnly.data_dir}</Descriptions.Item>
              <Descriptions.Item label="API Key Env Var">
                {readOnly.openai_api_key_env}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
```

- [ ] **Step 3: Run Settings tests**

Run:
```bash
cd frontend
npx vitest run src/pages/Settings.test.tsx
```
Expected: 3 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Settings.tsx frontend/src/pages/Settings.test.tsx
git commit -m "feat(frontend): implement editable Settings page"
```

---

## Task 12: Final verification — full test suites and build

**Files:** none (verification only)

- [ ] **Step 1: Run the full backend test suite**

Run:
```bash
cd backend
uv run --extra dev pytest -v
```
Expected: every backend test PASSES, including:
- `test_health.py`
- `test_master_cv_api.py`
- `test_storage.py`
- `test_application_storage.py`
- `test_applications_api.py` (now including `test_put_documents_*`)
- `test_jd_ingestion.py`
- `test_ai_client.py`
- `test_workflow_skeleton.py`
- `test_workflow_api.py`
- `test_document_models.py`
- `test_pdf_renderer.py`
- `test_settings_api.py` (new — 5 tests)
- `test_e2e_smoke.py` (now 3 tests)

- [ ] **Step 2: Run the full frontend test suite**

Run:
```bash
cd frontend
npm test
```
Expected: every frontend test PASSES, including:
- `App.test.tsx`
- `MasterCvEditor.test.tsx` (extended)
- `Dashboard.test.tsx` (new)
- `ApplicationWorkspace.test.tsx` (new)
- `GeneratedDocuments.test.tsx` (new)
- `Settings.test.tsx` (new)

- [ ] **Step 3: Run the frontend production build**

Run:
```bash
cd frontend
npm run build
```
Expected: build succeeds. A Vite chunk-size warning about Ant Design bundle is OK (already known).

- [ ] **Step 4: Manual browser verification (per spec checklist)**

Start both servers (in two terminals):

```bash
cd backend
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```bash
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173` and walk through the manual checklist in `docs/superpowers/specs/2026-05-02-frontend-completion-design.md` under "Manual browser verification checklist". Tick each box only after the matching interaction works in the browser.

- [ ] **Step 5: Commit any final cleanups (optional)**

If the manual run surfaces small fixes (typos, missing icons, etc.) make them as small follow-up commits.

```bash
git status
# if changes:
git add <files>
git commit -m "fix(frontend): ..."
```

---

## Self-Review Notes

**Spec coverage check:**
- Backend Settings API → Task 1 ✓
- Backend `PUT /documents` → Task 2 ✓
- Backend E2E coverage → Task 3 ✓
- App.tsx navigation (`navigate`, `selectedRunId`) → Task 6 ✓
- Application Workspace (text/file/url/SEEK fixture, create+generate, recent runs, navigate to documents on success) → Task 8 ✓
- Generated Documents (run selector, ATS/Portfolio block editors, cover letter editor, review read-only, export + download) → Task 9 ✓
- Dashboard (completeness card, recent runs, New Application button) → Task 7 ✓
- Master CV Editor (split pane, all 7 tabs, Form.List for unlimited entries, live preview) → Task 10 ✓
- Settings (editable fields, read-only display, save) → Task 11 ✓
- @ant-design/icons added → Task 4 Step 1 ✓
- Type files (masterCv expanded, application, settings) → Task 4 ✓
- API layer (client.ts apiPost/apiPostForm, applications.ts, settings.ts) → Task 5 ✓
- Backend integration tests for full workflow → Task 3 ✓
- Manual browser checklist → Task 12 Step 4 ✓

**Type-consistency check:**
- `NavigateFn(page: PageKey, runId?: string)` is the same signature in App.tsx and consumed by Dashboard, ApplicationWorkspace, GeneratedDocuments. ✓
- `ApplicationDocuments`, `CvDocument`, `DocumentSection` are defined in `types/application.ts` (Task 4) and consumed in `api/applications.ts` (Task 5) and `GeneratedDocuments.tsx` (Task 9). ✓
- `EditableSettings` defined in `types/settings.ts` (Task 4) and consumed in `api/settings.ts` (Task 5) and `Settings.tsx` (Task 11). ✓
- Backend `EditableSettings` has the same four fields and same `default_mode` literal as the frontend `EditableSettings`. ✓
- `saveDocuments(id, ApplicationDocuments)` matches backend `PUT /api/applications/{id}/documents` accepting `ApplicationDocuments`. ✓
- `getExportUrl(id, filename)` returns the URL string used by `<Button onClick={() => window.open(...)}>`; matches backend `GET /api/applications/{id}/exports/{filename}`. ✓

**Placeholder scan:** No "TBD", "TODO", "implement later", "similar to", or "appropriate handling" appear in any task body. Every code step shows the actual code; every test step shows the actual test. ✓
