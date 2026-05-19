import puppeteer, { Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

let cached: Promise<Browser> | null = null

export async function getBrowser(): Promise<Browser> {
  if (cached) {
    const b = await cached
    if (b.connected) return b
    cached = null
  }
  cached = puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  })
  return cached
}

export async function closeBrowser(): Promise<void> {
  if (cached) {
    const b = await cached.catch(() => null)
    if (b && b.connected) {
      await b.close()
    }
    cached = null
  }
}

process.on('SIGTERM', async () => {
  await closeBrowser()
})
