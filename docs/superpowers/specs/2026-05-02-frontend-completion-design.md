# CV Builder Frontend Completion Design

## Purpose

Complete the four placeholder frontend pages (Application Workspace, Generated Documents, Dashboard, Settings) and expand the Master CV Editor from profile-only to all sections. Add an editable backend settings API. The backend already exposes all required application and master CV endpoints; the only new backend work is the settings API.

## Approach

Props-based navigation: `App.tsx` holds `currentPage` and `selectedRunId` state and passes a `navigate(page, runId?)` function to pages that need cross-page jumps. No new routing libraries. No global state context. Each page is self-contained and independently testable.

## File Changes

### New frontend files

```
frontend/src/
  api/
    applications.ts     # createApplication, createFromFile, createFromFixture, createFromUrl,
                        # listApplications, getApplication, generateApplication,
                        # exportApplication, getExportUrl
    settings.ts         # getSettings, saveSettings
  types/
    application.ts      # ApplicationRun, JdInput, ApplicationDocuments,
                        # CvDocument, DocumentSection, ReviewResult
    settings.ts         # Settings
```

### Modified frontend files

```
frontend/src/
  App.tsx                          # add selectedRunId state, navigate prop
  pages/
    Dashboard.tsx                  # completeness card + recent runs card
    ApplicationWorkspace.tsx       # full JD input + create + generate flow
    GeneratedDocuments.tsx         # document viewer + export/download
    MasterCvEditor.tsx             # expand to all sections, split-pane layout
    Settings.tsx                   # editable settings form
```

### New backend files

```
backend/app/
  api/settings.py                  # GET /api/settings, PUT /api/settings
  services/settings_storage.py     # read/write data/settings.json
```

### Modified backend files

```
backend/app/main.py                # register settings router
backend/tests/
  test_settings_api.py             # GET/PUT settings tests
```

## Backend: Settings API

### Model (editable fields)

```json
{
  "ai_model": "gpt-5.4",
  "default_mode": "assisted",
  "gap_questions_enabled": true,
  "max_revision_loops": 2
}
```

Read-only fields (`ai_provider`, `data_dir`, `openai_api_key_env`) are exposed via `GET /api/settings` but not accepted in `PUT /api/settings`.

### Storage

`SettingsStorage` reads and writes `data/settings.json` under the configured data directory. If the file does not exist, `GET /api/settings` returns the defaults from `config.py`. `PUT /api/settings` merges the incoming editable fields over the current values and persists to `data/settings.json`.

### Endpoints

```http
GET  /api/settings   → SettingsResponse (editable + read-only fields)
PUT  /api/settings   → SettingsResponse (accepts editable fields only)
```

`SettingsResponse` includes all editable fields plus `ai_provider`, `data_dir`, `openai_api_key_env` as read-only strings.

## Frontend: App.tsx

Add `selectedRunId: string | null` state (default `null`). Define:

```ts
function navigate(page: string, runId?: string) {
  setCurrentPage(page);
  setSelectedRunId(runId ?? null);
}
```

Pass `navigate` as a prop to `ApplicationWorkspace` and `GeneratedDocuments`. Pass `selectedRunId` to `GeneratedDocuments`.

## Frontend: Application Workspace

### Layout

Two-column Ant Design `Row` / `Col` (col 14 left, col 10 right).

### Left panel — Create Run

Fields (all optional):
- Company (`Input`)
- Role Title (`Input`)
- Location (`Input`)
- Mode (`Radio.Group`: Assisted / Auto, default Assisted)

JD Input — Ant Design `Tabs` with four tabs:

**Text tab**
- `TextArea` (rows=8) for pasted JD text
- Create button calls `POST /api/applications` with `jd_text`

**File tab**
- `Upload` accepting `.txt`, `.pdf`, `.docx`, `.md`
- Create button calls `POST /api/applications/from-file` as multipart form

**URL tab**
- `Input` for job posting URL
- Create button calls `POST /api/applications/from-url`

**SEEK Fixture JSON tab**
- Description: "Upload a SEEK-style job fixture JSON (e.g. from ref/jobs/)"
- `Upload` accepting `.json`
- Backend reads `job.title`, `job.company.name`, `job.location.displayText`, `raw.bodyText`
- Create button calls `POST /api/applications/from-fixture` as multipart form

