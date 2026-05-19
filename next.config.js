/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@sparticuz/chromium-min', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/api/pdf': ['./src/styles/**/*.css'],
  },
}
module.exports = nextConfig
