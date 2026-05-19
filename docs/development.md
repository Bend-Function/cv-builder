# 开发指南

本文档面向想要修改代码、添加功能或修复 bug 的开发者。

## 环境准备

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（Turbopack）
npm run dev
# 打开 http://localhost:3000
```

PDF 导出需要 `@sparticuz/chromium` 能在环境中解析到 Chromium 二进制文件。大多数 Linux/macOS 开发机器开箱即用。如果失败，检查 Chromium 是否正确安装。

### 重要：Node.js 版本

项目使用 Next.js 16，需要 Node.js 20+。系统默认的 Node 18 不兼容，请使用 Node 22 或更高版本。

## 代码结构速览

```
src/
  app/
    page.tsx              # 编辑器外壳：状态管理、布局、工具栏
    globals.css           # 编辑器 UI 的设计系统 + 预览/纸张样式
    api/pdf/route.ts      # API 路由：接收 ResumeData → 返回 PDF
  components/
    editor/               # 表单组件（纯展示 + onChange）
      SettingsPanel.tsx   # 设置面板：主题、版式、预设
    preview/
      ResumeRenderer.tsx  # 渲染分发器
      ResumePreview.tsx   # 预览容器：缩放、滚动
      layouts/
        StandardLayout.tsx    # 标准垂直布局
        FunctionalLayout.tsx  # 功能主义两栏布局
      sections/
        ContactSection.tsx    # 联系信息（两种布局版本）
        ExperienceSection.tsx # 工作经历
        ...
  lib/
    resume-data.ts        # 所有类型 + 默认数据
    layout-config.ts      # 版式配置类型 + 默认值 + 预设工厂
    themes.ts             # 主题注册表
    storage.ts            # localStorage 读写 + 预设管理
    validate.ts           # 数据校验 + JSON 导入导出
    pdf-generator.ts      # PDF 生成：HTML 构建 + Puppeteer
    theme-css.ts          # 从磁盘加载 CSS 文件的辅助函数
    browser-pool.ts       # Puppeteer 浏览器实例池
```

## 常见修改场景

### 修改章节表单

以 `ExperienceForm` 为例：

1. 打开 `src/components/editor/ExperienceForm.tsx`
2. 它是一个纯展示组件，接收 `experience: ExperienceItem[]` 和 `onChange`
3. 添加/删除/修改字段后，调用 `onChange` 传入新数组
4. 不需要处理保存逻辑 —— `page.tsx` 中的 `debouncedSave` 会自动处理

### 修改章节渲染

以 `ExperienceSection` 为例：

1. 打开 `src/components/preview/sections/ExperienceSection.tsx`
2. 组件导出 `Standard` 和 `Functional` 两个版本
3. 修改后，预览和 PDF 会**同时**看到变化（因为它们共用同一组件）

### 修改主题样式

以 `classic-blue` 为例：

1. 打开 `src/styles/themes/classic-blue.css`
2. 所有规则以 `.theme-classic-blue` 开头
3. 只覆盖变量或添加选择器，不要写 `!important`
4. 保存后，预览立即更新；PDF 也自动生效

### 修改纸张基础样式

1. 打开 `src/styles/paper.css`
2. 这里定义 `.paper` 的基础变量和所有元素的默认样式
3. 主题 CSS 通过覆盖同名变量来实现定制

### 添加新的版式参数

假设要添加 `"页眉行高"` 参数：

1. `src/lib/layout-config.ts`：
   ```ts
   export interface LayoutConfig {
     // ... 现有字段
     lineHeight: number  // 新增
   }
   export const defaultLayoutConfig: LayoutConfig = {
     // ... 现有值
     lineHeight: 1.45,
   }
   ```
2. `layoutToCSSVariables()` 中映射：
   ```ts
   '--line-height': String(layout.lineHeight),
   ```
3. `src/styles/paper.css` 中使用：
   ```css
   .paper {
     line-height: var(--line-height);
   }
   ```
4. `SettingsPanel.tsx` 中添加表单控件

## 数据流

```
用户输入
  ↓
Editor Form (onChange)
  ↓
page.tsx update() — 构建新 state，刷新 meta.lastModified
  ↓
setData() — React 重新渲染预览
  ↓
debouncedSave() — 1s 后写入 localStorage
```

PDF 导出不走 localStorage，而是直接将当前内存中的 `data` POST 到 `/api/pdf`。

## 调试技巧

### 预览不更新

检查 `ResumeRenderer.tsx` 是否正确地传入了 `data`。如果只有某个章节不更新，检查该章节的 `Standard`/`Functional` 组件是否正确读取了 props。

### PDF 样式与预览不一致

常见原因：
1. 主题 CSS 文件未被加载 —— 检查 `theme-css.ts` 中的文件路径
2. CSS 变量在 PDF 中未生效 —— 检查 `pdf-generator.ts` 是否正确注入了 `layoutCSS`
3. Puppeteer 的 `printBackground: true` 未启用 —— 检查 `pdf-generator.ts`

### PDF 生成失败

1. 查看服务端控制台错误（Puppeteer 的报错会打印到 Next.js 服务端日志）
2. 检查 `isValidResumeData` 是否拒绝了你的测试数据
3. 检查浏览器池是否正常运行：`browser-pool.ts` 中的 `getBrowser()`

### Hydration mismatch

常见原因：
1. **嵌套按钮** —— 确保 `<button>` 从不嵌套在另一个 `<button>` 内部
2. **随机值** —— 不要在服务端和客户端生成不同的随机数（如 `Math.random()` 在 SSR 和水合之间会不一致）
3. **日期** —— `new Date().toISOString()` 在服务端和客户端可能相差几毫秒。所有时间戳由 `saveResumeData` 在写入时生成，而不是渲染时。

## TypeScript 检查

```bash
npx tsc --noEmit
```

项目使用严格模式。添加新类型时，建议在 `src/lib/resume-data.ts` 中定义，然后在表单组件和渲染组件中消费。

## 测试 PDF 变更

最快的方式是直接调用 API：

```bash
# 确保开发服务器在运行
curl -X POST http://localhost:3456/api/pdf \
  -H "Content-Type: application/json" \
  -d @test-resume.json \
  -o output.pdf
```

或者使用项目中的临时脚本（`tmp/` 目录下的 `.mjs` 文件）。
