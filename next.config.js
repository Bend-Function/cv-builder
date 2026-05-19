/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/api/pdf': [
      './src/styles/**/*.css',
      './node_modules/@sparticuz/chromium/bin/**/*',
    ],
  },
}
module.exports = nextConfig
