# Architecture

A short tour of how the CV Builder is wired together. For the data shape, see [json-schema.md](./json-schema.md).

## Two Render Paths, One Component

The single most important design decision: **the on-screen preview and the exported PDF render from the same React component**, `ResumeRenderer`. The two paths diverge only at the edges.

```
ResumeData ──┬──► ResumePreview ──► <ResumeRenderer/> ──► browser DOM (scaled, scrollable)
             │                           ↑
             │                    shared src/styles/*.css
             │                           ↓
             └──► /api/pdf ──► renderToStaticMarkup(<ResumeRenderer/>)
                          └──► HTML + paper.css + theme.css ──► Puppeteer ──► PDF
```

`ResumeRenderer` is a thin dispatcher (~10 lines) that routes to `StandardLayout` or `FunctionalLayout` based on `data.meta.activeStyle`. Both layouts consume the same section components from `src/components/preview/sections/`. It has no client-side state, no effects, no styling beyond class names — that's what makes it safe to reuse on the server.

## The Editor (`src/app/page.tsx`)

`page.tsx` is the only client component with substantial state. Its responsibilities:

1. **Load on mount.** `useEffect(() => setData(loadResumeData()), [])`. A `loaded` flag prevents flicker between the default and the persisted state.
2. **Edit + persist.** `update`, `handleReorder`, `handleToggle`, and `handleThemeChange` all follow the same pattern: build the next state immutably, refresh `meta.lastModified`, and call `debouncedSave`.
3. **Layout.** Three columns: toolbar (top), editor panel (left, resizable 280px–50vw), preview (right, fills remainder). The resizer is a 4px wide div with `onMouseDown` that flips an `isDragging` ref and adjusts the panel's inline `width` on `mousemove`.
4. **Section accordion.** A local `expandedSections: Set<string>` controls which section cards are open. The header is a `<button type="button">` with `aria-expanded` and `aria-controls`. The toggle switch is a sibling `<button role="switch" aria-checked>` — never nested inside the header, which eliminates the hydration mismatch that nested buttons used to cause.
5. **PDF actions.** `handleExportPDF` and `handlePreviewPDF` both `POST` to `/api/pdf`; the only difference is that one calls `a.click()` to download and the other calls `window.open(url, '_blank')`.

## Section Forms (`src/components/editor/*`)

Each section has its own form component (`ContactForm`, `ProfileForm`, …) that receives the slice of `ResumeData` it cares about and an `onChange` callback. They share the design-system classes (`.form-group`, `.btn`, `.item-card`, `.bullet-row`, `.add-btn`) defined in `globals.css`, so the visual rhythm stays consistent without per-form styling.

`SortableSectionList` wraps the section cards in `@dnd-kit`'s `SortableContext`. **All sections — enabled and disabled — participate in the sortable context**, so disabled rows can still be dragged into a new position.

## Preview (`src/components/preview/ResumePreview.tsx`)

The preview has to do three things simultaneously: render at A4 dimensions (210×297mm), fit the available horizontal space, and remain scrollable when content exceeds one page.

The trick is the three-layer DOM:

```
.preview-area      ← overflow:auto, holds the scrollbar
  .paper-viewport  ← width/height set to scaled paper size (reserves layout space)
    .paper-wrapper ← absolutely positioned, transform: scale(s) top-left
      .paper       ← real 210mm × natural-height A4
```

`scalePaper` (in `useEffect`) computes the scale from `area.clientWidth / paper.offsetWidth`, clamped to `[0.55, 1]`. The viewport's pixel dimensions are set to the **scaled** paper size, which is what gives the parent scroll container the right scrollable height even though `.paper-wrapper` itself is transformed (transforms don't affect layout). A `ResizeObserver` re-runs the calculation when the editor panel is dragged.

## PDF Generation (`src/lib/pdf-generator.ts` + `src/app/api/pdf/route.ts`)

`POST /api/pdf` receives a `ResumeData` body and:

1. Renders `<ResumeRenderer data={data}/>` with `renderToStaticMarkup` from `react-dom/server`. Dynamic import is used so client bundles don't pull in the SSR renderer.
2. Loads CSS from disk via `src/lib/theme-css.ts`:
   - `loadPaperCSS()` reads `src/styles/paper.css`.
   - `loadThemeCSS(theme)` reads `src/styles/themes/${theme}.css`.
