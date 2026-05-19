import { ResumeData, defaultResumeData, defaultSections } from './resume-data'
import { defaultLayoutConfig, type Preset } from './layout-config'
import { THEMES } from './themes'

const STORAGE_KEY = 'cv-data'
const STORAGE_KEY_PRESETS = 'cv-presets'
const STORAGE_KEY_ACTIVE_PRESET = 'cv-active-preset-id'

export function loadResumeData(): ResumeData {
  if (typeof window === 'undefined') return { ...defaultResumeData }

  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return { ...defaultResumeData }

  try {
    const parsed = JSON.parse(saved) as ResumeData
    if (!parsed.contact) return { ...defaultResumeData }

    if (!Array.isArray(parsed.sections)) {
      parsed.sections = []
    }

    const existingIds = new Set(parsed.sections.map((s) => s.id))
    defaultSections.forEach((ds) => {
      if (!existingIds.has(ds.id)) {
        parsed.sections.push({ ...ds })
      }
    })

    if (!parsed.referees) {
      parsed.referees = { mode: 'on-request', list: [] }
    }

    if (!parsed.profile) {
      parsed.profile = {
        type: 'paragraph',
        content: (parsed as any).summary || '',
        bullets: [],
      }
    }

    if (!parsed.meta.layout) {
      parsed.meta.layout = { ...defaultLayoutConfig }
    }

    return parsed
  } catch {
    return { ...defaultResumeData }
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
  const { createPreset } = require('./layout-config')
  return THEMES.map((t) => createPreset(t.label, t.id, defaultLayoutConfig))
}
