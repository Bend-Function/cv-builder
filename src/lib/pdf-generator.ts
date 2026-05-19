import { ResumeData } from './resume-data'
import { loadPaperCSS, loadThemeCSS } from './theme-css'
import { getBrowser } from './browser-pool'
import { generateLayoutCSS, defaultLayoutConfig } from './layout-config'

async function buildHTML(data: ResumeData): Promise<string> {
  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { ResumeRenderer } = await import('@/components/preview/ResumeRenderer')
  const body = renderToStaticMarkup(React.createElement(ResumeRenderer, { data }))
  const themeClass = `theme-${data.meta.activeStyle}`
  const paperCSS = loadPaperCSS()
  const themeCSS = loadThemeCSS(data.meta.activeStyle)
  const layout = data.meta.layout ?? defaultLayoutConfig
  const layoutCSS = generateLayoutCSS(layout)
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>${paperCSS}${themeCSS}${layoutCSS}</style></head><body>
<div class="paper ${themeClass}" style="padding:0">
  ${body}
</div>
</body></html>`
}

export async function generatePDF(data: ResumeData): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    const html = await buildHTML(data)
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    const layout = data.meta.layout ?? defaultLayoutConfig
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: `${layout.marginTop}mm`,
        right: `${layout.marginRight}mm`,
        bottom: `${layout.marginBottom}mm`,
        left: `${layout.marginLeft}mm`,
      },
    })

    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}
