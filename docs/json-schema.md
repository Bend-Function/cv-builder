# JSON Data Format

This document is the authoritative reference for the resume JSON used by the CV Builder. It is what the editor saves to `localStorage`, what `Export JSON` produces, and what `Import JSON` expects.

The canonical TypeScript definitions live in [`src/lib/resume-data.ts`](../src/lib/resume-data.ts). If anything in this document disagrees with that file, the file wins.

## Top-Level Shape

```jsonc
{
  "meta":         { /* ResumeMeta */ },
  "sections":     [ /* Section[] */ ],
  "contact":      { /* Contact */ },
  "profile":      { /* Profile */ },
  "skills":       [ /* SkillCategory[] */ ],
  "experience":   [ /* ExperienceItem[] */ ],
  "projects":     [ /* ProjectItem[] */ ],
  "education":    [ /* EducationItem[] */ ],
  "certifications":[ /* CertificationItem[] */ ],
  "referees":     { /* RefereesConfig */ }
}
```

All ten keys are required for a "complete" resume. The importer's minimum bar is lower (see [Validation](#validation)) but missing fields lead to gaps in the rendered output.

---

## `meta` — ResumeMeta

```ts
interface ResumeMeta {
  version: number              // schema version, currently 2
  lastModified: string         // ISO 8601 timestamp, updated on every edit
  activeStyle: 'classic-blue' | 'crimson-block' | 'minimal-mono' | 'functional'
  layout: LayoutConfig
}
```

| Field | Type | Notes |
|-------|------|-------|
| `version` | `number` | Used by the validator. Bump if you make breaking schema changes. |
| `lastModified` | `string` | ISO 8601. The editor refreshes this on every state change. |
| `activeStyle` | `enum` | Drives `theme-*` class on the paper and the inline theme CSS in the PDF. |
| `layout` | `object` | Page margins, section gap, paragraph gap, and line-height controls. |

### Themes

| `activeStyle` | Look |
|---------------|------|
| `classic-blue` | Navy blue section titles with an underline. Body in Times. |
| `crimson-block` | Crimson section-title "blocks" (white text on a dark red background). |
| `minimal-mono` | Serif throughout, thin underline on titles, no colour accents. |
| `functional` | Sans-serif, section dividers, and two-column work/project metadata. |

---

## `sections` — Section[]

Controls **which sections render** and **in what order**.

```ts
interface Section {
  id: string       // one of the renderable ids (see table below)
  enabled: boolean // disabled sections are skipped in the preview + PDF
  order: number    // sort key (ascending). Drag-to-reorder rewrites these.
}
```

Renderable ids and the data field they read from:

| `id` | Reads | Default order |
|------|-------|---------------|
| `contact` | `contact` | 0 |
| `profile` | `profile` | 1 |
| `skills` | `skills` | 2 |
| `experience` | `experience` | 3 |
| `projects` | `projects` | 4 |
| `education` | `education` | 5 |
| `certifications` | `certifications` | 6 |
| `referees` | `referees` | 7 |

> **The renderer sorts by `order`, not by array index.** You can list sections in any order in the JSON; what controls layout is the numeric `order` field.

> **`loadResumeData` is forgiving here.** If you import a JSON that's missing some section entries (e.g. an old export that didn't know about `certifications`), the loader merges in any defaults you don't have, so the editor doesn't show "missing" rows.

---

## `contact` — Contact

```ts
interface Contact {
  fullName: string
  city: string
  phone: string
  email: string
  linkedIn: string
  github: string
  portfolio: string
}
```

All fields are plain strings. Empty strings are valid — the renderer drops empty values from the header line, so `"github": ""` simply doesn't appear.

---

## `profile` — Profile

The "career profile" / summary block. Two render modes, chosen by `type`:

```ts
interface Profile {
  type: 'paragraph' | 'bulletPoints'
  content: string    // used when type === 'paragraph'
  bullets: string[]  // used when type === 'bulletPoints'
}
```

| `type` | What renders |
|--------|--------------|
| `paragraph` | A single `<p>` containing `content`. |
| `bulletPoints` | A `<ul>` of `bullets`. |

