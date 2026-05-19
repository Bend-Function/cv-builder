import puppeteer, { Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

// Ensure @sparticuz/chromium knows to extract Amazon Linux 2023 shared libraries
// (libnss3.so etc.) on Vercel's serverless runtime.
if (!process.env.AWS_LAMBDA_JS_RUNTIME) {
  process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs22.x'
}

let cached: Promise<Browser> | null = null

export async function getBrowser(): Promise<Browser> {
  if (cached) {
    const b = await cached
    if (b.connected) return b
    cached = null
  }
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
