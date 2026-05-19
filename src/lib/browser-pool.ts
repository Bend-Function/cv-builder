import puppeteer, { Browser } from 'puppeteer-core'
import type Chromium from '@sparticuz/chromium'

type ChromiumModule = typeof Chromium

let chromiumModule: Promise<ChromiumModule> | null = null

async function getChromium(): Promise<ChromiumModule> {
  // @sparticuz/chromium configures LD_LIBRARY_PATH at import time. Vercel Node
  // 20/22 needs the AL2023 shared libraries for libnss3.so, etc.
  process.env.AWS_LAMBDA_JS_RUNTIME ??= 'nodejs22.x'
  chromiumModule ??= import('@sparticuz/chromium').then(
    (mod) => (mod as unknown as { default: ChromiumModule }).default,
  )
  return chromiumModule
}

let cached: Promise<Browser> | null = null

export async function getBrowser(): Promise<Browser> {
  if (cached) {
    const b = await cached
    if (b.connected) return b
    cached = null
  }
  const chromium = await getChromium()
  cached = puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless as 'shell',
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
