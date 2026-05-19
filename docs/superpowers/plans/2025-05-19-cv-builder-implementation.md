# CV Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 15 CV/resume generator with a dark editorial UI, live HTML preview, button-triggered PDF generation via Puppeteer, localStorage persistence, JSON import/export, and three ATS-safe resume themes.

**Architecture:** Next.js App Router with React Server Components for the PDF API, client components for the editor. Shared `ResumeRenderer` component renders the same JSX for both browser preview and server-side PDF. Profile section supports paragraph or bullet-point modes selectable in the editor.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, @dnd-kit/sortable, puppeteer-core, @sparticuz/chromium-min

**Key Spec Change:** `summary: string` is replaced with `profile: { type: 'paragraph' | 'bulletPoints'; content: string; bullets: string[] }`. The editor provides a toggle between the two modes.

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                     # Main page: editor + preview + toolbar
│   ├── layout.tsx                   # Root layout with fonts
│   ├── globals.css                  # Tailwind imports + theme CSS imports
│   └── api/pdf/route.ts             # POST endpoint: JSON -> PDF buffer
├── components/
│   ├── editor/
│   │   ├── EditorPanel.tsx          # Left sidebar container with resizer
│   │   ├── SectionToggle.tsx        # Show/hide switch per section
│   │   ├── SortableSectionList.tsx  # Drag-to-reorder sections (@dnd-kit)
│   │   ├── ContactForm.tsx          # Contact info inputs
│   │   ├── ProfileForm.tsx          # Paragraph OR bullet-points mode
│   │   ├── SkillsForm.tsx           # Add/remove skill categories
│   │   ├── ExperienceForm.tsx       # Add/remove jobs + bullets
│   │   ├── ProjectsForm.tsx         # Add/remove projects + bullets
│   │   ├── EducationForm.tsx        # Add/remove degrees + details
│   │   ├── CertificationsForm.tsx   # Add/remove certs
│   │   └── RefereesForm.tsx         # Mode select + referee list
│   ├── preview/
│   │   ├── ResumePreview.tsx        # A4-ratio wrapper with scale logic
│   │   └── ResumeRenderer.tsx       # Pure render component (shared w/ server)
│   └── ui/                          # shadcn components (Button, Input, etc.)
├── lib/
│   ├── resume-data.ts               # All TypeScript types + default data
│   ├── storage.ts                   # localStorage read/write + auto-save
│   ├── pdf-generator.ts             # Puppeteer: HTML string -> PDF buffer
│   └── validate.ts                  # JSON import validation
├── styles/
│   ├── classic-blue.css             # Theme: blue underlined headers
│   ├── crimson-block.css            # Theme: crimson header bars
│   └── minimal-mono.css             # Theme: black & white hairlines
└── public/
    └── fonts/                       # (optional) self-hosted web fonts
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `components.json`
- Create: `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Initialize Next.js 15 with shadcn**

Run:
```bash
cd /home/func/projects/cv-builder
npx shadcn@latest init --yes --template next --base-color slate
```

Expected: Project initialized with `src/`, `app/`, Tailwind, TypeScript.

- [ ] **Step 2: Install additional dependencies**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  puppeteer-core @sparticuz/chromium-min \
  lucide-react clsx tailwind-merge
```

- [ ] **Step 3: Configure `next.config.js` for static export (optional) + standalone**

`next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}
module.exports = nextConfig
```

- [ ] **Step 4: Add Google Fonts to layout**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Fraunces, Manrope } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Typographer — CV Builder',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