**Create & Generate flow:**
1. Call the appropriate create endpoint → receive `application_id`
2. Immediately call `POST /api/applications/{id}/generate`
3. On success: call `navigate('documents', application_id)`
4. Show a `Spin` overlay and status text ("Creating…" → "Generating…") during the two-step process
5. On error: show `message.error` with the API error message; leave the form intact

### Right panel — Recent Runs

`GET /api/applications` on mount (refresh after each create). Shows a list of runs:
- Company + role title
- Mode badge (Assisted / Auto)
- Status tag: "Generated" (if `generated_documents` is non-empty) / "Draft"
- "View" link: calls `navigate('documents', application_id)`

Empty state: "No application runs yet."

## Backend: Documents Save Endpoint

Add one new endpoint to `backend/app/api/applications.py`:

```http
PUT /api/applications/{application_id}/documents
```

Accepts an `ApplicationDocuments` payload. Merges the updated documents into the existing `ApplicationRun` and persists via `storage.save_application_run(run)`. Returns the full updated `ApplicationRun`.

This endpoint is called by the frontend whenever the user saves edits made in the CV block editor.

Add test coverage in `backend/tests/test_applications_api.py`:
- `PUT` with valid `ApplicationDocuments` → 200 + documents persisted
- `PUT` on unknown application_id → 404

## Frontend: Generated Documents

The Generated Documents page is a full **CV management view** — the selected run's documents are displayed and edited block by block. All edits are local state until the user saves explicitly.

### Run selector

`Select` dropdown populated from `GET /api/applications` on mount. If `selectedRunId` prop is set, it is pre-selected. On selection change, load `GET /api/applications/{id}` and populate local document state.

### Page layout

Single-page layout — no tabs wrapping the entire page. Instead:

- Run selector at top
- Below: four stacked named sections in a single scroll view:
  1. ATS CV (block editor)
  2. Portfolio CV (block editor)
  3. Cover Letter (text editor)
  4. Review (read-only)

Each named section has a section header with the title and a "Save Changes" button.

### CV block editor (ATS CV and Portfolio CV)

Each CV document is rendered as a list of editable blocks. A "block" is one `DocumentSection` (heading + bullet items).

**Contact header block:**
- Rendered as a single-line text input showing `contact_header`
- Editable inline

**Section blocks (one per `DocumentSection`):**

Each block displays:
- Section heading — editable `Input` (e.g. "TECHNICAL SKILLS", "WORK EXPERIENCE")
- Bullet list — each `item` in `items` is an editable `Input.TextArea` (single row, auto-expand)
- Per-bullet controls: delete icon on the right of each bullet
- "Add bullet" link at the bottom of the bullet list
- Block-level controls in the block header: drag handle (up/down arrows for reorder), delete block button

**Adding and removing blocks:**
- "Add Section" button at the bottom of the document adds a new blank block
- Deleting a block with the block-level delete button removes it from local state (Popconfirm to confirm)

**Reordering blocks:**
- Up/down arrow buttons on each block header move the block one position. No drag-and-drop required.

**Save Changes button (per document):**
- Calls `PUT /api/applications/{id}/documents` with the full updated `ApplicationDocuments` (both ATS and Portfolio CV sent together, cover letter included)
- Shows `message.success('CV saved')` on success
- Disabled while save is in-flight

### Cover Letter editor

Ant Design `Input.TextArea` (auto-size, min 6 rows) showing the `cover_letter` string. Editable directly. "Save Changes" button saves via `PUT /api/applications/{id}/documents`.

### Review section (read-only)

- `passed` shown as green/red `Tag` ("Passed" / "Failed")
- `overall_score` shown as Ant Design `Progress` bar (0–100)
- Score breakdown: Ant Design `Descriptions` component listing each score key/value
- `blocking_issues`: red `Alert` list (shown only if non-empty)
- `suggested_revisions`: bulleted list (shown only if non-empty)

### Export section

Fixed at the bottom of the page:
- "Export PDFs" `Button` (primary) → calls `POST /api/applications/{id}/export`
- After export: three download links (Ant Design `Button` type="link" with download icon):
  - "ATS CV PDF" → `/api/applications/{id}/exports/ats_cv.pdf`
  - "Portfolio CV PDF" → `/api/applications/{id}/exports/portfolio_cv.pdf`
  - "Cover Letter PDF" → `/api/applications/{id}/exports/cover_letter.pdf`
