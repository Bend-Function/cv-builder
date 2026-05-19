# 部署文档

本文档介绍如何将 CV Builder 部署到不同环境。

## 本地开发

```bash
npm install
npm run dev
```

默认端口 `3000`。开发服务器使用 Turbopack，热更新很快。

PDF 导出需要 `@sparticuz/chromium` 能在环境中找到 Chromium 二进制文件。在大多数 Linux/macOS 开发机器上开箱即用。如果报错，检查：

```bash
# 查看 Chromium 路径
node -e "const c = require('@sparticuz/chromium'); c.executablePath().then(p => console.log(p))"
```

## 生产构建

```bash
npm run build
```

Next.js 以 `output: 'standalone'` 模式构建，生成 `.next/standalone` 目录，包含：
- 精简后的服务端代码
- 必要的依赖
- `server.js` 入口

```bash
# 启动生产服务器
node .next/standalone/server.js
```

### standalone 构建的关键配置

`next.config.js` 中的三项配置对 PDF 功能至关重要：

```js
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@sparticuz/chromium'],
  outputFileTracingIncludes: {
    '/api/pdf': ['./src/styles/**/*.css'],
  },
}
```

- `output: 'standalone'` — 生成独立可部署包
- `serverExternalPackages` — 确保 `@sparticuz/chromium` 不被打包到 bundle 中（它是一个原生依赖，需要在运行时动态加载）
- `outputFileTracingIncludes` — 将 `src/styles/` 下的 CSS 文件包含进 standalone 输出，因为 `pdf-generator.ts` 在运行时从磁盘读取这些文件

## Vercel 部署

最简单的方式是直接推送到 Git 仓库并在 Vercel 上连接项目：

1. 将代码推送到 GitHub/GitLab/Bitbucket
2. 在 Vercel 导入项目
3. 框架预设选择 **Next.js**
4. 部署

### Vercel 注意事项

- `@sparticuz/chromium` 提供**预编译的 Chromium 二进制文件**，在 Vercel 的 Node.js 运行时中可以正常工作
- `output: 'standalone'` 会被 Vercel 自动识别
- **免费 Hobby 套餐**的函数执行时间限制为 10s，PDF 生成通常耗时 2–5s，在限制内
- 如需更大内存或更长超时，升级到 Pro 套餐

## Docker 部署

如需容器化部署，可参考以下 Dockerfile：

```dockerfile
FROM node:22-alpine AS base

# 安装 Chromium 依赖
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
```

> 注意：Alpine Linux 的 Chromium 包体积较小但可能缺少某些字体。如需完整字体支持，考虑使用 `node:22-slim` 基础镜像并手动安装 Chromium。

## 服务器部署（PM2）

在自有服务器上使用 PM2 管理进程：

```bash
# 构建
npm ci
npm run build

# 使用 PM2 启动
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'cv-builder',
    script: './.next/standalone/server.js',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
}
EOF

pm2 start ecosystem.config.js
pm2 save
```

### Nginx 反向代理

```nginx
server {
  listen 80;
  server_name cv.example.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

## 环境变量

本项目**不需要**任何环境变量即可运行。所有配置都是代码内的：

- localStorage key: `'cv-data'`（可在 `src/lib/storage.ts` 中修改）
- 默认主题: `'classic-blue'`（可在 `src/lib/themes.ts` 中修改）
- 默认版式: `defaultLayoutConfig`（可在 `src/lib/layout-config.ts` 中修改）

## 部署检查清单

- [ ] `npm run build` 成功，无 TypeScript 错误
- [ ] `POST /api/pdf` 返回有效的 PDF 文件
- [ ] `localStorage` 读写正常（浏览器端功能）
- [ ] JSON 导入/导出正常
- [ ] 所有主题在预览和 PDF 中渲染正确
- [ ] 设置面板中的版式调整能实时反映在预览中
- [ ] 预设的创建、切换、删除功能正常

## 故障排查

### 部署后 PDF 生成失败（500 错误）

1. 查看服务端日志，确认 Puppeteer 报错信息
2. 检查 standalone 输出是否包含 CSS 文件：
   ```bash
   ls .next/standalone/src/styles/themes/
   ```
3. 确认 `@sparticuz/chromium` 能正确解析可执行文件路径

### 部署后样式丢失

1. 检查 `globals.css` 是否正确导入
2. 确认 `outputFileTracingIncludes` 包含了所有需要的静态资源
3. 查看浏览器开发者工具，确认 CSS 文件被正确加载

### 内存不足

Puppeteer + Chromium 需要较多内存。建议最低 512MB，推荐 1GB+。如果内存不足，PDF 生成可能超时或崩溃。
