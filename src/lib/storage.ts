import { ResumeData, defaultResumeData, defaultSections } from './resume-data'

const STORAGE_KEY = 'cv-data'

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
