# CV Builder 简历生成器

一个纯前端的简历/ CV 生成器。在左侧编辑信息，右侧实时预览 A4 页面效果，支持导出 PDF 和 JSON。

## 文档导航

- **[使用指南](./docs/usage.md)** — 如何编辑简历、切换主题、调整版式、导出 PDF
- **[架构说明](./docs/architecture.md)** — 系统架构、数据流、渲染机制
- **[设计文档](./docs/design.md)** — 设计决策、主题系统、扩展点
- **[开发指南](./docs/development.md)** — 如何修改代码、添加新主题、添加新章节
- **[部署文档](./docs/deployment.md)** — 本地开发、构建、Vercel/服务器部署
- **[JSON 格式参考](./docs/json-schema.md)** — 数据结构的完整说明（英文）

## 项目特点

- **无需后端存储数据**。简历数据保存在浏览器 `localStorage` 中，通过 JSON 导入/导出实现跨设备迁移。
- **所见即所得**。屏幕预览和导出 PDF 共用同一套 React 渲染组件，预览效果与最终 PDF 完全一致。
- **PDF 服务端生成**。Next.js 路由 `/api/pdf` 调用无头 Chromium（`puppeteer-core` + `@sparticuz/chromium`）将 HTML 打印为 PDF。
- **四种主题风格**。Classic Blue、Crimson Block、Minimal Mono、Functional。通过设置面板切换，自动持久化。
- **可自定义版式**。页边距、章节间距、正文字体/标题字体、字号均可在设置面板中实时调整。
- **预设管理**。可将"主题 + 版式"保存为预设，支持创建多套预设并在它们之间快速切换。
- **章节可拖拽排序**。支持拖拽调整章节顺序，每个章节可独立开关。关闭的章节在预览和 PDF 中自动隐藏。

## 技术栈

- Next.js 16（App Router、Turbopack）
- React 19（编辑器为客户端组件；PDF 使用服务端静态渲染）
- Tailwind CSS v4 + 手写设计系统（`src/app/globals.css`）
- `@dnd-kit/core` / `@dnd-kit/sortable` — 章节拖拽排序
- `puppeteer-core` + `@sparticuz/chromium` — PDF 生成

## 目录结构

```
src/
  app/
    page.tsx              # 编辑器 + 预览外壳
    globals.css           # 设计系统、主题、布局样式
    api/pdf/route.ts      # POST /api/pdf → 返回 application/pdf
  components/
    editor/               # 各章节的表单组件
      SettingsPanel.tsx   # 设置面板（主题、版式、预设）
    preview/
      ResumeRenderer.tsx  # 纯渲染：ResumeData → JSX（预览和 PDF 共用）
      ResumePreview.tsx   # 屏幕上的 A4 预览（缩放 + 滚动）
      layouts/            # StandardLayout / FunctionalLayout
      sections/           # 各章节渲染组件
  lib/
    resume-data.ts        # TypeScript 类型定义 + 默认数据
    layout-config.ts      # 版式配置（边距、间距、字体、字号）
    validate.ts           # 数据校验 / 导入 / 导出
    storage.ts            # localStorage 读写 + 防抖保存 + 预设管理
    pdf-generator.ts      # 构建 HTML，驱动 Puppeteer
    themes.ts             # 主题注册表
  styles/
    paper.css             # 纸张基础样式
    themes/               # 各主题 CSS 文件
```
