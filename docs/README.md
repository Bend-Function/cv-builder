# CV Builder Documentation

A client-side CV/resume generator built with Next.js. Enter your information on the left, see a live A4 preview on the right, and export to PDF or JSON.

## Documents

- **[json-schema.md](./json-schema.md)** — Complete JSON data format reference (the most important document if you want to author resumes by hand or integrate with the importer).
- **[architecture.md](./architecture.md)** — How the pieces fit together: storage, preview, PDF generation, theming.

## At a Glance

- **No backend for data.** Your resume lives in `localStorage` under the key `cv-data`. Import/export as JSON to move between devices.
- **One render path.** The on-screen preview and the exported PDF share the same React component (`ResumeRenderer`), so what you see is what you get.
- **PDF on the server.** A Next.js route handler at `POST /api/pdf` runs headless Chromium (`puppeteer-core` + `@sparticuz/chromium`) and prints the rendered HTML.
- **Three themes.** `classic-blue`, `crimson-block`, `minimal-mono`. Picked via the `Style` dropdown; persisted in `meta.activeStyle`.
- **Reorderable sections.** Drag to reorder, toggle on/off. Disabled sections are skipped in the preview and the PDF.

## Tech Stack

- Next.js 16 (App Router, Turbopack)
- React 19 (client component for the editor; static markup for PDF)
- Tailwind CSS v4 + a small hand-authored design system in `src/app/globals.css`
- `@dnd-kit/core` and `@dnd-kit/sortable` for the section reorder UX
- `puppeteer-core` + `@sparticuz/chromium` for the PDF route

## Running Locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

PDF export requires that `@sparticuz/chromium` can resolve a Chromium binary in your environment. On most Linux/macOS dev machines this works out of the box.

## Project Layout

```
src/
  app/
    page.tsx              # Editor + preview shell
    globals.css           # Design system, themes, layout
    api/pdf/route.ts      # POST /api/pdf → application/pdf
  components/
    editor/               # Per-section form components
    preview/
      ResumeRenderer.tsx  # Pure render: ResumeData → JSX (shared by preview + PDF)
      ResumePreview.tsx   # Adds scaling/scrolling for the on-screen A4 preview
  lib/
    resume-data.ts        # All TypeScript types + defaultResumeData
    validate.ts           # isValidResumeData / import / export
    storage.ts            # localStorage load/save + debounced saver
    pdf-generator.ts      # Builds HTML, drives Puppeteer
```

## Data Lifecycle

1. **Load.** On mount, `page.tsx` calls `loadResumeData()`. If `localStorage['cv-data']` exists and parses, it is merged with `defaultSections` (so newly-added section types appear for old saves) and a legacy `summary` field is migrated into `profile`. Otherwise `defaultResumeData` is used.
2. **Edit.** Every form change calls `update()`, which sets state and schedules a debounced save (1 s) via `createDebouncedSaver`. `meta.lastModified` is refreshed on every change.
3. **Persist.** The debounced saver writes the JSON string to `localStorage['cv-data']`.
4. **Export.** `Export JSON` serialises the current state with `JSON.stringify(data, null, 2)` and downloads it as `resume-YYYY-MM-DD.json`.
5. **Import.** `Import JSON` reads a file, passes the text through `importResumeJSON` → `isValidResumeData`, and replaces state on success.
6. **PDF.** `Preview` / `Download PDF` POSTs the current `ResumeData` to `/api/pdf`, which renders `<ResumeRenderer/>` with `renderToStaticMarkup`, wraps it in a paper template with theme CSS, and returns a PDF.

## Authoring Resumes By Hand

If you want to skip the UI and write the JSON directly:

1. Start from the example in [json-schema.md](./json-schema.md#complete-example).
2. Make sure `meta.version` is a number and `meta.activeStyle` is one of the three valid values.
3. Keep `sections[].id` matching the renderable section ids (`contact`, `profile`, `skills`, `experience`, `projects`, `education`, `certifications`, `referees`).
4. Load it via `Import JSON` in the toolbar. If validation fails the importer alerts and discards the file.
