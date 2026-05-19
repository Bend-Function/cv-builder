import { ResumeData } from './resume-data'
import { loadPaperCSS, loadThemeCSS } from './theme-css'

async function buildHTML(data: ResumeData): Promise<string> {
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { ResumeRenderer } = await import('@/components/preview/ResumeRenderer')
  const body = renderToStaticMarkup(React.createElement(ResumeRenderer, { data }))
  const themeClass = `theme-${data.meta.activeStyle}`
  const paperCSS = loadPaperCSS()
  const themeCSS = loadThemeCSS(data.meta.activeStyle)
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