- Links open via `window.open` in a new tab
- Note: export uses the last saved state on the backend; unsaved edits are not included

Empty state (no run selected): "Select an application run above to view generated documents."

## Frontend: Dashboard

Two Ant Design `Card` components.

### Master CV Completeness card

Calculates completeness from the master CV loaded via `GET /api/master-cv` on mount:

| Section | Condition for "complete" |
|---------|--------------------------|
| Profile | `full_name` and `email` both non-empty |
| Summary | `summary_source` non-empty |
| Skills | at least one skill in any category |
| Work Experience | at least one entry |
| Projects | at least one entry |
| Education | at least one entry |
| Certifications | at least one entry |

Shows an Ant Design `Progress` bar (e.g., "5 / 7 sections complete") and a per-section `CheckCircleOutlined` / `CloseCircleOutlined` icon list.

### Recent Runs card

`GET /api/applications` on mount. Shows last 5 runs (sorted by `application_id` descending):
- Company, role title, mode badge, generated/draft status tag
- "View" link: calls `navigate('documents', application_id)`

"New Application" primary button: calls `navigate('workspace')`.

## Frontend: Master CV Editor

### Layout

Ant Design `Row` / `Col` split: col 13 (edit pane, left) + col 11 (preview pane, right). On screens narrower than `lg` breakpoint, stacks vertically.

### Edit pane

Ant Design `Tabs` with the following tabs:

**Profile & Summary tab**
All 13 profile fields:
- Full Name, Preferred Name, Headline, Location, Phone, Email
- GitHub URL, LinkedIn URL, Portfolio URL, Personal Website URL
- Target Roles (tag input using `Select mode="tags"`)
- Work Authorisation
- Referees (default "available on request")

Plus `summary_source` as a `TextArea` labelled "Summary / Profile Statement".

**Skills tab**
Seven `Select mode="tags"` inputs, one per skill category:
- Languages, Frameworks, Databases, Cloud/DevOps, AI/Data, Tools, Soft Skills

**Work Experience tab**
`Form.List` for unlimited entries. Each entry is a collapsible `Card` with header `{title} @ {company}` (or "New Entry" if blank):
- Company, Title, Location, Employment Type (Input fields)
- Start Date, End Date (Input, format "Month YYYY")
- Technologies (Select mode="tags")
- Responsibilities (Form.List of Input rows with add/remove)
- Achievements (Form.List of Input rows with add/remove)
- Narrative (TextArea)

"Add Work Experience" button appends a new blank entry. Each card has a "Remove" button (Popconfirm).

**Projects tab**
`Form.List` for unlimited entries. Each entry is a collapsible `Card` with header `{name} [{tier}]`:
- Name, Type (Select: commercial/academic/personal/open_source), Tier (Select: A/B/C)
- Status, Role (Input fields)
- Technologies (Select mode="tags")
- Problem, Solution (TextArea)
- Features, Technical Depth, Achievements (Form.List of Input rows with add/remove per field)
- Links (Form.List of label + URL pairs)
- Narrative (TextArea)

"Add Project" button appends a new blank entry. Each card has a "Remove" button (Popconfirm).

**Education tab**
`Form.List` for unlimited entries. Each entry:
- Institution, Qualification, Location (Input)
- Start Date, End Date (Input, format "Month YYYY")
- Highlights (Form.List of Input rows)

"Add Education" button. Each entry has a "Remove" button.

**Certifications tab**
`Form.List` for unlimited entries. Each entry:
- Name, Issuer, Date, URL (Input fields)

"Add Certification" button. Each entry has a "Remove" button.

**Preferences tab**
- Target Locations (Select mode="tags")
- Target Roles (Select mode="tags")
- Default CV Variant (Radio: ats / portfolio)

### Save button

"Save Master CV" primary button fixed at the bottom of the edit pane. Disabled while loading initial data or while save is in-flight. Calls `PUT /api/master-cv` with the full merged payload. Shows `message.success('Master CV saved')` or `message.error(...)` on result.

### Preview pane

