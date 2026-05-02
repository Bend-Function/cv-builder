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

## Frontend: Generated Documents

### Run selector

`Select` dropdown populated from `GET /api/applications` on mount. If `selectedRunId` prop is set, it is pre-selected. On selection change, load `GET /api/applications/{id}`.

### Tabs

**ATS CV tab**
- Shows `contact_header` in a `Typography.Text` block
- For each `DocumentSection` in `ats_cv.sections`: renders section heading and bullet list of `items`

**Portfolio CV tab**
- Same structure as ATS CV tab, using `portfolio_cv` data

**Cover Letter tab**
- `Typography.Paragraph` rendering `cover_letter` string (preserves newlines)

**Review tab**
- `passed` shown as green/red `Tag` ("Passed" / "Failed")
- `overall_score` shown as Ant Design `Progress` bar (0–100)
- Score breakdown: Ant Design `Descriptions` component listing each score key/value
- `blocking_issues`: red `Alert` list (shown only if non-empty)
- `suggested_revisions`: bulleted list (shown only if non-empty)

### Export section

Below the tabs:
- "Export PDFs" `Button` (primary) → calls `POST /api/applications/{id}/export`
- After export: three download links (Ant Design `Button` type="link" with download icon):
  - "ATS CV PDF" → `/api/applications/{id}/exports/ats_cv.pdf`
  - "Portfolio CV PDF" → `/api/applications/{id}/exports/portfolio_cv.pdf`
  - "Cover Letter PDF" → `/api/applications/{id}/exports/cover_letter.pdf`
- Links open via `window.open` in a new tab

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

### Backend tests (`test_settings_api.py`)

1. `GET /api/settings` with no `settings.json` → returns config defaults
2. `PUT /api/settings` with valid payload → persists and returns updated values
3. `GET /api/settings` after `PUT` → returns persisted values
4. `PUT /api/settings` with extra read-only fields in payload → ignores them, no error

### Frontend tests (Vitest + Testing Library)

**ApplicationWorkspace.test.tsx**
- Renders create form with all fields and tabs
- "Create & Generate" calls create endpoint then generate endpoint in sequence
- `navigate` is called with `('documents', applicationId)` on success
- Error message shown when create endpoint fails

**GeneratedDocuments.test.tsx**
- Renders run selector dropdown from mock list
- Pre-selects `selectedRunId` when passed as prop
- Renders ATS CV sections from mock `ApplicationRun`
- Export button calls export endpoint
- Download links shown after export completes

**Dashboard.test.tsx**
- Completeness progress bar shows correct fraction from mock master CV
- Recent runs list renders company and role title
- "New Application" button calls `navigate('workspace')`

**MasterCvEditor.test.tsx** (extend existing)
- Profile & Summary tab renders all 13 profile fields
- Work Experience tab: "Add Work Experience" appends a new card
- Projects tab: "Add Project" appends a new card
- Save button is disabled before data loads and re-enabled after
- Saving calls `PUT /api/master-cv` with full merged payload including new sections

**Settings.test.tsx**
- Form loads values from `GET /api/settings`
- Save calls `PUT /api/settings` with editable fields only
- Read-only fields are displayed but not in the form submit payload

## Error Handling

- All API calls wrapped in `try/catch`; failures show `message.error(errorText)`
- Application Workspace: create step failure leaves form intact (no state reset)
- Generated Documents: run load failure shows inline error, tabs disabled
- Master CV Editor: load failure shows `Alert` with retry; save failure shows error without losing form state
- Settings: load failure shows current form defaults; save failure shows error
