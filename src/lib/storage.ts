import { ResumeData, defaultResumeData } from './resume-data'
import { createPreset, defaultLayoutConfig, type Preset } from './layout-config'
import { THEMES } from './themes'
import { migrateResumeData } from './resume-migration'

const STORAGE_KEY = 'cv-data'
const STORAGE_KEY_PRESETS = 'cv-presets'
const STORAGE_KEY_ACTIVE_PRESET = 'cv-active-preset-id'

export function loadResumeData(): ResumeData {
  if (typeof window === 'undefined') return migrateResumeData(defaultResumeData)

  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return migrateResumeData(defaultResumeData)

  try {
    return migrateResumeData(JSON.parse(saved))
  } catch {
    return migrateResumeData(defaultResumeData)
  }
}

export function saveResumeData(data: ResumeData): void {
  if (typeof window === 'undefined') return
  data.meta.lastModified = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function createDebouncedSaver(delay = 1000) {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (data: ResumeData) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => saveResumeData(data), delay)
  }
}

// Preset storage

export function loadPresets(): Preset[] {
  if (typeof window === 'undefined') return createDefaultPresets()

  const saved = localStorage.getItem(STORAGE_KEY_PRESETS)
  if (!saved) return createDefaultPresets()

  try {
    const parsed = JSON.parse(saved) as Preset[]
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
    return createDefaultPresets()
  } catch {
    return createDefaultPresets()
  }
}

export function savePresets(presets: Preset[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets))
}

export function loadActivePresetId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY_ACTIVE_PRESET)
}

export function saveActivePresetId(id: string | null): void {
  if (typeof window === 'undefined') return
  if (id) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PRESET, id)
  } else {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_PRESET)
  }
}

function createDefaultPresets(): Preset[] {
  return THEMES.map((t) => createPreset(t.label, t.id, defaultLayoutConfig))
}
