# CV Builder Design

## Purpose

Build a single-user CV generation tool for creating targeted NZ/AU IT job applications. The app stores a complete master CV as editable local JSON, accepts a job description through text, file, URL, or sample JSON input, researches the company, matches the JD against the master CV, generates a two-page ATS-safe CV PDF, a slightly more polished portfolio CV PDF, and a cover letter PDF, then reviews the result against the rules distilled from `ref/cv.md`.

The system is a private local tool, not a SaaS product. Profile input and master CV editing are deterministic and user-controlled. AI only participates after a JD is provided: matching, optional gap questioning, document generation, and review.

## Source Context

- `ref/cv.md` defines the CV strategy for NZ/AU junior IT roles: concise targeted resumes, ATS-safe single-column layout, two-page maximum where justified, standard headings, work/project prioritisation, project tiering, evidence-led bullets, quantification, and separate ATS/portfolio variants.
- `ref/jobs/*.json` contains SEEK-style job fixtures. The observed structure has top-level `recordType`, `source`, `job`, `tracking`, and `raw`, with useful fields under `job.*` and raw JD text under `raw.bodyText`.
- `ref/ai.txt` contains local AI credentials for two protocols. The implementation may use those credentials locally, but must never print, commit, or persist secret values. The selected MVP default is OpenAI `gpt-5.4`, with LangChain/LangGraph used for workflow orchestration.

## Architecture Decision

Use the recommended MVP architecture:

```text
React + Ant Design Web UI
        |
        v
FastAPI Backend
        |
        +-- Local JSON storage
        +-- JD ingestion services
        +-- Company research service
        +-- LangChain/LangGraph AI workflows
        +-- HTML/CSS PDF renderer
```

### Why this shape

- It matches the requested Python + Ant Design + LangChain stack.
- It avoids premature database, auth, and multi-user complexity.
- Local JSON is enough for a single-user private tool and easy to inspect or back up.
- LangGraph provides explicit workflow checkpoints for assisted and auto modes.
- HTML/CSS-to-PDF allows both ATS-safe and portfolio PDF variants from the same document JSON.

## AI Boundary

AI is excluded from master data entry and editing. The user manually edits the master CV through Ant Design forms. AI may:

- parse and analyse JD input,
- search/research company context,
- infer hiring priorities,
- map JD signals to master CV evidence,
- ask optional information-gap questions,
- generate CV and cover letter drafts,
- review generated outputs against the CV rubric,
- propose safe revisions.

AI must not invent facts, metrics, technologies, employers, dates, responsibilities, or achievements. It may rewrite, compress, reorder, and emphasise existing facts from the master CV or user-confirmed gap answers.

## AI Provider Strategy

Use OpenAI `gpt-5.4` as the default MVP model.

Recommended runtime approach for difficult generation/review calls:

```json
{
  "provider": "openai",
  "model": "gpt-5.4",
  "stream": true,
  "structured_outputs": true
}
```

Use streaming for long generation/review requests and structured outputs for all machine-readable AI responses. LangChain/LangGraph should orchestrate workflow state, while provider-specific calls should remain isolated inside the backend AI client layer so the rest of the graph depends on typed schemas rather than raw provider responses. API keys are read from environment variables or local-only development config derived from `ref/ai.txt`; secret values are never written into source files or generated specs.

The other protocol in `ref/ai.txt` can remain a future fallback, but MVP should avoid provider abstraction unless needed.

## Frontend Pages

### Dashboard

Shows master CV completeness, recent application runs, run statuses, and quick actions.

Suggested statuses:

```text
Draft -> Research Ready -> Questions Pending -> Generated -> Reviewed -> Exported
```

### Master CV Editor

Manual, non-AI editor for:

- profile,
- online presence,
- education,
- skills,
- certifications,
- work experience,
- projects,
- preferences.

Work and project entries use structured fields plus long narrative text. Users can import/export the master JSON for backup.

### Application Workspace

Creates an application run and accepts JD input via:

1. pasted JD text,
2. uploaded PDF/DOCX/TXT/Markdown,
3. pasted job-posting URL,
4. existing SEEK-style JSON fixtures under `ref/jobs` during development/testing.

The workspace supports two modes.

#### Assisted Mode

```text
Input JD
-> Extract JD
-> Research company
-> Show analysis, sources, ideal candidate profile
-> User confirms/edits
-> Optional gap questions
-> Generate documents
-> Review Agent
-> Export PDFs
```

