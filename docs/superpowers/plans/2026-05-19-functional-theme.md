# Functional Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth resume theme `functional` that matches the reference image: sans-serif single-column overall, with per-item two-column layout (organisation/location/period metadata on the left, role + bullets on the right) for Work Experience, Selected Projects, Education, and Certifications. Plus thin horizontal dividers between sections and a `name | phone | email` footer.

**Architecture:** Purely additive. A new `'functional'` value is added to `meta.activeStyle`. `ResumeRenderer` gains a single `isFunctional` branch per affected section so the existing three themes' DOM is byte-identical. Two stylesheets are kept in sync (`src/app/globals.css` for the on-screen preview, the inline `themeCSS` string in `src/lib/pdf-generator.ts` for PDF) — this duplication is acknowledged tech debt; do not refactor in this PR. Optional `location` field is added to `ExperienceItem` and `ProjectItem` (`EducationItem` already has it). New field is rendered only by the Functional theme; existing themes ignore it.

**Tech Stack:** Next.js 16, React 19, `puppeteer-core` + `@sparticuz/chromium` (no new dependencies).

**Reference image:** Already downloaded at `/tmp/resume-sample.jpg` (1186×1662). Used for the visual checks in Phase 5.

---

## Design Summary

| Image feature | Implementation |
|---------------|----------------|
| Sans-serif throughout | `.theme-functional { font-family: Arial, Helvetica, sans-serif }` |
| Name large, bold, **left-aligned** | `.theme-functional .paper-name { text-align: left; font-size: 24pt; font-weight: 700 }` |
| Contact info stacked vertically (one per line) | New `<div>` per contact line in `ResumeRenderer` `isFunctional` branch |
| Horizontal rule below contact block | `border-bottom` on the contact wrapper |
| Section titles uppercase bold sans-serif | `.theme-functional .paper-section-title` overrides |
| Horizontal rule **between** sections | `border-bottom` on `.paper-section`, suppressed on the visually last one |
| Work History items: meta (org / location / period) left, role + bullets right | New DOM in `ResumeRenderer` (paper-item--functional grid) |
| Qualifications items: school metadata left, qualification text right | Same grid pattern |
| Footer `[Name] \| [Phone] \| [Email]` at bottom | New `<div className="paper-footer">` rendered only when `isFunctional` |

**Out of scope for this PR:**
- Extracting a shared `theme-css.ts` (will be the right move when adding a 5th theme — see Open Questions).
- Adding new section types or splitting Profile into Objective + Personal Statement.
- Page-level sidebar layouts (left bar / main bar). This image is single column with intra-section grids only.

---

## Phase 1: Branch + Theme Scaffold

### Task 1.1: Create the working branch

**Files:** none

- [ ] **Step 1: Create and switch to branch from current HEAD**

Run: `git checkout -b feat/functional-theme`

- [ ] **Step 2: Sanity-check status**

Run: `git status`

Expected: `On branch feat/functional-theme`. The pre-existing untracked entries (`docs/README.md`, `docs/architecture.md`, `docs/json-schema.md`, `docs/superpowers/plans/`, `demo/`, `error.md`) are fine — leave them alone.

### Task 1.2: Add `'functional'` to the `activeStyle` literal union

**Files:**
- Modify: `src/lib/resume-data.ts:4`

- [ ] **Step 1: Edit the union**

Change:

```ts
activeStyle: 'classic-blue' | 'crimson-block' | 'minimal-mono'
```

to:

```ts
activeStyle: 'classic-blue' | 'crimson-block' | 'minimal-mono' | 'functional'
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`