Reads form values via `Form` `onValuesChange` and re-renders the preview. Sections rendered in `ref/cv.md` order:

```
NAME (large text)
Location | Phone | Email | LinkedIn | GitHub | Portfolio

SUMMARY
<summary_source>

TECHNICAL SKILLS
Languages: ...   Frameworks: ...   (only non-empty categories shown)

WORK EXPERIENCE
Title | Company | Employment Type
Location | StartDate – EndDate
• responsibility bullets
• achievement bullets

SELECTED PROJECTS (Tier A and B only shown in preview)
Project Name [Tier] | type
Technologies: ...
• feature / achievement bullets

EDUCATION
Qualification | Institution | Location | Dates
• highlight bullets

CERTIFICATIONS
Name | Issuer | Date

Referees available on request
```

Preview is styled as a read-only white `Card` with small print-like font (14px, `font-family: 'Calibri', Arial, sans-serif`). It is a content check, not the final PDF render.

## Frontend: Settings

Simple Ant Design `Form` layout:

**Editable fields:**
- AI Model (`Input`, default `gpt-5.4`)
- Default Mode (`Radio.Group`: Assisted / Auto)
- Gap Questions Enabled (`Switch`)
- Max Revision Loops (`InputNumber`, min=0, max=5)

**Read-only display:**
- AI Provider (`Typography.Text`: `openai`)
- Data Directory (`Typography.Text`: value from `GET /api/settings`)
- API Key Env Var (`Typography.Text`: value from `GET /api/settings`)

"Save Settings" primary button → `PUT /api/settings`. Shows `message.success` / `message.error`.

## Frontend API Layer

### `api/applications.ts`

```ts
createApplication(payload: CreateApplicationRequest): Promise<ApplicationRun>
createApplicationFromFile(file: File, meta: ApplicationMeta): Promise<ApplicationRun>
createApplicationFromFixture(file: File, meta: ApplicationMeta): Promise<ApplicationRun>
createApplicationFromUrl(url: string, meta: ApplicationMeta): Promise<ApplicationRun>
listApplications(): Promise<ApplicationRun[]>
getApplication(id: string): Promise<ApplicationRun>
generateApplication(id: string): Promise<ApplicationRun>
saveDocuments(id: string, documents: ApplicationDocuments): Promise<ApplicationRun>
exportApplication(id: string): Promise<ApplicationRun>
getExportUrl(id: string, filename: string): string  // returns URL string, no fetch
```

File upload functions use `FormData` with the existing `multipart/form-data` endpoints.

### `api/settings.ts`

```ts
getSettings(): Promise<Settings>
saveSettings(settings: EditableSettings): Promise<Settings>
```

### `types/application.ts`

Mirrors the backend Pydantic models:
- `JdInput`, `ApplicationRun`, `CvDocument`, `DocumentSection`, `ApplicationDocuments`, `ReviewResult`

### `types/settings.ts`

```ts
interface Settings {
  ai_model: string;
  default_mode: 'assisted' | 'auto';
  gap_questions_enabled: boolean;
  max_revision_loops: number;
  // read-only
  ai_provider: string;
  data_dir: string;
  openai_api_key_env: string;
}

type EditableSettings = Pick<Settings, 'ai_model' | 'default_mode' | 'gap_questions_enabled' | 'max_revision_loops'>;
```

## Testing

Testing has three layers: backend unit/integration tests using `TestClient` (no real server needed), frontend unit tests with mocked API calls (Vitest + Testing Library), and a manual browser verification checklist run against the live backend.

### Backend tests (`test_settings_api.py`) — pytest + TestClient

Uses `TestClient(create_app(Settings(data_dir=tmp_path)))` for all tests. No real server started.

1. `GET /api/settings` with no `settings.json` → returns config defaults for all fields
2. `PUT /api/settings` with `{ai_model, default_mode, gap_questions_enabled, max_revision_loops}` → persists and returns updated values
3. `GET /api/settings` after `PUT` → confirms values round-trip from disk
4. `PUT /api/settings` with extra read-only fields (`ai_provider`, `data_dir`) in payload → ignores them silently, no error
5. `PUT /api/settings` with `max_revision_loops` out of range (e.g. 99) → returns 422

### Backend E2E smoke test extension (`test_e2e_smoke.py`)