Assisted mode is the default and is best for important applications.

#### Auto Mode

```text
Input JD
-> Extract JD
-> Research company
-> Position candidate automatically
-> Skip or blocking-only gap questions
-> Generate documents
-> Review Agent
-> Auto-export only if passed
```

Auto mode stops for user intervention if extraction confidence is low, company research is uncertain, required evidence is missing, truthfulness issues are detected, or review fails after the allowed revision loop.

### Generated Documents

Tabs:

- ATS CV,
- Portfolio CV,
- Cover Letter,
- Review.

Each generated document is editable for the current application run. Manual edits do not write back to the master CV unless the user explicitly chooses to save a confirmed fact.

### Settings

Minimal settings:

- AI provider/protocol,
- model,
- API key environment variable names,
- search provider,
- PDF engine,
- data directory,
- max revision loops,
- default mode,
- gap question default.

## Master CV Data Model

The master CV is a fact store, not a final resume.

```json
{
  "profile": {},
  "online_presence": {},
  "education": [],
  "skills": {},
  "certifications": [],
  "work_experience": [],
  "projects": [],
  "preferences": {}
}
```

### Profile and Online Presence

```json
{
  "profile": {
    "full_name": "",
    "preferred_name": "",
    "headline": "",
    "location": "",
    "phone": "",
    "email": "",
    "github_url": "",
    "linkedin_url": "",
    "portfolio_url": "",
    "personal_website_url": "",
    "target_roles": ["AI Developer", "Full Stack Developer"],
    "summary_source": "",
    "work_authorisation": "",
    "referees": "available_on_request"
  },
  "online_presence": {
    "github": {
      "url": "",
      "profile_readme_summary": "",
      "pinned_projects": []
    },
    "linkedin": {
      "url": "",
      "headline": "",
      "summary": ""
    },
    "portfolio": {
      "url": "",
      "featured_links": []
    },
    "other_links": []
  }
}
```

Final CV header selection:

```text
Full Name
City, Country | Phone | Email | LinkedIn | GitHub | Portfolio
```

ATS CV uses text links only. Portfolio CV may display links with stronger visual hierarchy, but remains text-based.

### Work Experience

```json
{
  "id": "work_001",
  "company": "",
  "title": "",
  "location": "",
  "start_date": "",
  "end_date": "",
  "employment_type": "",
  "technologies": [],
  "domains": [],
  "responsibilities": [],
  "achievements": [],
  "metrics": [],
  "collaboration": [],
  "evidence_links": [],
  "narrative": "",
  "confidence": {
    "facts_verified": true,
    "needs_user_review": []
  }
}
```

### Projects

```json
{
  "id": "project_001",
  "name": "",
  "type": "commercial | academic | personal | open_source",
  "status": "",
  "role": "",
  "technologies": [],
  "problem": "",
  "solution": "",
  "features": [],
  "technical_depth": [],
  "achievements": [],
  "metrics": [],
  "links": [],
  "tier": "A | B | C",
  "narrative": "",
  "confidence": {
    "facts_verified": true,
    "needs_user_review": []
  }
}
```

Project tiers follow `ref/cv.md`:

- A: commercial work, major internship deliverables, real users, merged open-source contributions, production-like systems.
- B: strong capstones, well-documented deployed apps, tested personal systems, hackathon/team projects with substance.
- C: tutorial clones, small CRUD demos, old or weakly related experiments. Usually omitted.

## Application Run Data Model

Each application run stores its own inputs, analysis, generated drafts, reviews, and exports.

```json
{
  "application_id": "",
  "company": "",
  "role_title": "",
  "location": "",
  "mode": "assisted | auto",
  "jd_input": {
    "type": "text | file | url | fixture_json",
    "source": "",
    "extracted_text": ""
  },
  "company_research": {},
  "jd_analysis": {},
  "candidate_positioning": {},
  "gap_questions": [],
  "user_gap_answers": [],
  "generated_documents": {},
  "review_result": {},
  "exports": {}
}
```

Recommended local storage layout:

```text
data/
  master_cv.json
  applications/
    <application_id>/
      input.json
      research.json
      analysis.json
      positioning.json
      gap_questions.json
      generated.json
      review.json
      exports/
        ats_cv.pdf
        portfolio_cv.pdf
        cover_letter.pdf
```