The unused field can be left as `""` or `[]`; both are kept around so toggling the type in the UI doesn't lose data.

---

## `skills` — SkillCategory[]

```ts
interface SkillCategory {
  category: string   // e.g. "Languages", "Frameworks"
  items: string      // e.g. "TypeScript, Python, Go"
}
```

Renders as one row per category: bold category label followed by a comma-separated list of items.

---

## `experience` — ExperienceItem[]

```ts
interface ExperienceItem {
  id: string         // stable client-side id (e.g. crypto.randomUUID())
  title: string      // role title
  company: string    // employer name
  location?: string  // free-form location, e.g. "Sydney, NSW"
  startDate: string  // free-form text, e.g. "Jan 2022"
  endDate: string    // free-form text, e.g. "Present"
  body: string       // markdown body: paragraphs and nested bullet lists
}
```

Dates are deliberately stored as strings, not Date objects — the UI lets users type whatever convention they prefer ("2024-01", "Jan 2024", "Q1 2024").

`body` supports markdown for prose and bullet lists. Raw HTML is not part of the supported authoring surface. Example:

```md
Built **React** services for customer workflows.

- Improved API response time by 40%
  - Migrated hot paths to AWS Lambda
    - Added dashboards for latency tracking
```

---

## `projects` — ProjectItem[]

```ts
interface ProjectItem {
  id: string
  name: string       // project title
  context: string    // organisation / employer / "Personal"
  location?: string
  startDate: string
  endDate: string
  body: string       // markdown body: paragraphs and nested bullet lists
}
```

Same shape as experience, with `name`/`context` in place of `title`/`company`. Use this for selected projects that don't belong inside an employer block.

---

## `education` — EducationItem[]

```ts
interface EducationItem {
  id: string
  degree: string       // e.g. "BSc Computer Science"
  institution: string  // e.g. "University of X"
  location: string     // e.g. "Sydney, AU"
  startDate: string
  endDate: string
  details: string[]    // optional bullets: honours, GPA, thesis, etc.
}
```

`details` is rendered as a bullet list under the institution line. Leave it as `[]` to render just the header row.

---

## `certifications` — CertificationItem[]

```ts
interface CertificationItem {
  id: string
  name: string    // certification name
  issuer: string  // awarding body
  date: string    // free-form date string
}
```

Renders as a single line per certification — no bullet body.

---

## `referees` — RefereesConfig

```ts
interface RefereesConfig {
  mode: 'omit' | 'on-request' | 'full'
  list: Referee[]
}

interface Referee {
  name: string
  title: string
  organisation: string
  contact: string   // phone / email / both, your choice
}
```

| `mode` | What renders |
|--------|--------------|
| `omit` | Nothing — section title is suppressed too. |
| `on-request` | A single line: "Available on request". `list` is ignored. |
| `full` | Each referee in `list` is rendered with name, title, organisation, and contact. |

`list` is preserved across mode changes, so toggling between `full` and `on-request` doesn't lose contact details.

---

## Complete Example

A minimal-but-valid resume that exercises every section type:

