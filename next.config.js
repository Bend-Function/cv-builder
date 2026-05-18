/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@sparticuz/chromium'],
}
module.exports = nextConfig
