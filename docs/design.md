# 设计文档

本文档记录 CV Builder 的设计决策、视觉系统、主题机制以及扩展方式。

## 设计目标

1. **所见即所得** — 用户在屏幕上看到的，就是打印或导出 PDF 后得到的结果。
2. **无后端依赖** — 所有数据保存在浏览器本地，通过 JSON 文件实现迁移。
3. **主题可扩展** — 添加新主题只需要一个 CSS 文件和一个注册表条目。
4. **版式可定制** — 边距、间距、字体、字号均可调整，并随 JSON 一起导出。

## 视觉系统

编辑器采用深色主题（`#080a0f` 背景），预览区模拟真实纸张（`#faf8f5`），形成强烈的"工作区 vs 成品"对比。

### 色彩

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg-workspace` | `#080a0f` | 编辑器背景 |
| `--bg-panel` | `#181c26` | 卡片、工具栏背景 |
| `--border-panel` | `#2a3040` | 边框、分割线 |
| `--text-primary` | `#e8e4dc` | 主文字 |
| `--text-secondary` | `#a8adb8` | 次要文字、标签 |
| `--text-muted` | `#6a7080` | 占位符、禁用态 |
| `--accent` | `#c9a96e` | 强调色：按钮、开关激活态、拖拽手柄悬停 |

### 纸张（预览/PDF 共用）

| Token | 值 | 用途 |
|-------|-----|------|
| `--paper-text` | `#1a1a1a` | 正文颜色 |
| `--body-font` | `'Times New Roman', serif` | 默认正文字体 |
| `--heading-font` | `'Times New Roman', serif` | 默认标题字体 |

纸张尺寸固定为 `210mm × 297mm`（A4），背景纯白。预览区通过 CSS transform 缩放以适应屏幕宽度。

## 主题系统

主题是一组 CSS 变量覆盖，作用于 `.theme-{id}` 选择器下的 `.paper` 元素。

### 主题 CSS 的工作方式

`paper.css` 定义基础变量：

```css
.paper {
  --body-font: 'Times New Roman', serif;
  --heading-font: 'Times New Roman', serif;
  --body-font-size: 10.5pt;
  --heading-font-size: 11pt;
  --name-font-size: 22pt;
  --section-gap: 12pt;
  --title-gap: 6pt;
}
```

主题文件覆盖这些变量：

```css
.theme-functional {
  --body-font: Arial, Helvetica, sans-serif;
  --heading-font: Arial, Helvetica, sans-serif;
  --name-font-size: 24pt;
  --heading-font-size: 12pt;
}
```

这使得用户自定义的版式设置（字体、字号）与主题设置可以**叠加**：用户通过设置面板修改的值通过 inline style 注入为 CSS 变量，优先级高于主题文件的覆盖。主题只覆盖它关心的变量，其余保持用户自定义值或默认值。

### 现有主题

| 主题 | 风格 | 特点 |
|------|------|------|
| `classic-blue` | 经典商务 | 海军蓝章节标题 + 下划线，Times 字体，居中联系信息 |
| `crimson-block` | 醒目块面 | 深红色背景块作为章节标题，白字，视觉冲击力强 |
| `minimal-mono` | 极简衬线 | 全衬线，细下划线标题，无彩色装饰 |
| `functional` | 功能主义 | 无衬线，章节间有分割线，工作经历两栏布局（公司/日期在左，职责在右） |

## 两种布局系统

`ResumeRenderer` 根据主题选择 `StandardLayout` 或 `FunctionalLayout`：

- **StandardLayout** — 所有章节垂直堆叠，每个章节是标题 + 内容块。适用于 `classic-blue`、`crimson-block`、`minimal-mono`。
- **FunctionalLayout** — 联系信息采用堆叠式地址块，工作经历和项目采用两栏网格（左侧公司/日期，右侧职责 bullet）。适用于 `functional`。