## AI Workflows

Use LangGraph nodes so each step is observable, persisted, retryable, and interruptible.

```text
JD Input
  -> JD Extraction
  -> Company Research
  -> JD Analysis
  -> Candidate Positioning
  -> Optional Gap Questions
  -> Document Generation
  -> Review Agent
  -> Revision Loop
  -> PDF Export
```

### JD Extraction

Normalises text/file/url/fixture JSON into one schema.

```json
{
  "raw_source_type": "text | file | url | fixture_json",
  "raw_source": "",
  "extracted_text": "",
  "role_title": "",
  "company_name": "",
  "location": "",
  "employment_type": "",
  "seniority": "",
  "requirements": [],
  "responsibilities": [],
  "preferred_qualifications": [],
  "keywords": []
}
```

For SEEK fixtures, extract from `job.title`, `job.company`, `job.location`, `job.skills`, `job.responsibilities`, `job.requirements`, and `raw.bodyText`.

### Company Research

Uses real web search in MVP. Sources and summaries must be stored and shown in Assisted Mode.

```json
{
  "company_summary": "",
  "products_services": [],
  "business_model": "",
  "industry": "",
  "likely_team_context": "",
  "technology_signals": [],
  "sources": [
    {
      "title": "",
      "url": "",
      "summary": "",
      "used_for": ""
    }
  ],
  "needs_user_confirmation": []
}
```

### JD Analysis

```json
{
  "must_have": [],
  "nice_to_have": [],
  "responsibilities": [],
  "soft_skills": [],
  "domain_signals": [],
  "seniority_signals": [],
  "keywords_by_priority": {
    "high": [],
    "medium": [],
    "low": []
  },
  "ideal_candidate_profile": "",
  "hiring_manager_priorities": [],
  "risk_factors_for_candidate": [],
  "evidence_needed": []
}
```

### Candidate Positioning

```json
{
  "positioning_statement": "",
  "selected_work_experience_ids": [],
  "selected_project_ids": [],
  "selected_skills": [],
  "evidence_map": [
    {
      "jd_signal": "",
      "cv_source_id": "",
      "evidence_summary": "",
      "strength": "strong | medium | weak | missing"
    }
  ],
  "omit_or_deemphasize": []
}
```

### Optional Gap Questions

If the JD asks for a plausible skill not present in the master CV, the AI can ask before generation.

Example:

```json
{
  "question": "The JD emphasises RAG and vector search. Have you used embeddings, vector databases, retrieval pipelines, RAG evaluation, or context orchestration?",
  "why_asking": "These are high-priority JD signals but not explicit in the master CV.",
  "suggested_fields_to_update": [
    "projects.project_001.technical_depth",
    "work_experience.work_002.achievements"
  ],
  "answer_type": "free_text"
}
```

Answers are used only for the current run unless the user explicitly saves them to the master CV.

### Document Generation

Writer Agent produces structured document JSON, not HTML.

```json
{
  "ats_cv": {},
  "portfolio_cv": {},
  "cover_letter": {}
}
```

Every major claim should include a source map back to a master CV item or a user-confirmed gap answer.

### Review Agent

The Review Agent checks truthfulness first, then quality.

```json
{
  "passed": true,
  "overall_score": 0,
  "scores": {
    "truthfulness": 0,
    "jd_alignment": 0,
    "evidence_strength": 0,
    "ats_safety": 0,
    "layout_and_length": 0,
    "impact_and_quantification": 0,
    "nz_au_convention_fit": 0,
    "cover_letter_quality": 0
  },
  "blocking_issues": [],
  "warnings": [],
  "suggested_revisions": [],
  "missing_user_information": [],
  "source_trace_checks": []
}
```

Revision loop:

```text
Writer -> Review -> Writer revision -> Review
```

Run at most two automatic revision loops. If still failing, stop and show the user what is missing or unsafe.

## Review Rubric Distilled from `ref/cv.md`

### Truthfulness

Blocking if generated content invents facts, metrics, technologies, production status, employers, dates, or responsibilities. Claims must be supported by master CV data or user-confirmed gap answers.

### JD Alignment

Summary, skills, work experience, and projects should respond to high-priority JD requirements with evidence, not keyword stuffing.

### Evidence Strength

Each key claim is rated:

