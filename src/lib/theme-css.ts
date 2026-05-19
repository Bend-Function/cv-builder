import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { ThemeId } from './themes'

const STYLES_DIR = path.join(process.cwd(), 'src', 'styles')

export function loadPaperCSS(): string {
  return readFileSync(path.join(STYLES_DIR, 'paper.css'), 'utf8')
}

export function loadThemeCSS(theme: ThemeId): string {
  return readFileSync(path.join(STYLES_DIR, 'themes', `${theme}.css`), 'utf8')
}
