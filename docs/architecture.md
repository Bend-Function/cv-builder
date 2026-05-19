# 架构说明

本文档介绍 CV Builder 的系统架构和模块之间的协作方式。如需了解数据格式，请参考 [json-schema.md](./json-schema.md)。

## 核心设计：两条渲染路径，一个组件

最重要的设计决策：**屏幕预览和导出的 PDF 使用同一个 React 组件渲染**。两条路径仅在边缘处分叉。

```
ResumeData ──┬──► ResumePreview ──► <ResumeRenderer/> ──► 浏览器 DOM（缩放、可滚动）
             │                           ↑
             │                    共享 src/styles/*.css
             │                           ↓
             └──► /api/pdf ──► renderToStaticMarkup(<ResumeRenderer/>)
                          └──► HTML + paper.css + theme.css + layout.css ──► Puppeteer ──► PDF
```

`ResumeRenderer` 是一个简单的分发器（约 10 行代码），根据 `data.meta.activeStyle` 路由到 `StandardLayout` 或 `FunctionalLayout`。两种布局消费同样的章节组件（`src/components/preview/sections/`）。它不带客户端状态、不带 effect、不带样式（只有 className）—— 这让它可以安全地在服务端复用。

## 编辑器（`src/app/page.tsx`）

`page.tsx` 是唯一的重量级客户端组件，职责如下：

1. **加载数据**。`useEffect(() => setData(loadResumeData()), [])`。`loaded` 标志防止默认数据与持久化数据之间的闪烁。
2. **编辑 + 持久化**。`update`、`handleReorder`、`handleToggle` 都遵循同一模式：不可变地构建新状态、刷新 `meta.lastModified`、调用防抖保存。
3. **布局**。三列结构：顶部工具栏、左侧编辑器面板（可拖拽调整 280px–50vw）、右侧预览（填充剩余空间）。拖拽调整器是一个 6px 宽的 div，监听 `onMouseDown` 后在 `mousemove` 中实时修改面板的 `width`。
4. **章节折叠**。本地状态 `expandedSections: Set<string>` 控制哪些章节卡片展开。标题是 `<button type="button">`，带 `aria-expanded` 和 `aria-controls`；开关是相邻的 `<button role="switch" aria-checked>` —— 从不嵌套在标题内部，这消除了嵌套按钮曾导致的 hydration 不匹配问题。
5. **PDF 操作**。`handleExportPDF` 和 `handlePreviewPDF` 都向 `/api/pdf` 发送 POST；区别在于一个触发下载，一个在新标签页打开。
6. **设置面板**。齿轮按钮打开模态框，内含 Presets（预设）、Theme（主题）、Layout（版式）三个标签页。修改会立即反映到预览中。

## 章节表单（`src/components/editor/*`）

每个章节有独立的表单组件（`ContactForm`、`ProfileForm` 等），接收自己关心的 `ResumeData` 切片和 `onChange` 回调。它们共享设计系统的 class（`.form-group`、`.btn`、`.item-card`、`.bullet-row`、`.add-btn`），保证视觉一致性而不需要每个表单单独写样式。

`SortableSectionList` 用 `@dnd-kit` 的 `SortableContext` 包裹章节卡片。**所有章节 —— 无论开启还是关闭 —— 都参与排序上下文**，因此关闭的行仍然可以被拖拽到新位置。

## 预览（`src/components/preview/ResumePreview.tsx`）

预览需要同时满足三个需求：按 A4 尺寸渲染（210×297mm）、适应可用水平空间、内容超出一页时保持可滚动。

实现诀窍是三层 DOM：

```
.preview-area      ← overflow:auto，持有滚动条
  .paper-viewport  ← width/height 设为缩放后的纸张尺寸（预留布局空间）
    .paper-wrapper ← absolute 定位，transform: scale(s) 左上对齐
      .paper       ← 真实 210mm × 自然高度的 A4
```

`scalePaper`（在 `useEffect` 中）根据 `area.clientWidth / paper.offsetWidth` 计算缩放比例，限制在 `[0.55, 1]`。视口的像素尺寸设为**缩放后**的纸张尺寸，这让父滚动容器拥有正确的可滚动高度，即使 `.paper-wrapper` 本身被 transform（transform 不影响布局）。`ResizeObserver` 在编辑器面板被拖拽时重新计算。

## PDF 生成（`src/lib/pdf-generator.ts` + `src/app/api/pdf/route.ts`）

`POST /api/pdf` 接收 `ResumeData`，然后：

1. 用 `react-dom/server` 的 `renderToStaticMarkup` 渲染 `<ResumeRenderer data={data}/>`。使用动态导入，避免客户端打包时引入 SSR 渲染器。
2. 通过 `src/lib/theme-css.ts` 从磁盘加载 CSS：
   - `loadPaperCSS()` 读取 `src/styles/paper.css`
   - `loadThemeCSS(theme)` 读取 `src/styles/themes/${theme}.css`