- strong: direct source evidence,
- medium: related evidence that supports conservative phrasing,
- weak: limited exposure only,
- missing: do not use.

### ATS Safety

ATS CV must use:

- single column,
- standard headings,
- text-based PDF,
- Arial/Calibri/Times New Roman-style readable fonts,
- 10–12 pt body text,
- no photos, icons, charts, sidebars, tables, or text boxes,
- Month YYYY date format,
- concise bullets.

### Layout and Length

Target two pages. Default order:

```text
Contact Information -> Summary -> Technical Skills -> Work Experience -> Selected Projects -> Education -> Certifications / Training
```

Projects may move above Work Experience only when paid/relevant work is thin.

### Impact and Quantification

Bullets should be result-first where truthful. Quantify using users, time, latency, throughput, quality, team size, release cadence, or scope when known. If no metric exists, use conservative qualitative scope instead of inventing numbers.

### NZ/AU Convention Fit

Avoid photos and demographic details. Do not include referee contact details unless requested. Keep content concise and job-targeted.

### Portfolio PDF Quality

Portfolio PDF may use restrained visual polish but must not tell a different story from the ATS CV.

### Cover Letter Quality

The cover letter should be short, specific, grounded in company research, and backed by 2–3 candidate evidence points. It must not invent company facts or hiring manager names.

## PDF Export Strategy

Generate structured document JSON, render to HTML, then print to PDF.

```text
Generated document JSON
  -> HTML template
  -> CSS print styles
  -> Playwright/Chromium PDF renderer
  -> PDF files
```

Default PDF engine: Playwright/Chromium print-to-PDF.

Outputs:

- `ats_cv.pdf`,
- `portfolio_cv.pdf`,
- `cover_letter.pdf`.

Do not include DOCX export in MVP.

PDF checks:

- file exists,
- file is non-empty,
- text can be extracted,
- ATS CV <= 2 pages,
- cover letter <= 1 page,
- ATS template has required headings and no banned visual elements.

If page count fails:

```text
Auto-compress once -> Re-render -> Re-check -> Ask user what to cut
```

## Backend Structure

```text
backend/
  app/
    main.py
    config.py
    models/
      master_cv.py
      application.py
      documents.py
      review.py
    api/
      master_cv.py
      applications.py
      documents.py
      settings.py
    services/
      storage.py
      jd_ingestion.py
      research.py
      pdf_renderer.py
    ai/
      graph.py
      state.py
      prompts/
        jd_analysis.md
        company_research.md
        candidate_positioning.md
        writer_ats_cv.md
        writer_portfolio_cv.md
        writer_cover_letter.md
        reviewer.md
      nodes/
        jd_extract.py
        company_research.py
        jd_analysis.py
        positioning.py
        gap_questions.py
        writer.py
        reviewer.py
        revision.py
    templates/
      ats_cv.html
      portfolio_cv.html
      cover_letter.html
    static/
      ats.css
      portfolio.css
      cover_letter.css
  tests/
```

## Frontend Structure

```text
frontend/
  src/
    pages/
      Dashboard.tsx
      MasterCvEditor.tsx
      ApplicationWorkspace.tsx
      GeneratedDocuments.tsx
      Settings.tsx
    components/
      cv-editor/
      application/
      documents/
      review/
    api/
      client.ts
      masterCv.ts
      applications.ts
    types/
      masterCv.ts
      application.ts
```

## API Sketch

### Master CV

```http
GET /api/master-cv
PUT /api/master-cv
POST /api/master-cv/validate
POST /api/master-cv/export-json
POST /api/master-cv/import-json
```

### Applications

```http
POST /api/applications
GET /api/applications
GET /api/applications/{id}
DELETE /api/applications/{id}
```

### JD and Workflow

```http
POST /api/applications/{id}/ingest-jd
POST /api/applications/{id}/analyze
POST /api/applications/{id}/confirm-analysis
POST /api/applications/{id}/answer-gap-questions
POST /api/applications/{id}/generate
POST /api/applications/{id}/review
POST /api/applications/{id}/revise
POST /api/applications/{id}/export
POST /api/applications/{id}/run-auto
```

### Documents

```http
GET /api/applications/{id}/documents
PUT /api/applications/{id}/documents
POST /api/applications/{id}/documents/preview
POST /api/applications/{id}/export
GET /api/applications/{id}/exports/ats-cv.pdf
GET /api/applications/{id}/exports/portfolio-cv.pdf
GET /api/applications/{id}/exports/cover-letter.pdf
```

