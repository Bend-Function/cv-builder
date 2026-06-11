import { ResumeData, defaultResumeData, defaultSections } from './resume-data'
import { defaultLayoutConfig } from './layout-config'

type MutableRecord = Record<string, unknown>

function cloneDefault(): ResumeData {
  return {
    ...defaultResumeData,
    meta: { ...defaultResumeData.meta },
    sections: defaultResumeData.sections.map((section) => ({ ...section })),
    contact: { ...defaultResumeData.contact },
    profile: {
      ...defaultResumeData.profile,
      bullets: [...defaultResumeData.profile.bullets],
    },
    skills: defaultResumeData.skills.map((skill) => ({ ...skill })),
    experience: defaultResumeData.experience.map((item) => ({ ...item })),
    projects: defaultResumeData.projects.map((item) => ({ ...item })),
    education: defaultResumeData.education.map((item) => ({
      ...item,
      details: [...item.details],
    })),
    certifications: defaultResumeData.certifications.map((item) => ({ ...item })),
    referees: {
      ...defaultResumeData.referees,
      list: defaultResumeData.referees.list.map((referee) => ({ ...referee })),
    },
  }
}

function bulletsToMarkdown(bullets: unknown): string {
  if (!Array.isArray(bullets)) return ''
  return bullets
    .map((bullet) => {
      if (typeof bullet === 'string') return bullet.trim()
      if (bullet && typeof bullet === 'object') {
        const record = bullet as MutableRecord
        return String(record.content ?? record.text ?? '').trim()
      }
      return ''
    })
    .filter(Boolean)
    .map((bullet) => `- ${bullet}`)
    .join('\n')
}

function migrateMarkdownBody(item: MutableRecord): string {
  if (typeof item.body === 'string') return item.body
  const description = typeof item.description === 'string' ? item.description.trim() : ''
  const bulletMarkdown = bulletsToMarkdown(item.bullets)
  return [description, bulletMarkdown].filter(Boolean).join(description && bulletMarkdown ? '\n\n' : '')
}

export function migrateResumeData(input: unknown): ResumeData {
  if (!input || typeof input !== 'object') return cloneDefault()

  const raw = input as MutableRecord
  const base = cloneDefault()

  const migrated = {
    ...base,
    ...raw,
    meta: {
      ...base.meta,
        ...(raw.meta && typeof raw.meta === 'object' ? raw.meta : {}),
      version: 2,
      layout: {
        ...defaultLayoutConfig,
        ...(raw.meta &&
        typeof raw.meta === 'object' &&
        'layout' in raw.meta &&
        raw.meta.layout &&
        typeof raw.meta.layout === 'object'
          ? raw.meta.layout
          : {}),
      },
    },
    contact: {
      ...base.contact,
      ...(raw.contact && typeof raw.contact === 'object' ? raw.contact : {}),
    },
    profile: {
      ...base.profile,
      ...(raw.profile && typeof raw.profile === 'object'
        ? raw.profile
        : { content: typeof raw.summary === 'string' ? raw.summary : '' }),
    },
    sections: Array.isArray(raw.sections) ? raw.sections : [],
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    experience: Array.isArray(raw.experience) ? raw.experience : [],
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    education: Array.isArray(raw.education) ? raw.education : [],
    certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
    referees: raw.referees && typeof raw.referees === 'object' ? raw.referees : base.referees,
  } as ResumeData

  const existingIds = new Set(migrated.sections.map((section) => section.id))
  defaultSections.forEach((section) => {
    if (!existingIds.has(section.id)) migrated.sections.push({ ...section })
  })

  migrated.experience = migrated.experience.map((item) => ({
    ...item,
    body: migrateMarkdownBody(item as unknown as MutableRecord),
  }))

  migrated.projects = migrated.projects.map((item) => ({
    ...item,
    body: migrateMarkdownBody(item as unknown as MutableRecord),
  }))

  return migrated
}