- [ ] **Step 5: Configure Tailwind with custom colors**

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-fraunces)', 'serif'],
        sans: ['var(--font-manrope)', 'sans-serif'],
      },
      colors: {
        workspace: '#080a0f',
        panel: '#181c26',
        'panel-hover': '#1f2430',
        'border-panel': '#2a3040',
        'border-subtle': '#3a4052',
        accent: '#c9a96e',
        'accent-dim': '#b8955a',
        paper: '#faf8f5',
        'text-primary': '#e8e4dc',
        'text-secondary': '#a8adb8',
        'text-muted': '#6a7080',
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: init Next.js 15 + shadcn + tailwind config"
```

---

### Task 2: Type Definitions & Default Data

**Files:**
- Create: `src/lib/resume-data.ts`

- [ ] **Step 1: Write all types with Profile change**

`src/lib/resume-data.ts`:
```typescript
export interface ResumeMeta {
  version: number
  lastModified: string
  activeStyle: 'classic-blue' | 'crimson-block' | 'minimal-mono'
}

export interface Section {
  id: string
  enabled: boolean
  order: number
}

export interface Profile {
  type: 'paragraph' | 'bulletPoints'
  content: string        // used when type === 'paragraph'
  bullets: string[]      // used when type === 'bulletPoints'
}

export interface Contact {
  fullName: string
  city: string
  phone: string
  email: string
  linkedIn: string
  github: string
  portfolio: string
}

export interface SkillCategory {
  category: string
  items: string
}

export interface ExperienceItem {
  id: string
  title: string
  company: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface ProjectItem {
  id: string
  name: string
  context: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface EducationItem {
  id: string
  degree: string
  institution: string
  location: string
  startDate: string
  endDate: string
  details: string[]
}

export interface CertificationItem {
  id: string
  name: string
  issuer: string
  date: string
}

export interface Referee {
  name: string
  title: string
  organisation: string
  contact: string
}

export interface RefereesConfig {
  mode: 'omit' | 'on-request' | 'full'
  list: Referee[]
}

export interface ResumeData {
  meta: ResumeMeta
  sections: Section[]
  contact: Contact
  profile: Profile
  skills: SkillCategory[]
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
  certifications: CertificationItem[]
  referees: RefereesConfig
}
```

- [ ] **Step 2: Write default data**

Append to `src/lib/resume-data.ts`:
```typescript
export const defaultSections: Section[] = [
  { id: 'contact', enabled: true, order: 0 },
  { id: 'profile', enabled: true, order: 1 },
  { id: 'skills', enabled: true, order: 2 },
  { id: 'experience', enabled: true, order: 3 },
  { id: 'projects', enabled: true, order: 4 },
  { id: 'education', enabled: true, order: 5 },
  { id: 'certifications', enabled: false, order: 6 },
  { id: 'referees', enabled: true, order: 7 },
]

export const defaultResumeData: ResumeData = {
  meta: {
    version: 1,
    lastModified: new Date().toISOString(),
    activeStyle: 'classic-blue',
  },
  sections: [...defaultSections],
  contact: {
    fullName: 'Alex Chen',
    city: 'Sydney, NSW',
    phone: '0412 345 678',
    email: 'alex.chen@email.com',
    linkedIn: 'linkedin.com/in/alexchen',
    github: 'github.com/alexchen',
    portfolio: '',
  },
  profile: {
    type: 'paragraph',
    content: 'Final-year Computer Science student with a Distinction average. Full-stack development experience with React, Node.js and AWS. Passionate about building scalable web applications and seeking a graduate software engineering role in a dynamic tech team.',
    bullets: [
      'Final-year Computer Science student with a Distinction average',
      'Full-stack development experience with React, Node.js and AWS',
      'Passionate about building scalable web applications',
    ],
  },
  skills: [
    { category: 'Languages', items: 'JavaScript, TypeScript, Python, SQL' },
    { category: 'Frameworks', items: 'React, Next.js, Node.js, Express, Tailwind CSS' },
    { category: 'Cloud & DevOps', items: 'AWS (EC2, S3, Lambda), Docker, GitHub Actions, Vercel' },
    { category: 'Tools', items: 'Git, Figma, Jest, Cypress, MongoDB, PostgreSQL' },
  ],
  experience: [
    {
      id: 'exp-1',
      title: 'Software Engineering Intern',
      company: 'TechCorp, Sydney',
      startDate: 'Dec 2024',
      endDate: 'Current',
      bullets: [
        'Developed and deployed microservices using Node.js and AWS Lambda, reducing API response time by 40%',
        'Collaborated with a team of 5 engineers to redesign the customer dashboard using React and TypeScript',
        'Implemented automated testing with Jest and Cypress, increasing test coverage from 45% to 82%',
      ],
    },
    {
      id: 'exp-2',
      title: 'Junior Web Developer',
      company: 'Digital Studio, Melbourne',
      startDate: 'Jun 2024',
      endDate: 'Nov 2024',
      bullets: [
        'Built responsive landing pages for 8+ clients using Next.js and Tailwind CSS',
        'Integrated REST APIs and third-party services including Stripe and SendGrid',
        'Mentored two new interns on Git workflows and code review best practices',
      ],
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'E-Commerce Platform',
      context: 'Personal Project | MERN Stack',
      startDate: 'Aug 2024',
      endDate: 'Nov 2024',
      bullets: [
        'Built full-stack e-commerce app with React, Node.js, MongoDB and Stripe payment integration',
        'Implemented JWT authentication, role-based access control and admin dashboard',
        'Deployed on Vercel and Render with CI/CD pipeline via GitHub Actions',
      ],
    },
    {
      id: 'proj-2',
      name: 'Real-Time Chat Application',
      context: 'UNSW | Team of 3',
      startDate: 'Mar 2024',
      endDate: 'Jun 2024',
      bullets: [
        'Developed real-time messaging app using Socket.io, React and Express with 200+ concurrent users',
        'Designed MongoDB schema for message threads, user presence and read receipts',
        'Achieved Distinction grade; praised for clean architecture and comprehensive documentation',
      ],
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'Bachelor of Computer Science',
      institution: 'UNSW Sydney',
      location: 'Sydney, NSW',
      startDate: '2022',
      endDate: 'Expected Nov 2025',
      details: ['Distinction average (WAM: 78)', "Dean's Honour List 2023", 'Major in Software Engineering'],
    },
  ],
  certifications: [],
  referees: {
    mode: 'on-request',
    list: [
      { name: 'Sarah Mitchell', title: 'Engineering Manager', organisation: 'TechCorp, Sydney', contact: 'sarah.mitchell@techcorp.com' },
      { name: 'Dr. James Wong', title: 'Senior Lecturer', organisation: 'UNSW Sydney', contact: 'j.wong@unsw.edu.au' },
    ],
  },
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/resume-data.ts
git commit -m "feat: add ResumeData types and default template"
```

---

### Task 3: localStorage Persistence & Auto-Save

**Files:**
- Create: `src/lib/storage.ts`

- [ ] **Step 1: Implement storage layer**

`src/lib/storage.ts`:
```typescript
import { ResumeData, defaultResumeData, defaultSections } from './resume-data'

const STORAGE_KEY = 'cv-data'

export function loadResumeData(): ResumeData {
  if (typeof window === 'undefined') return { ...defaultResumeData }

  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return { ...defaultResumeData }

  try {
    const parsed = JSON.parse(saved) as ResumeData
    if (!parsed.contact) return { ...defaultResumeData }

    // Ensure sections array exists before merging
    if (!Array.isArray(parsed.sections)) {
      parsed.sections = []
    }

    // Merge sections: ensure all default sections exist
    const existingIds = new Set(parsed.sections.map((s) => s.id))
    defaultSections.forEach((ds) => {
      if (!existingIds.has(ds.id)) {
        parsed.sections.push({ ...ds })
      }
    })

    // Ensure referees object exists
    if (!parsed.referees) {
      parsed.referees = { mode: 'on-request', list: [] }
    }

    // Ensure profile object exists (migration from old summary field)
    if (!parsed.profile) {
      parsed.profile = {
        type: 'paragraph',
        content: (parsed as any).summary || '',
        bullets: [],
      }
    }

    return parsed
  } catch {
    return { ...defaultResumeData }
  }
}

export function saveResumeData(data: ResumeData): void {
  if (typeof window === 'undefined') return
  data.meta.lastModified = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function createDebouncedSaver(delay = 1000) {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (data: ResumeData) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => saveResumeData(data), delay)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: add localStorage persistence with section merging"
```

---

### Task 4: JSON Import/Export Validation

**Files:**
- Create: `src/lib/validate.ts`

- [ ] **Step 1: Implement validation**

`src/lib/validate.ts`:
```typescript
import { ResumeData } from './resume-data'

export function isValidResumeData(obj: unknown): obj is ResumeData {
  if (!obj || typeof obj !== 'object') return false
  const data = obj as Record<string, unknown>

  // Required top-level fields
  if (!data.meta || typeof data.meta !== 'object') return false
  if (!data.contact || typeof data.contact !== 'object') return false
  if (!Array.isArray(data.sections)) return false
  if (!Array.isArray(data.skills)) return false
  if (!Array.isArray(data.experience)) return false

  // Validate meta.version for future migrations
  const meta = data.meta as Record<string, unknown>
  if (typeof meta.version !== 'number') return false

  return true
}

export function exportResumeJSON(data: ResumeData): string {
  return JSON.stringify(data, null, 2)
}

export function importResumeJSON(json: string): ResumeData | null {
  try {
    const parsed = JSON.parse(json)
    if (isValidResumeData(parsed)) return parsed
    return null
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/validate.ts
git commit -m "feat: add JSON import/export validation"
```

---

### Task 5: Theme CSS Files

**Files:**
- Create: `src/styles/classic-blue.css`, `src/styles/crimson-block.css`, `src/styles/minimal-mono.css`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create classic-blue theme**

`src/styles/classic-blue.css`:
```css
.theme-classic-blue .paper-section-title {
  color: #1e4d8b;
  border-bottom: 1.5pt solid #1e4d8b;
  padding-bottom: 2pt;
  font-family: var(--font-fraunces), serif;
  font-size: 11pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 6pt;
}
```

- [ ] **Step 2: Create crimson-block theme**

`src/styles/crimson-block.css`:
```css
.theme-crimson-block .paper-section-title {
  background: #8b2635;
  color: #fff;
  padding: 2pt 6pt;
  display: inline-block;
  font-family: var(--font-fraunces), serif;
  font-size: 11pt;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 6pt;
}
```

- [ ] **Step 3: Create minimal-mono theme**

`src/styles/minimal-mono.css`:
```css
.theme-minimal-mono .paper,
.theme-minimal-mono .paper-name,
.theme-minimal-mono .paper-section-title {
  font-family: 'Times New Roman', serif !important;
}

.theme-minimal-mono .paper-name {
  font-weight: 700 !important;
}

.theme-minimal-mono .paper-section-title {
  font-size: 10.5pt !important;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0.5px;
  border-bottom: 0.5pt solid #1a1a1a;
  padding-bottom: 2pt;
  margin-bottom: 6pt;
}
```

- [ ] **Step 4: Import themes in globals.css**

Append to `src/app/globals.css`:
```css
@import '../styles/classic-blue.css';
@import '../styles/crimson-block.css';
@import '../styles/minimal-mono.css';
```

- [ ] **Step 5: Commit**

```bash
git add src/styles/ src/app/globals.css
git commit -m "feat: add three resume theme stylesheets"
```

---

### Task 6: ResumeRenderer Component

**Files:**
- Create: `src/components/preview/ResumeRenderer.tsx`

- [ ] **Step 1: Implement the pure render component**

`src/components/preview/ResumeRenderer.tsx`:
```tsx
import { ResumeData } from '@/lib/resume-data'

interface ResumeRendererProps {
  data: ResumeData
}

export function ResumeRenderer({ data }: ResumeRendererProps) {
  const { contact, profile, skills, experience, projects, education, certifications, referees, sections } = data

  const isEnabled = (id: string) => sections.find((s) => s.id === id)?.enabled ?? true

  const contactParts = [contact.city, contact.phone, contact.email, contact.linkedIn, contact.github].filter(Boolean)

  return (
    <div>
      {isEnabled('contact') && (
        <div style={{ textAlign: 'center', marginBottom: '14pt' }}>
          <h1 className="paper-name">{contact.fullName || 'Your Name'}</h1>
          <div className="paper-contact">{contactParts.join(' | ')}</div>
        </div>
      )}

      {isEnabled('profile') && (
        <div className="paper-section">
          <div className="paper-section-title">Profile</div>
          {profile.type === 'paragraph' ? (
            <p style={{ fontSize: '9.5pt', margin: 0 }}>{profile.content}</p>
          ) : (
            <ul className="paper-bullets">
              {profile.bullets.filter(Boolean).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isEnabled('skills') && skills.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">Technical Skills</div>
          {skills.map((skill, i) =>
            skill.category && skill.items ? (
              <div key={i} style={{ marginBottom: '3pt', fontSize: '9.5pt' }}>
                <strong>{skill.category}:</strong> {skill.items}
              </div>
            ) : null
          )}
        </div>
      )}

      {isEnabled('experience') && experience.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">Work Experience</div>
          {experience.map((exp) => (
            <div key={exp.id}>
              <div className="paper-item-header">
                <div>
                  <span className="paper-item-title">{exp.title}</span>{' '}
                  <span className="paper-item-subtitle">| {exp.company}</span>
                </div>
                <span className="paper-item-date">
                  {exp.startDate} – {exp.endDate}
                </span>
              </div>
              {exp.bullets.length > 0 && (
                <ul className="paper-bullets">
                  {exp.bullets.filter(Boolean).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {isEnabled('projects') && projects.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">Selected Projects</div>
          {projects.map((proj) => (
            <div key={proj.id}>
              <div className="paper-item-header">
                <div>
                  <span className="paper-item-title">{proj.name}</span>{' '}
                  <span className="paper-item-subtitle">| {proj.context}</span>
                </div>
                <span className="paper-item-date">
                  {proj.startDate} – {proj.endDate}
                </span>
              </div>
              {proj.bullets.length > 0 && (
                <ul className="paper-bullets">
                  {proj.bullets.filter(Boolean).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {isEnabled('education') && education.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">Education</div>
          {education.map((edu) => (
            <div key={edu.id}>
              <div className="paper-item-header">
                <div>
                  <span className="paper-item-title">{edu.degree}</span>
                </div>
                <span className="paper-item-date">
                  {edu.startDate} – {edu.endDate}
                </span>
              </div>
              <div className="paper-item-subtitle" style={{ marginBottom: '2pt' }}>
                {edu.institution}
                {edu.location ? `, ${edu.location}` : ''}
              </div>
              {edu.details.length > 0 && (
                <ul className="paper-bullets">
                  {edu.details.filter(Boolean).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {isEnabled('certifications') && certifications.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">Certifications</div>
          {certifications.map((cert) => (
            <div key={cert.id} style={{ fontSize: '9.5pt', marginBottom: '2pt' }}>
              <strong>{cert.name}</strong> — {cert.issuer}
              {cert.date ? `, ${cert.date}` : ''}
            </div>
          ))}
        </div>
      )}

      {isEnabled('referees') && (
        <div className="paper-section">
          <div className="paper-section-title">Referees</div>
          {referees.mode === 'on-request' && (
            <p style={{ fontSize: '9.5pt', margin: 0, fontStyle: 'italic' }}>Available upon request</p>
          )}
          {referees.mode === 'full' &&
            referees.list.map((ref, i) => (
              <div key={i} style={{ fontSize: '9.5pt', marginBottom: '4pt' }}>
                <strong>{ref.name}</strong> — {ref.title}, {ref.organisation}
                <br />
                <span style={{ color: '#555' }}>{ref.contact}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/preview/ResumeRenderer.tsx
git commit -m "feat: add ResumeRenderer component with Profile paragraph/bullet support"
```

---

### Task 7: ResumePreview (A4 Container with Scale)

**Files:**
- Create: `src/components/preview/ResumePreview.tsx`

- [ ] **Step 1: Implement A4 container**

`src/components/preview/ResumePreview.tsx`:
```tsx
'use client'

import { useEffect, useRef } from 'react'
import { ResumeRenderer } from './ResumeRenderer'
import { ResumeData } from '@/lib/resume-data'

interface ResumePreviewProps {
  data: ResumeData
}

export function ResumePreview({ data }: ResumePreviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function scalePaper() {
      const wrapper = wrapperRef.current
      const area = areaRef.current
      const paper = paperRef.current
      if (!wrapper || !area || !paper) return

      const scale = Math.min(
        (area.clientWidth - 48) / paper.offsetWidth,
        (area.clientHeight - 48) / paper.offsetHeight,
        1
      )
      const finalScale = Math.max(scale, 0.55)

      const scaledW = paper.offsetWidth * finalScale
      const scaledH = paper.offsetHeight * finalScale

      wrapper.style.transform = `scale(${finalScale})`
      wrapper.style.left = `${(area.clientWidth - scaledW) / 2}px`
      wrapper.style.top = `${(area.clientHeight - scaledH) / 2}px`
    }

    scalePaper()
    window.addEventListener('resize', scalePaper)
    return () => window.removeEventListener('resize', scalePaper)
  }, [data])

  return (
    <div ref={areaRef} className="relative flex-1 bg-[#080a0f] overflow-hidden">
      <div
        ref={wrapperRef}
        className="absolute origin-top-left transition-transform duration-300"
      >
        <div
          ref={paperRef}
          className={`paper theme-${data.meta.activeStyle}`}
          style={{
            width: '210mm',
            minHeight: '297mm',
            background: '#faf8f5',
            padding: '15mm 20mm',
            color: '#1a1a1a',
            fontSize: '10.5pt',
            lineHeight: 1.45,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5), 0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          <ResumeRenderer data={data} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add paper CSS to globals.css**

Append to `src/app/globals.css`:
```css
.paper-name {
  font-family: var(--font-fraunces), serif;
  font-size: 22pt;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4pt;
  letter-spacing: -0.3pt;
}

.paper-contact {
  font-size: 9.5pt;
  color: #555;
  margin-bottom: 14pt;
  text-align: center;
}

.paper-section {
  margin-bottom: 12pt;
}

.paper-item-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2pt;
}

.paper-item-title {
  font-weight: 700;
  font-size: 10.5pt;
}

.paper-item-subtitle {
  color: #555;
  font-size: 9.5pt;
}

.paper-item-date {
  font-size: 9pt;
  color: #555;
  text-align: right;
  white-space: nowrap;
}

.paper-bullets {
  list-style: none;
  padding: 0;
  margin: 2pt 0 6pt 0;
}

.paper-bullets li {
  position: relative;
  padding-left: 10pt;
  margin-bottom: 1.5pt;
  font-size: 9.5pt;
}

.paper-bullets li::before {
  content: '\2022';
  position: absolute;
  left: 0;
  color: #555;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/preview/ResumePreview.tsx src/app/globals.css
git commit -m "feat: add ResumePreview A4 container with auto-scale"
```

---

### Task 8: EditorPanel Container & Draggable Resizer

**Files:**
- Create: `src/components/editor/EditorPanel.tsx`

- [ ] **Step 1: Implement editor panel with resizer**

`src/components/editor/EditorPanel.tsx`:
```tsx
'use client'

import { useRef, useCallback, ReactNode } from 'react'

interface EditorPanelProps {
  children: ReactNode
}

export function EditorPanel({ children }: EditorPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMouseDown = useCallback(() => {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !panelRef.current) return
    const workspace = panelRef.current.parentElement
    if (!workspace) return
    const rect = workspace.getBoundingClientRect()
    const newWidth = e.clientX - rect.left
    const clamped = Math.max(280, Math.min(560, newWidth))
    panelRef.current.style.width = `${clamped}px`
  }, [])

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  return (
    <>
      <div
        ref={panelRef}
        className="flex flex-col border-r border-border-panel bg-workspace overflow-hidden shrink-0"
        style={{ width: 380 }}
      >
        <div className="px-6 py-4 border-b border-border-panel">
          <h2 className="font-serif text-sm font-medium text-text-secondary uppercase tracking-widest">
            Editor
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-12">{children}</div>
      </div>
      <div
        className="w-[6px] bg-transparent cursor-col-resize relative z-10 -ml-[3px] -mr-[3px] group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-8 rounded bg-border-subtle group-hover:bg-accent transition-colors" />
      </div>
      {/* Attach move/up listeners to window */}
      <GlobalDragListeners onMove={handleMouseMove} onUp={handleMouseUp} />
    </>
  )
}

function GlobalDragListeners({
  onMove,
  onUp,
}: {
  onMove: (e: MouseEvent) => void
  onUp: () => void
}) {
  const ref = useRef({ onMove, onUp })
  ref.current = { onMove, onUp }

  return null
}
```

Wait — the GlobalDragListeners approach above is broken. We need `useEffect` to attach window listeners. Let me rewrite properly:

`src/components/editor/EditorPanel.tsx`:
```tsx
'use client'

import { useRef, useEffect, useCallback, ReactNode } from 'react'

interface EditorPanelProps {
  children: ReactNode
}

export function EditorPanel({ children }: EditorPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMouseDown = useCallback(() => {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !panelRef.current) return
      const workspace = panelRef.current.parentElement
      if (!workspace) return
      const rect = workspace.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      const clamped = Math.max(280, Math.min(560, newWidth))
      panelRef.current.style.width = `${clamped}px`
    }

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <>
      <div
        ref={panelRef}
        className="flex flex-col border-r border-border-panel bg-workspace overflow-hidden shrink-0"
        style={{ width: 380 }}
      >
        <div className="px-6 py-4 border-b border-border-panel">
          <h2 className="font-serif text-sm font-medium text-text-secondary uppercase tracking-widest">
            Editor
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-12">{children}</div>
      </div>
      <div
        className="w-[6px] bg-transparent cursor-col-resize relative z-10 -ml-[3px] -mr-[3px] group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-8 rounded bg-border-subtle group-hover:bg-accent transition-colors" />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/EditorPanel.tsx
git commit -m "feat: add EditorPanel with draggable resizer"
```

---

### Task 9: SectionToggle & SortableSectionList

**Files:**
- Create: `src/components/editor/SectionToggle.tsx`
- Create: `src/components/editor/SortableSectionList.tsx`

- [ ] **Step 1: SectionToggle component**

`src/components/editor/SectionToggle.tsx`:
```tsx
interface SectionToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function SectionToggle({ enabled, onChange }: SectionToggleProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-text-muted font-medium">{enabled ? 'On' : 'Off'}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onChange(!enabled)
        }}
        className={`w-9 h-5 rounded-full relative transition-colors ${
          enabled ? 'bg-accent/30' : 'bg-border-subtle'
        }`}
      >
        <span
          className={`absolute top-[2px] w-4 h-4 rounded-full transition-all ${
            enabled ? 'left-[18px] bg-accent' : 'left-[2px] bg-text-secondary'
          }`}
        />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: SortableSectionList component**

`src/components/editor/SortableSectionList.tsx`:
```tsx
'use client'

import { useMemo, ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Section } from '@/lib/resume-data'

interface SortableSectionListProps {
  sections: Section[]
  onReorder: (sections: Section[]) => void
  children: (section: Section) => ReactNode
}

function SortableItem({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 mr-1 text-text-muted hover:text-text-secondary"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="2" cy="6" r="1.5" />
            <circle cx="2" cy="10" r="1.5" />
            <circle cx="10" cy="2" r="1.5" />
            <circle cx="10" cy="6" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
          </svg>
        </div>
        {children}
      </div>
    </div>
  )
}

export function SortableSectionList({ sections, onReorder, children }: SortableSectionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const items = useMemo(() => sections.filter((s) => s.enabled).map((s) => s.id), [sections])

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id)
      const newIndex = sections.findIndex((s) => s.id === over.id)
      onReorder(arrayMove(sections, oldIndex, newIndex))
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {sections
          .sort((a, b) => a.order - b.order)
          .map((section) => (
            <SortableItem key={section.id} id={section.id}>
              {children(section)}
            </SortableItem>
          ))}
      </SortableContext>
    </DndContext>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/SectionToggle.tsx src/components/editor/SortableSectionList.tsx
git commit -m "feat: add SectionToggle and SortableSectionList"
```

---

### Task 10: ProfileForm (Paragraph / BulletPoints)

**Files:**
- Create: `src/components/editor/ProfileForm.tsx`

- [ ] **Step 1: Implement ProfileForm with mode toggle**

`src/components/editor/ProfileForm.tsx`:
```tsx
'use client'

import { Profile } from '@/lib/resume-data'

interface ProfileFormProps {
  profile: Profile
  onChange: (profile: Profile) => void
}

export function ProfileForm({ profile, onChange }: ProfileFormProps) {
  const setType = (type: 'paragraph' | 'bulletPoints') => {
    onChange({ ...profile, type })
  }

  const setContent = (content: string) => {
    onChange({ ...profile, content })
  }

  const setBullet = (index: number, value: string) => {
    const bullets = [...profile.bullets]
    bullets[index] = value
    onChange({ ...profile, bullets })
  }

  const addBullet = () => {
    onChange({ ...profile, bullets: [...profile.bullets, ''] })
  }

  const removeBullet = (index: number) => {
    const bullets = profile.bullets.filter((_, i) => i !== index)
    onChange({ ...profile, bullets })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
          Format
        </span>
        <div className="flex rounded-md overflow-hidden border border-border-subtle">
          <button
            type="button"
            onClick={() => setType('paragraph')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              profile.type === 'paragraph'
                ? 'bg-accent text-workspace'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Paragraph
          </button>
          <button
            type="button"
            onClick={() => setType('bulletPoints')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border-subtle ${
              profile.type === 'bulletPoints'
                ? 'bg-accent text-workspace'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Bullet Points
          </button>
        </div>
      </div>

      {profile.type === 'paragraph' ? (
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
            Profile Summary
          </label>
          <textarea
            value={profile.content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/15 placeholder-text-muted resize-y min-h-[60px]"
            placeholder="Write a concise 35-80 word summary of your skills, experience and career goals."
          />
        </div>
      ) : (
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
            Profile Points
          </label>
          {profile.bullets.map((bullet, i) => (
            <div key={i} className="flex items-start gap-1 mb-1">
              <span className="text-accent mt-1.5 text-sm shrink-0">›</span>
              <input
                type="text"
                value={bullet}
                onChange={(e) => setBullet(i, e.target.value)}
                className="flex-1 bg-transparent border-b border-border-subtle text-text-primary text-sm py-1 outline-none focus:border-accent-dim placeholder-text-muted placeholder-italic"
                placeholder="Key point about your background"
              />
              <button
                type="button"
                onClick={() => removeBullet(i)}
                className="text-text-muted hover:text-red-400 p-1 rounded transition-colors"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addBullet}
            className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 mt-1 hover:bg-accent/10 transition-colors"
          >
            + Add point
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/ProfileForm.tsx
git commit -m "feat: add ProfileForm with paragraph/bulletPoints toggle"
```

---

### Task 11: Remaining Form Components

**Files:**
- Create: `src/components/editor/ContactForm.tsx`
- Create: `src/components/editor/SkillsForm.tsx`
- Create: `src/components/editor/ExperienceForm.tsx`
- Create: `src/components/editor/ProjectsForm.tsx`
- Create: `src/components/editor/EducationForm.tsx`
- Create: `src/components/editor/CertificationsForm.tsx`
- Create: `src/components/editor/RefereesForm.tsx`

- [ ] **Step 1: ContactForm**

`src/components/editor/ContactForm.tsx`:
```tsx
import { Contact } from '@/lib/resume-data'

interface ContactFormProps {
  contact: Contact
  onChange: (contact: Contact) => void
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/15 placeholder-text-muted"
      />
    </div>
  )
}

export function ContactForm({ contact, onChange }: ContactFormProps) {
  const update = (field: keyof Contact, value: string) => {
    onChange({ ...contact, [field]: value })
  }

  return (
    <div>
      <Field label="Full Name" value={contact.fullName} onChange={(v) => update('fullName', v)} placeholder="Alex Chen" />
      <div className="grid grid-cols-2 gap-2">
        <Field label="City" value={contact.city} onChange={(v) => update('city', v)} placeholder="Sydney, NSW" />
        <Field label="Phone" value={contact.phone} onChange={(v) => update('phone', v)} placeholder="0412 345 678" />
      </div>
      <Field label="Email" value={contact.email} onChange={(v) => update('email', v)} placeholder="alex.chen@email.com" />
      <Field label="LinkedIn" value={contact.linkedIn} onChange={(v) => update('linkedIn', v)} placeholder="linkedin.com/in/alexchen" />
      <Field label="GitHub" value={contact.github} onChange={(v) => update('github', v)} placeholder="github.com/alexchen" />
      <Field label="Portfolio" value={contact.portfolio} onChange={(v) => update('portfolio', v)} placeholder="alexchen.dev" />
    </div>
  )
}
```

- [ ] **Step 2: SkillsForm**

`src/components/editor/SkillsForm.tsx`:
```tsx
import { SkillCategory } from '@/lib/resume-data'

interface SkillsFormProps {
  skills: SkillCategory[]
  onChange: (skills: SkillCategory[]) => void
}

export function SkillsForm({ skills, onChange }: SkillsFormProps) {
  const update = (index: number, field: keyof SkillCategory, value: string) => {
    const next = [...skills]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  const add = () => onChange([...skills, { category: 'New Category', items: '' }])
  const remove = (index: number) => onChange(skills.filter((_, i) => i !== index))

  return (
    <div>
      {skills.map((skill, i) => (
        <div key={i} className="mb-4 pb-4 border-b border-border-subtle last:border-0 last:mb-0 last:pb-0">
          <div className="mb-2">
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Category</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skill.category}
                onChange={(e) => update(i, 'category', e.target.value)}
                className="flex-1 px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim"
              />
              <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Skills (comma-separated)</label>
            <input
              type="text"
              value={skill.items}
              onChange={(e) => update(i, 'items', e.target.value)}
              className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim"
            />
          </div>
        </div>
      ))}
      <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Category</button>
    </div>
  )
}
```

- [ ] **Step 3: ExperienceForm**

`src/components/editor/ExperienceForm.tsx`:
```tsx
import { ExperienceItem } from '@/lib/resume-data'

interface ExperienceFormProps {
  experience: ExperienceItem[]
  onChange: (experience: ExperienceItem[]) => void
}

export function ExperienceForm({ experience, onChange }: ExperienceFormProps) {
  const update = (index: number, field: keyof ExperienceItem, value: string | string[]) => {
    const next = [...experience]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  const add = () => onChange([...experience, { id: `exp-${Date.now()}`, title: '', company: '', startDate: '', endDate: '', bullets: [''] }])
  const remove = (index: number) => onChange(experience.filter((_, i) => i !== index))
  const addBullet = (index: number) => update(index, 'bullets', [...experience[index].bullets, ''])
  const removeBullet = (expIdx: number, bulletIdx: number) => {
    const bullets = experience[expIdx].bullets.filter((_, i) => i !== bulletIdx)
    update(expIdx, 'bullets', bullets)
  }
  const setBullet = (expIdx: number, bulletIdx: number, value: string) => {
    const bullets = [...experience[expIdx].bullets]
    bullets[bulletIdx] = value
    update(expIdx, 'bullets', bullets)
  }

  return (
    <div>
      {experience.map((exp, i) => (
        <div key={exp.id} className="bg-workspace border border-border-subtle rounded-md p-4 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-serif text-[11px] font-semibold text-accent tracking-wide">#{i + 1}</span>
            <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
          </div>
          <div className="mb-2">
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Job Title</label>
            <input type="text" value={exp.title} onChange={(e) => update(i, 'title', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" />
          </div>
          <div className="mb-2">
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Company</label>
            <input type="text" value={exp.company} onChange={(e) => update(i, 'company', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Start Date</label>
              <input type="text" value={exp.startDate} onChange={(e) => update(i, 'startDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">End Date</label>
              <input type="text" value={exp.endDate} onChange={(e) => update(i, 'endDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Achievements</label>
            {exp.bullets.map((b, j) => (
              <div key={j} className="flex items-start gap-1 mb-1">
                <span className="text-accent mt-1.5 text-sm shrink-0">›</span>
                <input type="text" value={b} onChange={(e) => setBullet(i, j, e.target.value)} placeholder="Action verb + Task + Outcome" className="flex-1 bg-transparent border-b border-border-subtle text-text-primary text-sm py-1 outline-none focus:border-accent-dim placeholder-text-muted placeholder-italic" />
                <button onClick={() => removeBullet(i, j)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors">×</button>
              </div>
            ))}
            <button onClick={() => addBullet(i)} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 mt-1 hover:bg-accent/10 transition-colors">+ Add bullet</button>
          </div>
        </div>
      ))}
      <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Experience</button>
    </div>
  )
}
```

- [ ] **Step 4: ProjectsForm, EducationForm, CertificationsForm, RefereesForm**

`src/components/editor/ProjectsForm.tsx`:
```tsx
import { ProjectItem } from '@/lib/resume-data'

interface ProjectsFormProps {
  projects: ProjectItem[]
  onChange: (projects: ProjectItem[]) => void
}

export function ProjectsForm({ projects, onChange }: ProjectsFormProps) {
  const update = (index: number, field: keyof ProjectItem, value: string | string[]) => {
    const next = [...projects]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }
  const add = () => onChange([...projects, { id: `proj-${Date.now()}`, name: '', context: '', startDate: '', endDate: '', bullets: [''] }])
  const remove = (index: number) => onChange(projects.filter((_, i) => i !== index))
  const addBullet = (index: number) => update(index, 'bullets', [...projects[index].bullets, ''])
  const removeBullet = (projIdx: number, bulletIdx: number) => update(projIdx, 'bullets', projects[projIdx].bullets.filter((_, i) => i !== bulletIdx))
  const setBullet = (projIdx: number, bulletIdx: number, value: string) => {
    const bullets = [...projects[projIdx].bullets]
    bullets[bulletIdx] = value
    update(projIdx, 'bullets', bullets)
  }

  return (
    <div>
      {projects.map((proj, i) => (
        <div key={proj.id} className="bg-workspace border border-border-subtle rounded-md p-4 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-serif text-[11px] font-semibold text-accent tracking-wide">#{i + 1}</span>
            <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
          </div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Project Name</label><input type="text" value={proj.name} onChange={(e) => update(i, 'name', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Context</label><input type="text" value={proj.context} onChange={(e) => update(i, 'context', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Start Date</label><input type="text" value={proj.startDate} onChange={(e) => update(i, 'startDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">End Date</label><input type="text" value={proj.endDate} onChange={(e) => update(i, 'endDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Description</label>
            {proj.bullets.map((b, j) => (
              <div key={j} className="flex items-start gap-1 mb-1">
                <span className="text-accent mt-1.5 text-sm shrink-0">›</span>
                <input type="text" value={b} onChange={(e) => setBullet(i, j, e.target.value)} className="flex-1 bg-transparent border-b border-border-subtle text-text-primary text-sm py-1 outline-none focus:border-accent-dim placeholder-text-muted placeholder-italic" />
                <button onClick={() => removeBullet(i, j)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors">×</button>
              </div>
            ))}
            <button onClick={() => addBullet(i)} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 mt-1 hover:bg-accent/10 transition-colors">+ Add bullet</button>
          </div>
        </div>
      ))}
      <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Project</button>
    </div>
  )
}
```

`src/components/editor/EducationForm.tsx`:
```tsx
import { EducationItem } from '@/lib/resume-data'

interface EducationFormProps {
  education: EducationItem[]
  onChange: (education: EducationItem[]) => void
}

export function EducationForm({ education, onChange }: EducationFormProps) {
  const update = (index: number, field: keyof EducationItem, value: string | string[]) => {
    const next = [...education]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }
  const add = () => onChange([...education, { id: `edu-${Date.now()}`, degree: '', institution: '', location: '', startDate: '', endDate: '', details: [''] }])
  const remove = (index: number) => onChange(education.filter((_, i) => i !== index))
  const addDetail = (index: number) => update(index, 'details', [...education[index].details, ''])
  const removeDetail = (eduIdx: number, detailIdx: number) => update(eduIdx, 'details', education[eduIdx].details.filter((_, i) => i !== detailIdx))
  const setDetail = (eduIdx: number, detailIdx: number, value: string) => {
    const details = [...education[eduIdx].details]
    details[detailIdx] = value
    update(eduIdx, 'details', details)
  }

  return (
    <div>
      {education.map((edu, i) => (
        <div key={edu.id} className="bg-workspace border border-border-subtle rounded-md p-4 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-serif text-[11px] font-semibold text-accent tracking-wide">#{i + 1}</span>
            <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
          </div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Degree</label><input type="text" value={edu.degree} onChange={(e) => update(i, 'degree', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Institution</label><input type="text" value={edu.institution} onChange={(e) => update(i, 'institution', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Location</label><input type="text" value={edu.location} onChange={(e) => update(i, 'location', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Start Date</label><input type="text" value={edu.startDate} onChange={(e) => update(i, 'startDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">End Date</label><input type="text" value={edu.endDate} onChange={(e) => update(i, 'endDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Details</label>
            {edu.details.map((d, j) => (
              <div key={j} className="flex items-start gap-1 mb-1">
                <span className="text-accent mt-1.5 text-sm shrink-0">›</span>
                <input type="text" value={d} onChange={(e) => setDetail(i, j, e.target.value)} className="flex-1 bg-transparent border-b border-border-subtle text-text-primary text-sm py-1 outline-none focus:border-accent-dim placeholder-text-muted placeholder-italic" />
                <button onClick={() => removeDetail(i, j)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors">×</button>
              </div>
            ))}
            <button onClick={() => addDetail(i)} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 mt-1 hover:bg-accent/10 transition-colors">+ Add detail</button>
          </div>
        </div>
      ))}
      <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Education</button>
    </div>
  )
}
```

`src/components/editor/CertificationsForm.tsx`:
```tsx
import { CertificationItem } from '@/lib/resume-data'

interface CertificationsFormProps {
  certifications: CertificationItem[]
  onChange: (certifications: CertificationItem[]) => void
}

export function CertificationsForm({ certifications, onChange }: CertificationsFormProps) {
  const update = (index: number, field: keyof CertificationItem, value: string) => {
    const next = [...certifications]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }
  const add = () => onChange([...certifications, { id: `cert-${Date.now()}`, name: '', issuer: '', date: '' }])
  const remove = (index: number) => onChange(certifications.filter((_, i) => i !== index))

  return (
    <div>
      {certifications.map((cert, i) => (
        <div key={cert.id} className="bg-workspace border border-border-subtle rounded-md p-4 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-serif text-[11px] font-semibold text-accent tracking-wide">#{i + 1}</span>
            <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
          </div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Certification Name</label><input type="text" value={cert.name} onChange={(e) => update(i, 'name', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Issuer</label><input type="text" value={cert.issuer} onChange={(e) => update(i, 'issuer', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Date</label><input type="text" value={cert.date} onChange={(e) => update(i, 'date', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          </div>
        </div>
      ))}
      <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Certification</button>
    </div>
  )
}
```

`src/components/editor/RefereesForm.tsx`:
```tsx
import { RefereesConfig } from '@/lib/resume-data'

interface RefereesFormProps {
  referees: RefereesConfig
  onChange: (referees: RefereesConfig) => void
}

export function RefereesForm({ referees, onChange }: RefereesFormProps) {
  const setMode = (mode: RefereesConfig['mode']) => onChange({ ...referees, mode })
  const add = () => onChange({ ...referees, list: [...referees.list, { name: '', title: '', organisation: '', contact: '' }] })
  const remove = (index: number) => onChange({ ...referees, list: referees.list.filter((_, i) => i !== index) })
  const update = (index: number, field: keyof RefereesConfig['list'][0], value: string) => {
    const list = [...referees.list]
    list[index] = { ...list[index], [field]: value }
    onChange({ ...referees, list })
  }

  return (
    <div>
      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Display Mode</label>
        <select
          value={referees.mode}
          onChange={(e) => setMode(e.target.value as RefereesConfig['mode'])}
          className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236a7080' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}
        >
          <option value="omit">Omit entirely</option>
          <option value="on-request">Available upon request</option>
          <option value="full">List referees</option>
        </select>
      </div>
      {referees.mode === 'full' && (
        <>
          {referees.list.map((ref, i) => (
            <div key={i} className="bg-workspace border border-border-subtle rounded-md p-4 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-serif text-[11px] font-semibold text-accent tracking-wide">#{i + 1}</span>
                <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
              </div>
              <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Name</label><input type="text" value={ref.name} onChange={(e) => update(i, 'name', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
              <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Title</label><input type="text" value={ref.title} onChange={(e) => update(i, 'title', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
              <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Organisation</label><input type="text" value={ref.organisation} onChange={(e) => update(i, 'organisation', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
              <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Contact</label><input type="text" value={ref.contact} onChange={(e) => update(i, 'contact', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
            </div>
          ))}
          <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Referee</button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/
git commit -m "feat: add all editor form components"
```

---

### Task 12: PDF Generation API

**Files:**
- Create: `src/lib/pdf-generator.ts`
- Create: `src/app/api/pdf/route.ts`

- [ ] **Step 1: Implement PDF generator with Puppeteer**

`src/lib/pdf-generator.ts`:
```typescript
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResumeData } from './resume-data'
import { ResumeRenderer } from '@/components/preview/ResumeRenderer'

const paperCSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&display=swap');
body { margin: 0; font-family: 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.45; color: #1a1a1a; }
.paper { width: 210mm; min-height: 297mm; padding: 15mm 20mm; background: #faf8f5; box-sizing: border-box; }
.paper-name { font-family: 'Fraunces', serif; font-size: 22pt; font-weight: 600; margin-bottom: 4pt; letter-spacing: -0.3pt; text-align: center; }
.paper-contact { font-size: 9.5pt; color: #555; margin-bottom: 14pt; text-align: center; }
.paper-section { margin-bottom: 12pt; }
.paper-section-title { font-family: 'Fraunces', serif; font-size: 11pt; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6pt; }
.paper-item-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2pt; }
.paper-item-title { font-weight: 700; font-size: 10.5pt; }
.paper-item-subtitle { color: #555; font-size: 9.5pt; }
.paper-item-date { font-size: 9pt; color: #555; text-align: right; white-space: nowrap; }
.paper-bullets { list-style: none; padding: 0; margin: 2pt 0 6pt 0; }
.paper-bullets li { position: relative; padding-left: 10pt; margin-bottom: 1.5pt; font-size: 9.5pt; }
.paper-bullets li::before { content: '\\2022'; position: absolute; left: 0; color: #555; }
`

const themeCSS = `
.theme-classic-blue .paper-section-title { color: #1e4d8b; border-bottom: 1.5pt solid #1e4d8b; padding-bottom: 2pt; }
.theme-crimson-block .paper-section-title { background: #8b2635; color: #fff; padding: 2pt 6pt; display: inline-block; letter-spacing: 0.8px; }
.theme-minimal-mono .paper-name, .theme-minimal-mono .paper-section-title { font-family: 'Times New Roman', serif !important; font-weight: 700 !important; }
.theme-minimal-mono .paper-section-title { font-size: 10.5pt; text-transform: none; letter-spacing: 0.5px; border-bottom: 0.5pt solid #1a1a1a; padding-bottom: 2pt; }
`

function buildHTML(data: ResumeData): string {
  const body = renderToStaticMarkup(React.createElement(ResumeRenderer, { data }))
  const themeClass = `theme-${data.meta.activeStyle}`
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>${paperCSS}${themeCSS}</style></head><body>
<div class="paper ${themeClass}">
  ${body}
</div>
</body></html>`
}

export async function generatePDF(data: ResumeData): Promise<Buffer> {
  const chromium = (await import('puppeteer-core')).default
  const executablePath = await import('@sparticuz/chromium-min').then((m) => m.default.executablePath())

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  const html = buildHTML(data)
  await page.setContent(html, { waitUntil: 'domcontentloaded' })

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  })

  await browser.close()
  return Buffer.from(pdf)
}
```

- [ ] **Step 2: Create API route**

`src/app/api/pdf/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { generatePDF } from '@/lib/pdf-generator'
import { isValidResumeData } from '@/lib/validate'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!isValidResumeData(body)) {
      return NextResponse.json({ error: 'Invalid resume data' }, { status: 400 })
    }

    const pdf = await generatePDF(body)

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
      },
    })
  } catch (error) {
    console.error('PDF generation failed:', error)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/pdf-generator.ts src/app/api/pdf/route.ts
git commit -m "feat: add Puppeteer PDF generation API"
```

---

### Task 13: Main Page Integration

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Step 1: Implement the main page**

`src/app/page.tsx`:
```tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { ResumeData, defaultResumeData, Section } from '@/lib/resume-data'
import { loadResumeData, createDebouncedSaver } from '@/lib/storage'
import { exportResumeJSON, importResumeJSON } from '@/lib/validate'
import { EditorPanel } from '@/components/editor/EditorPanel'
import { SectionToggle } from '@/components/editor/SectionToggle'
import { ProfileForm } from '@/components/editor/ProfileForm'
import { ContactForm } from '@/components/editor/ContactForm'
import { SkillsForm } from '@/components/editor/SkillsForm'
import { ExperienceForm } from '@/components/editor/ExperienceForm'
import { ProjectsForm } from '@/components/editor/ProjectsForm'
import { EducationForm } from '@/components/editor/EducationForm'
import { CertificationsForm } from '@/components/editor/CertificationsForm'
import { RefereesForm } from '@/components/editor/RefereesForm'
import { ResumePreview } from '@/components/preview/ResumePreview'

const debouncedSave = createDebouncedSaver(1000)

const sectionLabels: Record<string, string> = {
  contact: 'Contact Information',
  profile: 'Profile',
  skills: 'Technical Skills',
  experience: 'Work Experience',
  projects: 'Selected Projects',
  education: 'Education',
  certifications: 'Certifications',
  referees: 'Referees',
}

export default function HomePage() {
  const [data, setData] = useState<ResumeData>(defaultResumeData)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = loadResumeData()
    setData(saved)
    setLoaded(true)
  }, [])

  const updateData = useCallback(
    (updater: (prev: ResumeData) => ResumeData) => {
      setData((prev) => {
        const next = updater(prev)
        debouncedSave(next)
        return next
      })
    },
    []
  )

  const toggleSection = (id: string) => {
    updateData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)),
    }))
  }

  const exportJSON = () => {
    const json = exportResumeJSON(data)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJSON = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = importResumeJSON(e.target?.result as string)
      if (result) {
        setData(result)
        debouncedSave(result)
      } else {
        alert('Invalid resume file format')
      }
    }
    reader.readAsText(file)
  }

  const downloadPDF = async () => {
    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('PDF generation failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF generation failed. Check server logs.')
    }
  }

  const sectionMap: Record<string, React.ReactNode> = {
    contact: <ContactForm contact={data.contact} onChange={(contact) => updateData((prev) => ({ ...prev, contact }))} />,
    profile: <ProfileForm profile={data.profile} onChange={(profile) => updateData((prev) => ({ ...prev, profile }))} />,
    skills: <SkillsForm skills={data.skills} onChange={(skills) => updateData((prev) => ({ ...prev, skills }))} />,
    experience: <ExperienceForm experience={data.experience} onChange={(experience) => updateData((prev) => ({ ...prev, experience }))} />,
    projects: <ProjectsForm projects={data.projects} onChange={(projects) => updateData((prev) => ({ ...prev, projects }))} />,
    education: <EducationForm education={data.education} onChange={(education) => updateData((prev) => ({ ...prev, education }))} />,
    certifications: <CertificationsForm certifications={data.certifications} onChange={(certifications) => updateData((prev) => ({ ...prev, certifications }))} />,
    referees: <RefereesForm referees={data.referees} onChange={(referees) => updateData((prev) => ({ ...prev, referees }))} />,
  }

  if (!loaded) {
    return (
      <div className="h-screen bg-workspace flex items-center justify-center">
        <div className="text-text-secondary font-serif text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-workspace">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 h-[52px] bg-panel border-b border-border-panel shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-lg font-medium text-text-primary tracking-tight">
            Typographer<span className="text-accent font-semibold">.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-text-muted font-medium">Style</label>
            <select
              value={data.meta.activeStyle}
              onChange={(e) => updateData((prev) => ({ ...prev, meta: { ...prev.meta, activeStyle: e.target.value as any } }))}
              className="bg-panel border border-border-panel rounded-md text-text-primary text-xs px-2 py-1 outline-none focus:border-accent-dim"
            >
              <option value="classic-blue">Classic Blue</option>
              <option value="crimson-block">Crimson Block</option>
              <option value="minimal-mono">Minimal Mono</option>
            </select>
          </div>
          <button onClick={exportJSON} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-text-secondary border border-border-subtle rounded-md hover:border-text-muted hover:text-text-primary transition-colors">
            Export JSON
          </button>
          <label className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-text-secondary border border-border-subtle rounded-md hover:border-text-muted hover:text-text-primary transition-colors cursor-pointer">
            Import JSON
            <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
          </label>
          <button onClick={downloadPDF} className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-accent text-workspace rounded-md hover:bg-accent/90 transition-colors">
            Download PDF
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex flex-1 overflow-hidden">
        <EditorPanel>
          {data.sections
            .sort((a, b) => a.order - b.order)
            .map((section) => (
              <div key={section.id} className="bg-panel border border-border-panel rounded-lg mb-2 overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-panel-hover transition-colors"
                  onClick={(e) => {
                    const target = e.target as HTMLElement
                    if (target.closest('[data-toggle]')) return
                    const body = e.currentTarget.nextElementSibling as HTMLElement
                    if (body) body.style.maxHeight = body.style.maxHeight ? '' : '3000px'
                  }}
                >
                  <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <span className="text-text-muted text-sm">›</span>
                    {sectionLabels[section.id]}
                  </span>
                  <div data-toggle>
                    <SectionToggle enabled={section.enabled} onChange={() => toggleSection(section.id)} />
                  </div>
                </div>
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: '3000px' }}>
                  <div className="px-4 pb-4">{sectionMap[section.id]}</div>
                </div>
              </div>
            ))}
        </EditorPanel>

        <ResumePreview data={data} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate all components into main page"
```

---

### Task 14: Layout File Update

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update layout to remove default Next.js styles**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Fraunces, Manrope } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Typographer — CV Builder',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Update globals.css with base styles**

`src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import '../styles/classic-blue.css';
@import '../styles/crimson-block.css';
@import '../styles/minimal-mono.css';

:root {
  --font-fraunces: 'Fraunces', serif;
  --font-manrope: 'Manrope', sans-serif;
}

body {
  background: #080a0f;
  color: #e8e4dc;
}

/* Scrollbar */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #3a4052; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #6a7080; }

/* Paper styles */
.paper-name {
  font-family: var(--font-fraunces), serif;
  font-size: 22pt;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4pt;
  letter-spacing: -0.3pt;
}

.paper-contact {
  font-size: 9.5pt;
  color: #555;
  margin-bottom: 14pt;
  text-align: center;
}

.paper-section {
  margin-bottom: 12pt;
}

.paper-item-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2pt;
}

.paper-item-title {
  font-weight: 700;
  font-size: 10.5pt;
}

.paper-item-subtitle {
  color: #555;
  font-size: 9.5pt;
}

.paper-item-date {
  font-size: 9pt;
  color: #555;
  text-align: right;
  white-space: nowrap;
}

.paper-bullets {
  list-style: none;
  padding: 0;
  margin: 2pt 0 6pt 0;
}

.paper-bullets li {
  position: relative;
  padding-left: 10pt;
  margin-bottom: 1.5pt;
  font-size: 9.5pt;
}

.paper-bullets li::before {
  content: '\2022';
  position: absolute;
  left: 0;
  color: #555;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "chore: finalize layout and global styles"
```

---

### Task 15: Build & Verify

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Start dev server and manually verify**

```bash
npm run dev
```

Verify checklist:
- [ ] Page loads with dark editorial UI
- [ ] Editor panel shows all 8 sections
- [ ] Profile form has Paragraph / Bullet Points toggle
- [ ] Toggle switches enable/disable sections
- [ ] Draggable resizer adjusts panel width
- [ ] A4 preview auto-scales and centers
- [ ] Style switcher changes preview theme
- [ ] Export JSON downloads valid file
- [ ] Import JSON restores data correctly
- [ ] Download PDF calls API and returns PDF
- [ ] localStorage auto-saves on changes
- [ ] All add/remove buttons work for multi-item sections

- [ ] **Step 3: Commit final**

```bash
git add .
git commit -m "feat: complete CV builder implementation"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ Next.js App Router architecture
- ✅ Left editor + right preview layout
- ✅ Button-triggered PDF via Puppeteer API route
- ✅ 3 ATS-safe themes
- ✅ localStorage persistence
- ✅ JSON import/export
- ✅ Section toggle + reorder
- ✅ Multi-item sections with add/remove
- ✅ **Profile paragraph/bulletPoints toggle** (Task 10)
- ✅ Referees with mode selection
- ✅ Draggable resizer

**2. Placeholder scan:** No TBD, TODO, or vague steps found.

**3. Type consistency:** All types defined in Task 2 (`resume-data.ts`) and referenced consistently across all tasks. `Profile` interface with `type: 'paragraph' | 'bulletPoints'` used in `ResumeRenderer`, `ProfileForm`, and `pdf-generator.ts`.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2025-05-19-cv-builder-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