Extend the existing `test_local_application_smoke_path` test to also cover:

```python
def test_settings_round_trip_in_app_context(tmp_path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    # Default settings returned when no file exists
    defaults = client.get("/api/settings").json()
    assert defaults["ai_model"] == "gpt-5.4"
    assert defaults["gap_questions_enabled"] is True

    # Update and confirm persistence
    client.put("/api/settings", json={
        "ai_model": "gpt-5.4",
        "default_mode": "auto",
        "gap_questions_enabled": False,
        "max_revision_loops": 1,
    })
    updated = client.get("/api/settings").json()
    assert updated["default_mode"] == "auto"
    assert updated["gap_questions_enabled"] is False
```

Also add a test that exercises the full Application Workspace API flow in sequence:

```python
def test_full_application_workflow(tmp_path):
    app = create_app(Settings(data_dir=tmp_path))
    client = TestClient(app)

    # 1. Set up master CV
    cv = client.get("/api/master-cv").json()
    cv["profile"]["full_name"] = "Alex Chen"
    cv["profile"]["email"] = "alex@example.com"
    cv["work_experience"] = [{
        "id": "work_001",
        "company": "Acme Corp",
        "title": "Intern",
        "start_date": "January 2025",
        "end_date": "June 2025",
        "responsibilities": ["Built internal tools"],
    }]
    cv["projects"] = [{
        "id": "proj_001",
        "name": "RAG Assistant",
        "tier": "A",
        "technologies": ["Python", "FastAPI"],
        "narrative": "Retrieval assistant.",
    }]
    cv["education"] = [{
        "institution": "Uni NZ",
        "qualification": "BCS",
        "start_date": "March 2022",
        "end_date": "November 2024",
    }]
    assert client.put("/api/master-cv", json=cv).status_code == 200

    # 2. Create application run
    run = client.post("/api/applications", json={
        "company": "TechCo",
        "role_title": "Junior AI Developer",
        "mode": "assisted",
        "jd_text": "Python, FastAPI, RAG experience required.",
    }).json()
    assert "application_id" in run

    # 3. List applications — run appears
    runs = client.get("/api/applications").json()
    assert any(r["application_id"] == run["application_id"] for r in runs)

    # 4. Generate
    generated = client.post(f"/api/applications/{run['application_id']}/generate").json()
    assert generated["generated_documents"]["ats_cv"]["title"] == "ATS CV"
    assert generated["review_result"]["passed"] is True

    # 5. Export PDFs
    exported = client.post(f"/api/applications/{run['application_id']}/export").json()
    assert "ats_cv" in exported["exports"]
    assert "portfolio_cv" in exported["exports"]
    assert "cover_letter" in exported["exports"]

    # 6. Download each PDF
    for filename in ["ats_cv.pdf", "portfolio_cv.pdf", "cover_letter.pdf"]:
        resp = client.get(f"/api/applications/{run['application_id']}/exports/{filename}")
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
```

### Frontend unit tests (Vitest + Testing Library)

All frontend tests mock `fetch` / API modules. No real backend needed.

**ApplicationWorkspace.test.tsx**
- Renders create form with Company, Role Title, Location, Mode, and all four JD input tabs
- Text tab: "Create & Generate" calls `createApplication` then `generateApplication` in sequence
- File tab: file picker triggers `createApplicationFromFile`
- Fixture JSON tab: label reads "SEEK Fixture JSON"; file picker triggers `createApplicationFromFixture`
- `navigate('documents', id)` is called with the new run's id on success
- Error shown and form left intact when create endpoint fails
- Error shown when generate step fails after successful create

**GeneratedDocuments.test.tsx**
- Run selector dropdown renders all runs from mock list
- Pre-selects `selectedRunId` when passed as prop
- ATS CV block editor renders `contact_header` input and one card per section with heading input and bullet inputs
- Editing a bullet input updates local state; does not call API until Save is clicked
- "Add bullet" link appends a new empty input to that section
- Delete bullet icon removes that bullet from local state
- Up arrow / down arrow buttons reorder blocks correctly in local state
- "Add Section" button appends a new blank section block
- Delete block button (with Popconfirm) removes the block
- "Save Changes" calls `saveDocuments` with the full updated `ApplicationDocuments`
- Cover Letter textarea is editable; "Save Changes" includes the updated `cover_letter` value
- Review section shows `passed` tag, `overall_score` bar, and `blocking_issues` list (read-only, no inputs)
- Export button calls `exportApplication`; download links appear after export completes
- Empty state shown when no run is selected

