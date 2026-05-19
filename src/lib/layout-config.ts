import type { ThemeId } from './themes'

export interface LayoutConfig {
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
  sectionGap: number
  titleGap: number
  bodyFont: string
  headingFont: string
  bodyFontSize: number
  headingFontSize: number
  nameFontSize: number
}

export const defaultLayoutConfig: LayoutConfig = {
  marginTop: 15,
  marginBottom: 15,
  marginLeft: 20,
  marginRight: 20,
  sectionGap: 12,
  titleGap: 6,
  bodyFont: "'Times New Roman', serif",
  headingFont: "'Times New Roman', serif",
  bodyFontSize: 10.5,
  headingFontSize: 11,
  nameFontSize: 22,
}

export const SYSTEM_FONTS = [
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "'Times New Roman', Times, serif", label: "Times New Roman" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Courier New', Courier, monospace", label: "Courier New" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS" },
] as const

export interface Preset {
  id: string
  name: string
  themeId: ThemeId
  layout: LayoutConfig
}

export function createPreset(name: string, themeId: ThemeId, layout: LayoutConfig): Preset {
  return {
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    themeId,
    layout: { ...layout },
  }
}

export function layoutToCSSVariables(layout: LayoutConfig): Record<string, string> {
  return {
    '--paper-margin-top': `${layout.marginTop}mm`,
    '--paper-margin-right': `${layout.marginRight}mm`,
    '--paper-margin-bottom': `${layout.marginBottom}mm`,
    '--paper-margin-left': `${layout.marginLeft}mm`,
    '--section-gap': `${layout.sectionGap}pt`,
    '--title-gap': `${layout.titleGap}pt`,
    '--body-font': layout.bodyFont,
    '--heading-font': layout.headingFont,
    '--body-font-size': `${layout.bodyFontSize}pt`,
    '--heading-font-size': `${layout.headingFontSize}pt`,
    '--name-font-size': `${layout.nameFontSize}pt`,
  }
}

export function generateLayoutCSS(layout: LayoutConfig): string {
  const vars = layoutToCSSVariables(layout)
  const declarations = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')
  return `.paper {\n${declarations}\n}`
}