### Settings

```http
GET /api/settings
PUT /api/settings
POST /api/settings/test-ai
POST /api/settings/test-search
```

## Error Handling

### JD ingestion

- URL fetch fails: ask user to paste JD text.
- Uploaded file unsupported: show supported formats.
- File parses to empty text: ask user to paste content.
- JD lacks enough role information: require confirmation before continuing.

### AI output

- JSON schema parse failure: retry once, then attempt schema repair.
- Still invalid: save raw output and show an actionable error.
- Truthfulness issue: block export or force revision.
- Low-confidence company research: stop in auto mode; request confirmation in assisted mode.

### Storage

- Validate against schema before save.
- Write to a temporary file first.
- Atomically replace old JSON after validation.
- Keep recent backups.
- Never overwrite valid existing data with invalid JSON.

## Security and Privacy

- Single-user local/private tool.
- No account system in MVP.
- No public sharing links.
- API keys come from environment variables or local-only config and are not stored in JSON.
- `ref/ai.txt` may be used for local setup, but it must not be committed or printed.
- Master CV and uploaded JD files remain local except for content sent to the configured AI/search providers.
- Generated PDFs are stored under the local application run directory.

## Development Fixtures

Use fictional CV content for initial development. The fixture should include:

- profile with GitHub, LinkedIn, and portfolio URLs,
- one AI-oriented project with possible RAG/vector-search evidence,
- one full-stack project,
- one internship or work-like experience,
- education and certifications,
- realistic but clearly fictional metrics.

Use `ref/jobs/*.json` as JD fixtures to validate nested SEEK ingestion and downstream workflows.

## Testing Strategy

### Backend

- master CV load/save/validate/import/export,
- atomic write and backup behavior,
- application run directory isolation,
- JD text/file/url/fixture ingestion,
- invalid file and failed URL errors.

### AI workflow

- mocked LLM unit tests for graph transitions,
- schema contract tests for every AI output,
- assisted mode pauses for confirmation,
- auto mode stops on blocking issues,
- gap questions can be enabled, disabled, or blocking-only,
- revision loop stops after two attempts.

### Truthfulness

Use tests where generated output invents RAG, metrics, production status, or technologies not present in source data. Review Agent must fail these.

### Frontend

- edit profile links,
- edit structured work/project fields and narrative,
- create application runs,
- choose assisted/auto mode,
- use all JD input modes,
- review gap questions,
- view generated docs and review results,
- export buttons reflect review status.

### PDF

- ATS CV PDF exists, is text-extractable, and is <= 2 pages,
- Portfolio CV PDF exists and is text-extractable,
- Cover Letter PDF exists and is <= 1 page,
- ATS template contains required headings and no banned elements.

## MVP Scope

Included:

- single-user local Web App,
- React + Ant Design frontend,
- FastAPI backend,
- local JSON storage,
- Master CV Editor,
- structured + narrative work/project data,
- GitHub/LinkedIn/Portfolio profile fields,
- JD text/file/url/fixture JSON ingestion,
- assisted and auto modes,
- real web search for company research,
- optional gap questions,
- LangChain/LangGraph workflow,
- OpenAI `gpt-5.4` default AI integration,
- Writer Agent,
- Review Agent,
- ATS CV PDF,
- Portfolio CV PDF,
- Cover Letter PDF,
- application run history,
- basic settings page,
- fictional master CV fixture.

Excluded:

- multi-user accounts,
- login and permissions,
- external sharing links,
- DOCX export,
- AI-driven profile intake,
- automatic LinkedIn/GitHub scraping,
- complex version diffs,
- SaaS deployment,
- payment/billing,
- browser extension,
- email sending or automatic job application submission,
- separate government selection-criteria document,
- interview-preparation agent.

## Open Implementation Choices

These are fixed enough for MVP but may be revisited during planning:

- Search provider can be Tavily, SerpAPI, OpenAI-compatible web/search tooling, or a simple pluggable interface. MVP should choose the lowest-friction option available with local credentials.
- PDF rendering should start with Playwright/Chromium unless local install friction is unacceptable.
- The AI layer should use OpenAI `gpt-5.4` for core structured generations; LangChain/LangGraph can orchestrate workflow state around those calls.
