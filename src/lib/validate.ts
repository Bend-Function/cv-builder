import { ResumeData } from './resume-data'
import { isThemeId } from './themes'
import { migrateResumeData } from './resume-migration'

export function isValidResumeData(obj: unknown): obj is ResumeData {
  if (!obj || typeof obj !== 'object') return false
  const data = obj as Record<string, unknown>

  if (!data.meta || typeof data.meta !== 'object') return false
  if (!data.contact || typeof data.contact !== 'object') return false
  if (!Array.isArray(data.sections)) return false
  if (!Array.isArray(data.skills)) return false
  if (!Array.isArray(data.experience)) return false

  const meta = data.meta as Record<string, unknown>
  if (typeof meta.version !== 'number') return false
  if (!isThemeId(meta.activeStyle)) return false

  return true
}

export function exportResumeJSON(data: ResumeData): string {
  return JSON.stringify(data, null, 2)
}

export function importResumeJSON(json: string): ResumeData | null {
  try {
    const parsed = JSON.parse(json)
    if (isValidResumeData(parsed)) {
      return migrateResumeData(parsed)
    }
    return null
  } catch {
    return null
  }
}