3. Inlines both into a single `<style>` block in the HTML template.
4. Reuses a pooled Puppeteer browser (`src/lib/browser-pool.ts`) across requests. A fresh `page` is created per request and closed in `finally`; the browser stays warm.
5. Prints with:
   ```ts
   page.pdf({
     format: 'A4',
     printBackground: true,
     margin: { top: '15mm', right: '20mm', bottom: '15mm', left: '20mm' },
   })
   ```
6. Returns the PDF as `application/pdf`.

### Why margins live on Puppeteer, not CSS

An earlier iteration put `padding: 15mm 20mm` on `.paper`. That worked for the first page but the **second page started flush against the top edge** because the padding only applied once to the single tall element. Moving margins into `page.pdf({ margin })` gives Puppeteer per-page margins for free.

### Themes in the PDF

The theme is selected by class: `<div class="paper theme-${activeStyle}">…</div>`. Both preview and PDF consume the **same** CSS files from `src/styles/`. `next.config.js` includes `outputFileTracingIncludes` for `/api/pdf` so the standalone build ships the CSS files alongside the route handler.

## Storage (`src/lib/storage.ts`)

- `STORAGE_KEY = 'cv-data'`
- `loadResumeData()` is defensive: it tolerates missing fields, merges in any default sections the saved JSON doesn't have, and migrates a legacy top-level `summary` string into the new `profile` object.
- `saveResumeData()` always refreshes `meta.lastModified` before writing.
- `createDebouncedSaver(delay)` returns a function that coalesces rapid edits into a single write.

## Validation (`src/lib/validate.ts`)

Three exports:

- `isValidResumeData(obj)` — type guard. Checks `meta` (with numeric `version`), `contact`, `sections`, `skills`, `experience`. Anything else is optional at the validation layer.
- `exportResumeJSON(data)` — `JSON.stringify(data, null, 2)`.
- `importResumeJSON(json)` — parse, validate, return `ResumeData | null`.

The minimum bar is intentionally low so older exports still import. The renderer treats missing fields as empty.

## Theme Registry (`src/lib/themes.ts`)

Themes are the single source of truth for every subsystem:

```ts
export const THEMES = [
  { id: 'classic-blue', label: 'Classic Blue' },
  { id: 'crimson-block', label: 'Crimson Block' },
  { id: 'minimal-mono', label: 'Minimal Mono' },
  { id: 'functional', label: 'Functional' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export const DEFAULT_THEME: ThemeId = 'classic-blue'
export function isThemeId(value: unknown): value is ThemeId { ... }
```

The registry drives:
- **Type system** — `ResumeMeta.activeStyle: ThemeId` instead of a raw string union.
- **Validation** — `isValidResumeData` rejects unknown theme ids via `isThemeId()`.
- **UI** — `page.tsx` maps `THEMES` to `<option>` elements; no hardcoded lists.
- **PDF** — `loadThemeCSS(theme)` resolves the CSS file by `id`.

To add a new theme, register it in `themes.ts` and create `src/styles/themes/{id}.css`. No other files need manual updates.

## Browser Pool (`src/lib/browser-pool.ts`)

PDF requests reuse a single Puppeteer `Browser` instance across calls:

- `getBrowser()` returns the cached browser, reconnecting if it died.
- Each request calls `browser.newPage()` and closes the page in `finally`.
- `SIGTERM` handler gracefully closes the browser on shutdown.

On warm requests the browser is already alive, so PDF generation drops from ~370ms to ~220ms (the overhead of a fresh Chromium launch is eliminated).

## Conventions Worth Knowing

- **List items have stable string `id`s** (`experience`, `projects`, `education`, `certifications`). The editor uses these as React keys and as the targets for in-place updates. Anything you generate by hand must be unique within its list.
- **Dates are free-form strings**, not `Date` objects. The UI doesn't impose a format; the renderer prints what's there.
- **`meta.lastModified` is always ISO 8601.** It's refreshed by every editor mutation and again by `saveResumeData`.
- **Extension points for new themes:** add an entry to `src/lib/themes.ts` and a CSS file to `src/styles/themes/`. The renderer, PDF generator, and UI selector all pick it up automatically.
- **Extension points for new sections:** add a section component in `src/components/preview/sections/` with `Standard` and `Functional` exports, wire it into both layouts, and add its form in `src/components/editor/`.