章节组件（`ContactSection`、`ExperienceSection` 等）为每种布局导出同名组件，布局通过统一接口调用。

## 版式配置系统

`LayoutConfig` 是用户可调参数的集合：

```ts
interface LayoutConfig {
  marginTop: number      // mm
  marginBottom: number   // mm
  marginLeft: number     // mm
  marginRight: number    // mm
  sectionGap: number     // pt
  titleGap: number       // pt
  bodyFont: string
  headingFont: string
  bodyFontSize: number   // pt
  headingFontSize: number // pt
  nameFontSize: number   // pt
}
```

### 预览中的注入方式

`ResumePreview.tsx` 通过 `.paper` div 的 inline style 注入 CSS 变量：

```tsx
<div className="paper" style={{
  '--paper-margin-top': `${layout.marginTop}mm`,
  '--section-gap': `${layout.sectionGap}pt`,
  '--body-font': layout.bodyFont,
  /* ... */
}}>
```

同时 `padding` 也来自 layout：
```tsx
padding: `${layout.marginTop}mm ${layout.marginRight}mm ${layout.marginBottom}mm ${layout.marginLeft}mm`
```

### PDF 中的注入方式

`pdf-generator.ts` 通过 `generateLayoutCSS()` 生成一段 CSS 文本，内联到 HTML 的 `<style>` 块中。PDF 中的 `.paper` 不设置 padding，由 Puppeteer 的 `margin` 参数提供逐页边距。

## 预设系统

预设是"主题 + 版式"的命名快照，存储在 localStorage 中。

```ts
interface Preset {
  id: string
  name: string
  themeId: ThemeId
  layout: LayoutConfig
}
```

- **默认预设**：首次加载时若 localStorage 中没有预设，自动生成 4 个（每个主题一个，使用默认版式）。
- **自定义预设**：用户在设置面板中填写名称并点击"保存"，即可基于当前主题和版式创建新预设。
- **预设选择**：切换预设时，`meta.activeStyle` 和 `meta.layout` 同时更新，预览即时反映变化。
- **保护机制**：默认预设（Classic Blue、Crimson Block、Minimal Mono、Functional）不可重命名/删除。

## 扩展点

### 添加新主题

1. 在 `src/lib/themes.ts` 的 `THEMES` 数组中添加 `{ id: 'my-theme', label: 'My Theme' }`
2. 创建 `src/styles/themes/my-theme.css`，内容示例：
   ```css
   .theme-my-theme {
     --body-font: Georgia, serif;
     --heading-font: Georgia, serif;
     --name-font-size: 24pt;
   }
   ```
3. 如需主题特定的 DOM 结构（如 functional 的两栏），在 `StandardLayout` 或 `FunctionalLayout` 中添加条件渲染

不需要修改：PDF 生成器、校验器、UI 选择器、设置面板 —— 它们都通过注册表自动发现新主题。

### 添加新版式参数

1. 在 `src/lib/layout-config.ts` 的 `LayoutConfig` 接口和 `defaultLayoutConfig` 中添加新字段
2. 在 `layoutToCSSVariables()` 中将其映射为 CSS 变量名
3. 在 `paper.css` 中添加该变量的默认使用和具体元素的样式规则
4. 在 `SettingsPanel.tsx` 的 Layout 标签页中添加对应的表单控件

### 添加新章节

1. 在 `src/components/preview/sections/` 创建新组件，导出 `Standard` 和 `Functional` 两个布局版本
2. 在 `src/components/editor/` 创建对应的表单组件
3. 在 `StandardLayout.tsx` 和 `FunctionalLayout.tsx` 中导入并调用新章节组件
4. 在 `src/lib/resume-data.ts` 中添加数据类型和默认数据
5. 在 `defaultSections` 中添加新章节的默认配置
6. 在 `page.tsx` 的 `renderSectionForm` 和 `sectionLabel` 中注册表单组件
