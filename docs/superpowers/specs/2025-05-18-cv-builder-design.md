# CV Builder — Design Spec

## Overview

A client-side-first CV/resume generator for students and junior IT professionals targeting the New Zealand and Australian job market. Built with Next.js (App Router), TypeScript, and Tailwind CSS. PDF generation is handled server-side via Puppeteer for maximum quality and ATS compatibility.

## Target User

- Students and junior IT professionals (0–4 years experience) in NZ/AU
- Need ATS-safe, professionally formatted resumes following local conventions
- Want to edit content quickly and see results immediately

## Reference Standards

- **UNSW Resume/CV Guide** — section structure, formatting conventions, achievement-statement formula (Action verb + Task + Outcome)
- **IT Resume Standards for NZ and Australia** — ATS-safe formatting, single-column layout, standard fonts (Arial/Calibri/Times New Roman, 10–12pt), black/dark-grey text, no photos/icons, reverse-chronological order

## Architecture

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Toolbar: [Import JSON] [Export JSON]  Style: [Dropdown ▼]   │
├──────────────────────────┬──────────────────────────────────┤
│   LEFT: Editor Panel     │   RIGHT: Live Preview (A4)       │
│   (Scrollable)           │   (Fixed A4 ratio, real-time)    │
│                          │                                  │
│   [Contact Info]         │   ┌──────────────────────────┐   │
│   [Summary]              │   │     Full Name            │   │
│   [Technical Skills]     │   │     City | Phone | Email │   │
│   [Work Experience]      │   │     ─────────────────    │   │
│   [Projects]             │   │     CAREER PROFILE       │   │
│   [Education]            │   │     • Achievement 1      │   │
│   [Certifications]       │   │     ─────────────────    │   │
│   [Referees]             │   │     TECHNICAL SKILLS     │   │
│                          │   │     ...                  │   │
│   Each section:          │   └──────────────────────────┘   │
│   - Toggle visibility    │                                  │
│   - Drag to reorder      │   [ Preview PDF ] [ Download PDF]│
│   - Add/Remove items     │   (calls /api/pdf endpoint)      │
└──────────────────────────┴──────────────────────────────────┘
```

### Key Decisions

- **Live preview** is HTML/CSS (not PDF) — instant, pixel-perfect, shared component with PDF generation
- **PDF generation** is button-triggered, non-realtime — calls `/api/pdf`, server renders same component via Puppeteer
- **A4 fixed-ratio** preview container so users feel the final print dimensions

## Data Model

```typescript
interface ResumeData {
  meta: {
    version: number;      // current: 1
    lastModified: string; // ISO date
    activeStyle: "classic-blue" | "crimson-block" | "minimal-mono";
  };

  sections: Section[];   // order + visibility

  contact: {
    fullName: string;
    city: string;
    phone: string;
    email: string;
    linkedIn: string;
    github: string;
    portfolio: string;
  };

  summary: string;        // 35–80 words

  skills: {
    category: string;     // e.g. "Languages", "Cloud & DevOps"
    items: string;        // comma-separated list
  }[];

  experience: {
    id: string;
    title: string;
    company: string;
    startDate: string;    // "Dec 2024"
    endDate: string;      // "Current" or "Feb 2025"
    bullets: string[];    // achievement statements
  }[];

  projects: {
    id: string;
    name: string;
    context: string;      // e.g. "UNSW | Team of 4"
    startDate: string;
    endDate: string;
    bullets: string[];
  }[];

  education: {
    id: string;
    degree: string;
    institution: string;
    location: string;
    startDate: string;
    endDate: string;
    details: string[];    // e.g. "Distinction average"
  }[];

  certifications: {
    id: string;
    name: string;
    issuer: string;
    date: string;
  }[];

  referees: {
    mode: "omit" | "on-request" | "full";
    list: {
      name: string;
      title: string;
      organisation: string;
      contact: string;
    }[];
  };
}

interface Section {
  id: string;       // "contact" | "summary" | "skills" | "experience" | ...
  enabled: boolean;
  order: number;
}
```

### Multi-item Sections (Create/Delete)

Sections that support multiple entries, each with its own add/remove:

| Section | Items | Nested create/delete |
|---------|-------|----------------------|
| `skills` | skill categories | category add/remove |
| `experience` | job entries | entry add/remove; bullets add/remove per entry |
| `projects` | project entries | entry add/remove; bullets add/remove per entry |
| `education` | degree entries | entry add/remove; details add/remove per entry |
| `certifications` | certificate entries | entry add/remove |
| `referees.list` | referee entries | entry add/remove |

Single-instance sections (toggle visibility only): `contact`, `summary`.

## Style System — 3 Themes

Based on UNSW sample resumes and ATS-safe requirements.

### 1. Classic Blue Line
- Blue (`#1e4d8b`) underlined section headers
- Clean, traditional, universally professional
- Best for conservative industries, large corporates, government
- Highly ATS-friendly

