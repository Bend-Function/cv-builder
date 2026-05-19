export const THEMES = [
  { id: 'classic-blue', label: 'Classic Blue' },
  { id: 'crimson-block', label: 'Crimson Block' },
  { id: 'minimal-mono', label: 'Minimal Mono' },
  { id: 'functional', label: 'Functional' },
] as const

export type ThemeId = (typeof THEMES)[number]['id']

export const DEFAULT_THEME: ThemeId = 'classic-blue'

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEMES.some((t) => t.id === value)
}