**Dashboard.test.tsx**
- Progress bar shows correct fraction from mock master CV (e.g. "5 / 7 sections complete")
- Completeness check correctly counts non-empty sections
- Recent runs list renders company and role title from mock runs
- "View" link calls `navigate('documents', id)`
- "New Application" button calls `navigate('workspace')`

**MasterCvEditor.test.tsx** (extend existing tests)
- Profile & Summary tab renders all 13 profile fields plus `summary_source` textarea
- Skills tab renders tag inputs for all seven skill categories
- Work Experience tab: "Add Work Experience" appends a new card; card shows title and company in header
- Projects tab: "Add Project" appends a new card; tier select shows A/B/C options
- Education tab: "Add Education" appends a new entry
- Save button disabled before data loads, enabled after; save calls `PUT /api/master-cv` with full merged payload including `work_experience`, `projects`, `education`, `skills`, `certifications`

**Settings.test.tsx**
- Form loads all four editable fields from mock `GET /api/settings` response
- Read-only fields (`ai_provider`, `data_dir`, `openai_api_key_env`) are displayed as text
- Save button calls `PUT /api/settings` with only the four editable fields
- `message.success` shown on successful save
- `message.error` shown when save fails

### Manual browser verification checklist

Run after all automated tests pass. Requires both servers running:
```
cd backend && uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
cd frontend && npm run dev
```
Open `http://127.0.0.1:5173`.

**Dashboard**
- [ ] Progress bar shows correct completeness count
- [ ] Recent runs list appears (or empty state if no runs)
- [ ] "New Application" navigates to Application Workspace

**Master CV Editor**
- [ ] All tabs render without errors
- [ ] Add a Work Experience entry, fill in company and title, confirm header shows `title @ company`
- [ ] Add a Project entry, set tier to A, confirm header shows `[A]`
- [ ] Add an Education entry
- [ ] Preview pane updates live as fields are typed
- [ ] Save Master CV succeeds and shows "Master CV saved"
- [ ] Reload page — saved work experience and projects are present

**Application Workspace**
- [ ] All four JD input tabs render
- [ ] Text tab: paste JD text, click "Create & Generate", observe "Creating…" then "Generating…" spinner, then navigate to Generated Documents with run pre-selected
- [ ] Fixture JSON tab: upload a file from `ref/jobs/`, confirm company and role auto-populate from SEEK JSON, generate successfully
- [ ] Recent runs panel shows new run with "Generated" tag
- [ ] Clicking "View" in recent runs navigates to Generated Documents for that run

**Generated Documents**
- [ ] Run selector dropdown lists all runs
- [ ] ATS CV section renders contact header as editable input and each section as a block with heading + bullet inputs
- [ ] Edit a bullet in ATS CV — value updates in the input; other inputs unchanged
- [ ] Click "Add bullet" in a section — new empty input appears at bottom of that section
- [ ] Delete a bullet — bullet removed from the block
- [ ] Move a block down with the down arrow — block moves one position down
- [ ] Click "Add Section" — new blank block appended
- [ ] Click "Save Changes" for ATS CV — success toast shown; reload page and confirm edit persists
- [ ] Cover Letter textarea is editable; Save Changes persists the update
- [ ] Review section shows passed badge and overall score (no edit controls)
- [ ] "Export PDFs" button exports and shows three download links
- [ ] Clicking a download link opens/downloads a PDF in the browser

**Settings**
- [ ] All four editable fields load from backend
- [ ] Read-only fields displayed correctly
- [ ] Change Default Mode to Auto, save, reload — Auto persists
- [ ] Change Gap Questions toggle, save, reload — value persists

## Error Handling

- All API calls wrapped in `try/catch`; failures show `message.error(errorText)`
- Application Workspace: create step failure leaves form intact (no state reset)
- Generated Documents: run load failure shows inline error, tabs disabled
- Master CV Editor: load failure shows `Alert` with retry; save failure shows error without losing form state
- Settings: load failure shows current form defaults; save failure shows error