### 2. Modern Crimson Block
- Deep crimson (`#8b2635`) solid header bars with white text
- Bold but still professional
- Good for startups, modern tech companies

### 3. Minimal Mono
- Pure black and white, no colour dependency
- Hairline (`0.5px`) separators
- Times New Roman or serif option
- Maximum ATS compatibility
- Safest for automated screening

Style switching via CSS custom properties (variables). The `ResumeRenderer` component injects the active theme class, and per-theme CSS files define the variable values.

## PDF Generation Flow

```
User clicks [Download PDF] or [Preview PDF]
    │
    ▼
Front-end collects ResumeData → POST /api/pdf (JSON body)
    │
    ▼
API Route (Next.js App Router)
    │
    ├── 1. ReactDOMServer.renderToStaticMarkup()
    │      renders ResumeRenderer with active theme CSS
    │
    ├── 2. Puppeteer/Playwright loads the HTML
    │      viewport set to A4 (595 × 842 pt)
    │
    ├── 3. Wait for fonts/layout stable
    │
    └── 4. page.pdf({ format: "A4", printBackground: true })
              │
              ▼
        Return PDF buffer → browser triggers download/open
```

**Preview vs PDF consistency:** Both use the identical `ResumeRenderer` component. The preview renders in the browser's CSS engine; the PDF renders in Puppeteer (Chromium). Differences are minimal and acceptable.

**Generation time:** ~1–3 seconds. Show loading spinner on the button.

## Persistence

### localStorage (MVP)

- Key: `cv-data`
- Auto-save on every change (debounce 1000ms)
- Load on mount; if missing, initialise with default template data

### JSON Import / Export

**Import:**
1. User selects `.json` file
2. `FileReader` reads → `JSON.parse`
3. Validate with `validateResumeData()` — check required fields, version compatibility
4. Valid → replace current state, refresh preview
5. Invalid → toast error, keep existing data

**Export:**
1. `JSON.stringify(currentData, null, 2)`
2. Trigger download as `resume-YYYY-MM-DD.json`

### Future: MongoDB

The `ResumeData` structure maps directly to a MongoDB document. Future integration requires only:
- Adding `_id?: string` and `userId?: string` to `ResumeData`
- Adding CRUD API routes: `GET/POST/PUT /api/resumes`
- Front-end sync layer: prefer MongoDB when online, fallback to localStorage when offline

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS Variables (theme switching) |
| UI Components | shadcn/ui |
| PDF Generation | `puppeteer-core` + `@sparticuz/chromium-min` (serverless-compatible) |
| State | React `useState` + `useReducer` |
| Drag & Drop | `@dnd-kit/sortable` (section reordering) |
| Icons | `lucide-react` |

## File Structure

```
src/
├── app/
│   ├── page.tsx                  # Main editor + preview page
│   ├── api/pdf/route.ts          # PDF generation endpoint
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── editor/
│   │   ├── EditorPanel.tsx       # Left sidebar container
│   │   ├── SectionToggle.tsx     # Show/hide switch per section
│   │   ├── SortableSectionList.tsx # Drag-to-reorder sections
│   │   ├── ContactForm.tsx
│   │   ├── SummaryForm.tsx
│   │   ├── SkillsForm.tsx        # Add/remove skill categories
│   │   ├── ExperienceForm.tsx    # Add/remove jobs + bullets
│   │   ├── ProjectsForm.tsx      # Add/remove projects + bullets
│   │   ├── EducationForm.tsx     # Add/remove degrees + details
│   │   ├── CertificationsForm.tsx
│   │   └── RefereesForm.tsx
│   ├── preview/
│   │   ├── ResumePreview.tsx     # A4-ratio wrapper
│   │   └── ResumeRenderer.tsx    # Pure render component (shared with server)
│   └── ui/                       # shadcn components
├── lib/
│   ├── resume-data.ts            # Types + default template data
│   ├── storage.ts                # localStorage read/write
│   ├── pdf-generator.ts          # Puppeteer PDF generation
│   └── validate.ts               # JSON import validation
├── styles/
│   ├── classic-blue.css
│   ├── crimson-block.css
│   └── minimal-mono.css
└── public/
    └── fonts/                    # Self-hosted web fonts if needed
```

## Section Order & Defaults

Default order follows NZ/AU IT resume best practices for junior candidates:

1. **Contact** (always enabled)
2. **Summary**
3. **Technical Skills**
4. **Work Experience** (if empty, user may hide)
5. **Selected Projects**
6. **Education**
7. **Certifications** (hidden by default)
8. **Referees** (default mode: "on-request")

Users can toggle visibility and drag to reorder any section.

## Constraints & Non-Goals

- **No AI recommendation engine** (MVP scope)
- **No user authentication** (MVP scope; localStorage only)
- **No backend database** (MVP scope; MongoDB reserved for future)
- **No multi-language support** (English interface and content only)
- **No cover letter generation**
- **No WYSIWYG rich text** — plain text inputs with bullet lists only

## Open Questions

None remaining after design review. All sections confirmed by stakeholder.
