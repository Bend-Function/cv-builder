import { ResumeData } from './resume-data'

const paperCSS = `
body { margin: 0; font-family: 'Times New Roman', serif; font-size: 10.5pt; line-height: 1.45; color: #1a1a1a; background: #fff; }
.paper { width: 210mm; min-height: 297mm; background: #fff; box-sizing: border-box; }
.paper-name { font-family: 'Times New Roman', serif; font-size: 22pt; font-weight: 600; margin-bottom: 4pt; letter-spacing: -0.3pt; text-align: center; }
.paper-contact { font-size: 9.5pt; color: #555; margin-bottom: 14pt; text-align: center; }
.paper-section { margin-bottom: 12pt; page-break-inside: avoid; }
.paper-section-title { font-family: 'Times New Roman', serif; font-size: 11pt; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6pt; }
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
.theme-minimal-mono .paper { font-family: 'Times New Roman', serif; }
.theme-minimal-mono .paper-name { font-family: 'Times New Roman', serif !important; font-weight: 700 !important; }
.theme-minimal-mono .paper-section-title { font-family: 'Times New Roman', serif !important; font-size: 10.5pt; font-weight: 700; text-transform: none; letter-spacing: 0.5px; border-bottom: 0.5pt solid #1a1a1a; padding-bottom: 2pt; }
`

async function buildHTML(data: ResumeData): Promise<string> {
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { ResumeRenderer } = await import('@/components/preview/ResumeRenderer')
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
  const executablePath = await import('@sparticuz/chromium').then((m) => m.default.executablePath())

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  const html = await buildHTML(data)
  await page.setContent(html, { waitUntil: 'domcontentloaded' })

  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '15mm', right: '20mm', bottom: '15mm', left: '20mm' },
  })

  await browser.close()
  return Buffer.from(pdf)
}