Expected: 0 errors. (Node 18 in this environment can't run `next build`; `tsc --noEmit` is the canonical type gate.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/resume-data.ts
git commit -m "chore(types): allow 'functional' in activeStyle"
```

### Task 1.3: Add the Functional option to the toolbar dropdown

**Files:**
- Modify: `src/app/page.tsx` (the `<select>` inside `.style-selector`)

- [ ] **Step 1: Add `<option>`**

In the `<select>` block (currently three `<option>` lines after `value={data.meta.activeStyle}`), append:

```tsx
<option value="functional">Functional</option>
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/app/page.tsx
git commit -m "feat(ui): add Functional to style selector"
```

---

## Phase 2: Data Model

### Task 2.1: Add optional `location` to `ExperienceItem` and `ProjectItem`

**Files:**
- Modify: `src/lib/resume-data.ts` (`ExperienceItem` at line 34, `ProjectItem` at line 43, plus `defaultResumeData`)

- [ ] **Step 1: Extend interfaces**

In `ExperienceItem` (line 34) add after `company`:

```ts
  location?: string
```

In `ProjectItem` (line 43) add after `context`:

```ts
  location?: string
```

(`EducationItem` already has `location: string`; do not change.)

- [ ] **Step 2: Backfill `defaultResumeData`**

For each existing item under `experience` and `projects` in `defaultResumeData`, add a sensible value (e.g. `location: 'Sydney, AU'`) or `location: ''`. Either is fine; the field is optional.

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add src/lib/resume-data.ts
git commit -m "feat(schema): add optional location to ExperienceItem and ProjectItem"
```

### Task 2.2: Add Location input to `ExperienceForm` and `ProjectsForm`

**Files:**
- Modify: `src/components/editor/ExperienceForm.tsx`
- Modify: `src/components/editor/ProjectsForm.tsx`

- [ ] **Step 1: Add input next to Company / Context**

In `ExperienceForm`, place a new `.form-group` (or compose a `.form-row` if visually preferable) with `<label>Location</label>` and an input bound to `exp.location ?? ''`. The onChange must update the item via the existing item-update pattern, e.g.:

```tsx
<div className="form-group">
  <label className="form-label">Location</label>
  <input
    className="form-input"
    type="text"
    value={exp.location ?? ''}
    onChange={(e) => updateItem(exp.id, { location: e.target.value })}
    placeholder="Sydney, AU"
  />
</div>
```

(The exact updater function name lives in the file — read it before editing.)

- [ ] **Step 2: Same change in `ProjectsForm`**

Mirror the input for `proj.location`.

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add src/components/editor/ExperienceForm.tsx src/components/editor/ProjectsForm.tsx
git commit -m "feat(editor): add Location input to Experience and Projects"
```

---

## Phase 3: Renderer — Theme-Conditional Layouts

### Task 3.1: Add `isFunctional` switch in `ResumeRenderer`

**File:** `src/components/preview/ResumeRenderer.tsx`

The strategy: for each section that needs a different layout, branch on `isFunctional`. Non-functional branches must be byte-identical to the current code so existing themes don't regress.

- [ ] **Step 1: Compute the flag once at the top of the component**

After the destructure on line 8:

```ts
const isFunctional = data.meta.activeStyle === 'functional'
```

- [ ] **Step 2: Branch the Contact section**

Replace the current `contact:` entry of `sectionMap` (lines 15–20) with:

```tsx
contact: isEnabled('contact') && (
  isFunctional ? (
    <div className="paper-contact-block--functional">
      <h1 className="paper-name">{contact.fullName || 'Your Name'}</h1>
      <div className="paper-contact--stack">
        {[contact.city, contact.phone, contact.email, contact.linkedIn, contact.github, contact.portfolio]
          .filter(Boolean)
          .map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  ) : (
    <div style={{ textAlign: 'center', marginBottom: '14pt' }}>
      <h1 className="paper-name">{contact.fullName || 'Your Name'}</h1>
      <div className="paper-contact">{contactParts.join(' | ')}</div>
    </div>
  )
),
```

- [ ] **Step 3: Branch the Experience items**

Inside the `experience:` entry's `.map((exp) => ...)`, replace the inner `<div key={exp.id}>` block with a ternary:

```tsx
{experience.map((exp) => (
  isFunctional ? (
    <div key={exp.id} className="paper-item--functional">
      <div className="paper-item-meta">
        <div className="paper-item-org">{exp.company}</div>
        {exp.location && <div className="paper-item-location">{exp.location}</div>}
        <div className="paper-item-date">{exp.startDate} – {exp.endDate}</div>
      </div>
      <div className="paper-item-content">
        <div className="paper-item-role">{exp.title}</div>
        {exp.bullets.length > 0 && (
          <ul className="paper-bullets">
            {exp.bullets.filter(Boolean).map((b, i) => (<li key={i}>{b}</li>))}
          </ul>
        )}
      </div>
    </div>
  ) : (
    <div key={exp.id}>
      <div className="paper-item-header">
        <div>
          <span className="paper-item-title">{exp.title}</span>{' '}
          <span className="paper-item-subtitle">| {exp.company}</span>
        </div>
        <span className="paper-item-date">{exp.startDate} – {exp.endDate}</span>
      </div>
      {exp.bullets.length > 0 && (
        <ul className="paper-bullets">
          {exp.bullets.filter(Boolean).map((b, i) => (<li key={i}>{b}</li>))}
        </ul>
      )}
    </div>
  )
))}
```

- [ ] **Step 4: Branch the Projects items** (same pattern)

`projects.map((proj) => ...)` gets:

```tsx
isFunctional ? (
  <div key={proj.id} className="paper-item--functional">
    <div className="paper-item-meta">
      <div className="paper-item-org">{proj.name}</div>
      {proj.location && <div className="paper-item-location">{proj.location}</div>}
      <div className="paper-item-date">{proj.startDate} – {proj.endDate}</div>
    </div>
    <div className="paper-item-content">
      <div className="paper-item-role">{proj.context}</div>
      {proj.bullets.length > 0 && (
        <ul className="paper-bullets">
          {proj.bullets.filter(Boolean).map((b, i) => (<li key={i}>{b}</li>))}
        </ul>
      )}
    </div>
  </div>
) : (
  /* existing project render verbatim from lines 76-93 */
)
```

(Note `proj.name` is the project "title"; `proj.context` is the organisation. We swap them in the functional layout so meta-left looks like "name / location / date" and content-right shows the context as the "role".)

- [ ] **Step 5: Branch the Education items**

`education.map((edu) => ...)`:

```tsx
isFunctional ? (
  <div key={edu.id} className="paper-item--functional">
    <div className="paper-item-meta">
      <div className="paper-item-org">{edu.institution}</div>
      {edu.location && <div className="paper-item-location">{edu.location}</div>}
      <div className="paper-item-date">{edu.startDate} – {edu.endDate}</div>
    </div>
    <div className="paper-item-content">
      <div className="paper-item-role">{edu.degree}</div>
      {edu.details.length > 0 && (
        <ul className="paper-bullets">
          {edu.details.filter(Boolean).map((d, i) => (<li key={i}>{d}</li>))}
        </ul>
      )}
    </div>
  </div>
) : (
  /* existing education render verbatim from lines 101-122 */
)
```

- [ ] **Step 6: Branch the Certifications items**

```tsx
{certifications.map((cert) => (
  isFunctional ? (
    <div key={cert.id} className="paper-item--functional">
      <div className="paper-item-meta">
        <div className="paper-item-org">{cert.issuer}</div>
        <div className="paper-item-date">{cert.date}</div>
      </div>
      <div className="paper-item-content">
        <div className="paper-item-role">{cert.name}</div>
      </div>
    </div>
  ) : (
    <div key={cert.id} style={{ fontSize: '9.5pt', marginBottom: '2pt' }}>
      <strong>{cert.name}</strong> — {cert.issuer}
      {cert.date ? `, ${cert.date}` : ''}
    </div>
  )
))}
```

- [ ] **Step 7: Append the footer**

Change the outer `return` so that the footer renders below all sections when functional:

```tsx
return (
  <div>
    {sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((section) => (
        <div key={section.id}>{sectionMap[section.id]}</div>
      ))}
    {isFunctional && (contact.fullName || contact.phone || contact.email) && (
      <div className="paper-footer">
        {[contact.fullName, contact.phone, contact.email].filter(Boolean).join(' | ')}
      </div>
    )}
  </div>
)
```

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/preview/ResumeRenderer.tsx
git commit -m "feat(renderer): conditional DOM for functional theme"
```

---

## Phase 4: CSS — Preview + PDF (Two Sources, Same Rules)

### Task 4.1: Append theme rules to `src/app/globals.css`

**File:** `src/app/globals.css`

Locate the "STYLE THEMES" section (lines 216–251). After the existing `.theme-minimal-mono` block (currently ends around line 251), and before the "DEMO DESIGN SYSTEM" comment, insert:

```css
/* Functional — sans-serif, intra-section two-column items, section separators */
.theme-functional {
  font-family: Arial, Helvetica, sans-serif;
}

.theme-functional .paper-name {
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: 24pt;
  font-weight: 700;
  text-align: left;
  margin: 0 0 6pt 0;
  letter-spacing: 0;
  color: var(--paper-text);
}

.theme-functional .paper-contact-block--functional {
  border-bottom: 0.5pt solid #b5b5b5;
  padding-bottom: 8pt;
  margin-bottom: 10pt;
}

.theme-functional .paper-contact--stack {
  text-align: left;
  font-size: 10pt;
  color: var(--paper-text);
  line-height: 1.4;
}

.theme-functional .paper-contact--stack > div {
  display: block;
}

.theme-functional .paper-section {
  border-bottom: 0.5pt solid #b5b5b5;
  padding-bottom: 10pt;
  margin-bottom: 10pt;
}

.theme-functional .paper-section:last-of-type {
  border-bottom: 0;
}

.theme-functional .paper-section-title {
  font-family: Arial, Helvetica, sans-serif !important;
  font-size: 12pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--paper-text);
  border-bottom: 0;
  padding-bottom: 0;
  margin-bottom: 8pt;
}

.theme-functional .paper-item--functional {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 16pt;
  margin-bottom: 10pt;
  page-break-inside: avoid;
}

.theme-functional .paper-item-meta {
  font-size: 9.5pt;
  color: var(--paper-text);
}

.theme-functional .paper-item-org {
  font-weight: 700;
  margin-bottom: 1pt;
}

.theme-functional .paper-item-location,
.theme-functional .paper-item-date {
  color: var(--paper-text);
  font-size: 9.5pt;
}

.theme-functional .paper-item-role {
  font-weight: 700;
  font-size: 10.5pt;
  margin-bottom: 2pt;
}

.theme-functional .paper-item-content .paper-bullets {
  margin-top: 2pt;
}

.theme-functional .paper-footer {
  margin-top: 24pt;
  padding-top: 8pt;
  border-top: 0.5pt solid #b5b5b5;
  text-align: left;
  font-size: 9pt;
  color: var(--paper-text);
}
```

- [ ] **Step 1: Append the block above**

- [ ] **Step 2: Smoke test in the browser**

```bash
npm run dev
```

Navigate manually to `http://localhost:3000`, change Style to Functional, eyeball:
- Sans-serif body
- Left-aligned bold name
- Stacked contact lines
- Section dividers
- Two-column items in Experience/Projects/Education
- Footer line at the bottom

If anything looks wrong, adjust the CSS in this file, then propagate to `pdf-generator.ts` in Task 4.2.

### Task 4.2: Mirror the rules in `src/lib/pdf-generator.ts`

**File:** `src/lib/pdf-generator.ts`

The `themeCSS` template literal (lines 19–25 currently) hosts the PDF-side theme rules. Append the same rules in single-line form (or multi-line, the template literal accepts either — single-line is conventional in this file).

- [ ] **Step 1: Append the rules**

After the existing `.theme-minimal-mono` rules inside the `themeCSS` template literal, append:

```ts
.theme-functional { font-family: Arial, Helvetica, sans-serif; }
.theme-functional .paper-name { font-family: Arial, Helvetica, sans-serif !important; font-size: 24pt; font-weight: 700; text-align: left; margin: 0 0 6pt 0; letter-spacing: 0; color: #1a1a1a; }
.theme-functional .paper-contact-block--functional { border-bottom: 0.5pt solid #b5b5b5; padding-bottom: 8pt; margin-bottom: 10pt; }
.theme-functional .paper-contact--stack { text-align: left; font-size: 10pt; color: #1a1a1a; line-height: 1.4; }
.theme-functional .paper-contact--stack > div { display: block; }
.theme-functional .paper-section { border-bottom: 0.5pt solid #b5b5b5; padding-bottom: 10pt; margin-bottom: 10pt; }
.theme-functional .paper-section:last-of-type { border-bottom: 0; }
.theme-functional .paper-section-title { font-family: Arial, Helvetica, sans-serif !important; font-size: 12pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #1a1a1a; border-bottom: 0; padding-bottom: 0; margin-bottom: 8pt; }
.theme-functional .paper-item--functional { display: grid; grid-template-columns: 180px 1fr; gap: 16pt; margin-bottom: 10pt; page-break-inside: avoid; }
.theme-functional .paper-item-meta { font-size: 9.5pt; color: #1a1a1a; }
.theme-functional .paper-item-org { font-weight: 700; margin-bottom: 1pt; }
.theme-functional .paper-item-location, .theme-functional .paper-item-date { color: #1a1a1a; font-size: 9.5pt; }
.theme-functional .paper-item-role { font-weight: 700; font-size: 10.5pt; margin-bottom: 2pt; }
.theme-functional .paper-item-content .paper-bullets { margin-top: 2pt; }
.theme-functional .paper-footer { margin-top: 24pt; padding-top: 8pt; border-top: 0.5pt solid #b5b5b5; text-align: left; font-size: 9pt; color: #1a1a1a; }
```

(Note: `var(--paper-text)` becomes `#1a1a1a` here because the PDF HTML doesn't include the dark workspace CSS variables. Match the literal value from `:root --paper-text`.)

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add src/app/globals.css src/lib/pdf-generator.ts
git commit -m "feat(theme): Functional theme styles for preview and PDF"
```

---

## Phase 5: Visual Verification (REQUIRED — both screenshots before completion)

Per user instruction, this phase **must** happen before the branch is considered done. Both the on-screen preview **and** the PDF must pass a visual check against the reference image.

### Task 5.1: Prepare reference

**Files:** `/tmp/resume-sample.jpg` (already downloaded earlier)

- [ ] **Step 1: Confirm reference is accessible**

```bash
ls -la /tmp/resume-sample.jpg
```

Expected: file exists, ~95 KB JPEG.

(Do **not** commit this image — it's a third-party CDN download. Keep it in `/tmp/` for the duration of the work.)

### Task 5.2: On-screen preview screenshot

- [ ] **Step 1: Start dev server in background**

Start `npm run dev` in a background task so we can keep using the shell.

- [ ] **Step 2: Wait for "Ready" output**

Watch the background task until Next.js prints "Ready in ..." (usually 3–6 s).

- [ ] **Step 3: Navigate Playwright to the app**

```
browser_navigate → http://localhost:3000
```

- [ ] **Step 4: Switch theme**

Use `browser_snapshot` to find the Style `<select>`. Then `browser_select_option` to pick `functional`.

- [ ] **Step 5: Wait for repaint, then screenshot**

```
browser_wait_for time=1
browser_take_screenshot type=png filename=preview-functional.png fullPage=true
```

- [ ] **Step 6: Read both images and compare**

Read `/tmp/resume-sample.jpg` (reference) and the screenshot file Playwright saved (the path is printed in the tool result). Visual checklist:

  - [ ] Sans-serif throughout (no serif characters visible)
  - [ ] Name on its own line, **left-aligned**, large + bold
  - [ ] Contact info in a vertical stack of single lines
  - [ ] Thin horizontal rule under the contact block
  - [ ] Each section title in uppercase bold, no color, sans-serif
  - [ ] Thin horizontal rule between consecutive sections, none after the last
  - [ ] Work Experience / Projects / Education items render in two columns: meta block ≈ 180 px wide on the left, content right of it
  - [ ] Footer at the bottom: `name | phone | email` separated by ` | `
  - [ ] Visually similar **proportions** to the reference (sizes don't need to match pixel-for-pixel, but section title weight, item indentation, and divider thickness should look like the reference)

If any item fails, **edit CSS in `globals.css`** (preview is faster to iterate than PDF), retake the screenshot, repeat until all boxes are checked. Then propagate the change to `pdf-generator.ts` and continue to Task 5.3.

### Task 5.3: PDF visual verification

- [ ] **Step 1: Build a sample data file for the PDF route**

```bash
mkdir -p tmp
cat > tmp/sample-functional.json <<'EOF'
# paste defaultResumeData (or a known-good test resume) here, with
# "activeStyle": "functional"
EOF
```

The simplest path: in DevTools console on the running app, run `copy(JSON.stringify(JSON.parse(localStorage.getItem('cv-data')), null, 2))`, paste the result into the file, and ensure `meta.activeStyle === 'functional'`.

- [ ] **Step 2: POST to the PDF route**

```bash
curl -s -X POST http://localhost:3000/api/pdf \
  -H 'Content-Type: application/json' \
  -d @tmp/sample-functional.json \
  -o tmp/preview-functional.pdf

ls -la tmp/preview-functional.pdf
```

Expected: a non-empty `.pdf` file (typically 30–100 KB).

- [ ] **Step 3: Rasterize for inspection**

```bash
command -v pdftoppm >/dev/null || sudo apt-get install -y poppler-utils
pdftoppm -r 100 -png tmp/preview-functional.pdf tmp/preview-functional
ls tmp/preview-functional-*.png
```

- [ ] **Step 4: Read each page PNG and run the same visual checklist**

Use the Read tool on `tmp/preview-functional-1.png` (and `-2`, `-3`, … if multi-page). Apply the same checklist as Task 5.2 Step 6.

- [ ] **Step 5: If the PDF diverges from the preview**

The most likely cause is forgotten rules in `pdf-generator.ts`'s `themeCSS`. Diff:

```bash
diff <(grep '\.theme-functional' src/app/globals.css) \
     <(grep '\.theme-functional' src/lib/pdf-generator.ts)
```

Fill in any missing rule, regenerate the PDF (Step 2 again), reread the PNG (Step 4).

- [ ] **Step 6: Stop the dev server**

Kill the background `npm run dev` task.

### Task 5.4: Cleanup

- [ ] **Step 1: Verify `tmp/` is gitignored**

```bash
grep -E '^tmp/?$' .gitignore || echo 'tmp/' >> .gitignore
```

- [ ] **Step 2: Commit gitignore change if needed**

```bash
git diff --stat .gitignore
git add .gitignore && git commit -m "chore: ignore tmp/ for visual-test artefacts"
```

(Skip if no change.)

---

## Phase 6: Final Review & Hand-off

### Task 6.1: Final type-check

- [ ] **Step 1: Type-check the whole tree**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

### Task 6.2: Summarize the diff

- [ ] **Step 1: List commits**

```bash
git log --oneline dev/manual-mvp..feat/functional-theme
```

- [ ] **Step 2: Show file-level diff stat**

```bash
git diff --stat dev/manual-mvp...feat/functional-theme
```

### Task 6.3: Pause for user approval

- [ ] **Step 1: Report back**

Tell the user:
- The list of commits on the branch
- The verification artefacts (`tmp/preview-functional.png`, `tmp/preview-functional-1.png`)
- That **no merge** has been performed
- Ask whether to merge into `dev/manual-mvp` (with `git merge --no-ff`) or open a PR via `gh`

Do not merge or push without explicit approval — this branch is local-only until the user says otherwise.

---

## Open Questions / Flagged Risks

1. **Two CSS sources stay duplicated.** This PR keeps `globals.css` and `pdf-generator.ts`'s `themeCSS` in lockstep manually. Acceptable now; before adding a 5th theme, extract a shared string constant module.
2. **`location` is optional on `ExperienceItem` / `ProjectItem`.** Existing themes ignore it; only Functional renders it. If users want it shown elsewhere too, that's a separate feature.
3. **`.paper-section:last-of-type`.** `ResumeRenderer` currently wraps each section in `<div key={section.id}>{sectionMap[section.id]}</div>`. Because each `.paper-section` is the only `.paper-section` under its `<div>` wrapper, `:last-of-type` always matches and the divider is suppressed on **every** section — including the middle ones. If visual testing shows missing dividers, the fix is to flatten the wrapper (return `sectionMap[section.id]` and use the section.id as the React key on the `.paper-section` itself) or to drive the divider with a JS-computed `.is-last` class. Defer the fix until the screenshot proves it's a problem.
4. **PDF page breaks across the meta/content grid.** `page-break-inside: avoid` on `.paper-item--functional` should keep each item on one page; long bullet lists may still spill. Defer; only fix if visual test shows broken items.
5. **`location` on `ProjectItem` semantics.** Projects don't traditionally have "locations" the way employers do. The plan adds it for symmetry with experience and to make the functional layout meta column consistent. If the user objects, drop the field from projects in Task 2.1 and adapt Task 3.1 Step 4 to omit the location row.

---

## Self-Review Checklist (controller — fill out before dispatching implementer)

- [ ] **Spec coverage:** every visual feature in the reference image is mapped to a task above.
- [ ] **Placeholder scan:** no "TBD", no "add appropriate handling", no "write tests" without test code.
- [ ] **Type consistency:** class names used in Task 3.1 (`paper-item--functional`, `paper-item-meta`, `paper-item-org`, `paper-item-location`, `paper-item-date`, `paper-item-content`, `paper-item-role`, `paper-contact-block--functional`, `paper-contact--stack`, `paper-footer`) match the selectors in Task 4.1 and Task 4.2 verbatim. If a name is changed in one place, sweep all three.
- [ ] **No merge / no push without approval.** Reaffirm in Task 6.3.