3. 将 CSS 和版式变量内联到 HTML 模板的单个 `<style>` 块中。
4. 复用池化的 Puppeteer 浏览器（`src/lib/browser-pool.ts`）。每个请求创建新 `page` 并在 `finally` 中关闭；浏览器实例保持温热。
5. 打印参数：
   ```ts
   page.pdf({
     format: 'A4',
     printBackground: true,
     margin: {
       top: `${layout.marginTop}mm`,
       right: `${layout.marginRight}mm`,
       bottom: `${layout.marginBottom}mm`,
     left: `${layout.marginLeft}mm`,
     },
   })
   ```
6. 返回 PDF，MIME 类型为 `application/pdf`。

### 为什么页边距交给 Puppeteer 而不是 CSS

早期版本在 `.paper` 上写了 `padding: 15mm 20mm`。这第一页没问题，但**第二页顶部会贴边**，因为 padding 只应用了一次到那个单一的长元素上。把边距移到 `page.pdf({ margin })` 后，Puppeteer 自动为每一页施加正确的边距。

### 预览与 PDF 的边距分离

- **预览**：`.paper` div 通过 inline style 的 `padding` 实现视觉边距（单页可滚动元素）。
- **PDF**：`.paper` div 的 `padding` 设为 `0`，由 Puppeteer 的 `margin` 参数提供真实的逐页边距。

### 版式变量系统

`LayoutConfig` 定义了 10 个可调参数（4 个边距、2 个间距、2 个字体、3 个字号）。`layoutToCSSVariables()` 将其转换为 CSS 自定义属性：

```css
.paper {
  --paper-margin-top: 18mm;
  --paper-margin-left: 22mm;
  --section-gap: 12pt;
  --body-font: 'Times New Roman', serif;
  --body-font-size: 10.5pt;
  /* ... */
}
```

预览通过 `.paper` div 的 inline style 注入这些变量；PDF 通过内联 `<style>` 注入。主题 CSS 通过覆盖同名变量实现字体和字号的主题级定制。

## 存储（`src/lib/storage.ts`）

- `STORAGE_KEY = 'cv-data'`
- `loadResumeData()` 具有防御性：容忍缺失字段、合并默认章节、将旧版 `summary` 字符串迁移到新的 `profile` 对象、为缺失的 `layout` 补全默认版式。
- `saveResumeData()` 在写入前总是刷新 `meta.lastModified`。
- `createDebouncedSaver(delay)` 将频繁编辑合并为单次写入。

### 预设存储

- `STORAGE_KEY_PRESETS = 'cv-presets'` — `Preset[]`
- `STORAGE_KEY_ACTIVE_PRESET = 'cv-active-preset-id'` — 字符串 id
- 首次加载时若预设为空，自动生成 4 个默认预设（每个主题一个，使用默认版式）。

## 校验（`src/lib/validate.ts`）

三个导出：

- `isValidResumeData(obj)` — 类型守卫。检查 `meta`（含数字 `version`）、`contact`、`sections`、`skills`、`experience`。
- `exportResumeJSON(data)` — `JSON.stringify(data, null, 2)`。
- `importResumeJSON(json)` — 解析、校验、返回 `ResumeData | null`。

校验门槛故意设得低，以便旧导出仍能导入。渲染器将缺失字段视为空。

## 主题注册表（`src/lib/themes.ts`）

```ts
export const THEMES = [
  { id: 'classic-blue', label: 'Classic Blue' },
  { id: 'crimson-block', label: 'Crimson Block' },
  { id: 'minimal-mono', label: 'Minimal Mono' },
  { id: 'functional', label: 'Functional' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']
export const DEFAULT_THEME: ThemeId = 'classic-blue'
export function isThemeId(value: unknown): value is ThemeId { ... }
```

注册表驱动：
- **类型系统** — `ResumeMeta.activeStyle: ThemeId`
- **校验** — `isValidResumeData` 通过 `isThemeId()` 拒绝未知主题
- **UI** — `page.tsx` 将 `THEMES` 映射到选项；无硬编码列表
- **PDF** — `loadThemeCSS(theme)` 按 `id` 解析 CSS 文件

## 浏览器池（`src/lib/browser-pool.ts`）

PDF 请求复用同一个 Puppeteer `Browser` 实例：

- `getBrowser()` 返回缓存的浏览器，若已断开则自动重连。
- 每个请求调用 `browser.newPage()` 并在 `finally` 中关闭页面。
- `SIGTERM` 处理器在关闭时优雅地关闭浏览器。

温热请求下浏览器已就绪，PDF 生成时间从约 370ms 降至约 220ms（消除了重新启动 Chromium 的开销）。

## 值得了解的约定

- **列表项使用稳定的字符串 `id`**（`experience`、`projects`、`education`、`certifications`）。编辑器用它们作为 React key 和就地更新的目标。手写数据时必须保证列表内唯一。
- **日期是自由格式字符串**，不是 `Date` 对象。UI 不强加格式；渲染器原样打印。
- **`meta.lastModified` 总是 ISO 8601。** 每次编辑器变更都会刷新，再由 `saveResumeData` 在写入前再次刷新。