```json
{
  "meta": {
    "version": 1,
    "lastModified": "2026-05-19T10:00:00.000Z",
    "activeStyle": "classic-blue"
  },
  "sections": [
    { "id": "contact",        "enabled": true,  "order": 0 },
    { "id": "profile",        "enabled": true,  "order": 1 },
    { "id": "skills",         "enabled": true,  "order": 2 },
    { "id": "experience",     "enabled": true,  "order": 3 },
    { "id": "projects",       "enabled": true,  "order": 4 },
    { "id": "education",      "enabled": true,  "order": 5 },
    { "id": "certifications", "enabled": false, "order": 6 },
    { "id": "referees",       "enabled": true,  "order": 7 }
  ],
  "contact": {
    "fullName": "Alex Chen",
    "city": "Sydney, AU",
    "phone": "+61 400 000 000",
    "email": "alex@example.com",
    "linkedIn": "linkedin.com/in/alexchen",
    "github": "github.com/alexchen",
    "portfolio": "alexchen.dev"
  },
  "profile": {
    "type": "paragraph",
    "content": "Backend engineer with seven years building data-intensive services in Go and Python.",
    "bullets": []
  },
  "skills": [
    { "category": "Languages",  "items": ["Go", "Python", "TypeScript"] },
    { "category": "Infra",      "items": ["Kubernetes", "Terraform", "PostgreSQL"] }
  ],
  "experience": [
    {
      "id": "exp-1",
      "title": "Senior Backend Engineer",
      "company": "Acme Data Co.",
      "startDate": "Jan 2022",
      "endDate": "Present",
      "bullets": [
        "Led migration of legacy ingestion pipeline to Go, cutting p99 latency by 60%.",
        "Designed multi-region failover for the metering service."
      ]
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "name": "Open-source CV builder",
      "context": "Personal",
      "startDate": "2026",
      "endDate": "Present",
      "bullets": ["Next.js + Puppeteer; offline-first via localStorage."]
    }
  ],
  "education": [
    {
      "id": "edu-1",
      "degree": "BSc Computer Science",
      "institution": "University of Sydney",
      "location": "Sydney, AU",
      "startDate": "2014",
      "endDate": "2017",
      "details": ["First-class honours"]
    }
  ],
  "certifications": [
    { "id": "cert-1", "name": "AWS Solutions Architect — Associate", "issuer": "AWS", "date": "2024" }
  ],
  "referees": {
    "mode": "on-request",
    "list": [
      {
        "name": "Jane Doe",
        "title": "Engineering Manager",
        "organisation": "Acme Data Co.",
        "contact": "jane@example.com"
      }
    ]
  }
}
```

In this example `certifications` is disabled, so it won't appear in the rendered resume — but the data is preserved if you re-enable it.

---

## Validation

The importer uses `isValidResumeData` ([`src/lib/validate.ts`](../src/lib/validate.ts)) as the minimum bar. A JSON document passes if it is an object that contains:

- `meta` (object) with `version` (number)
- `contact` (object)
- `sections` (array)
- `skills` (array)
- `experience` (array)

Anything that survives that check is accepted; missing optional fields (`profile`, `projects`, `education`, `certifications`, `referees`) are not blocked at import time but will leave gaps in the rendered output. `loadResumeData` in [`src/lib/storage.ts`](../src/lib/storage.ts) also patches missing `sections` entries against `defaultSections`, so older exports keep working when new section types are added.

If validation fails the importer returns `null` and the UI shows `"Invalid resume file format"`.

### Migration: legacy `summary` field

Pre-`profile` exports had a `summary: string` field instead of the `profile` object. `loadResumeData` migrates this automatically: `summary` becomes `{ type: 'paragraph', content: summary, bullets: [] }`. You don't need to do anything; the next save writes the new shape.

---

## Persistence

| Where | Key | Format |
|-------|-----|--------|
| Browser | `localStorage['cv-data']` | `JSON.stringify(data)` (no pretty-printing) |
| Disk (Export) | `resume-YYYY-MM-DD.json` | `JSON.stringify(data, null, 2)` (pretty-printed, 2-space indent) |

Saves are debounced by 1 s — see `createDebouncedSaver` in `src/lib/storage.ts`. `meta.lastModified` is refreshed by the editor on every change, and again by `saveResumeData` immediately before write.

---

## Programmatic API

If you want to use the data layer outside the editor:

```ts
import { defaultResumeData, type ResumeData } from '@/lib/resume-data'
import { exportResumeJSON, importResumeJSON, isValidResumeData } from '@/lib/validate'
import { loadResumeData, saveResumeData, createDebouncedSaver } from '@/lib/storage'

const data: ResumeData = loadResumeData()      // localStorage → ResumeData (with migration)
const json: string     = exportResumeJSON(data) // pretty-printed JSON string
const parsed           = importResumeJSON(json) // ResumeData | null

const save = createDebouncedSaver(1000)
save(data) // schedules a localStorage write 1 s later, coalescing calls
```

The same `data` object is what you'd `POST` to `/api/pdf` as the request body to generate a PDF.
