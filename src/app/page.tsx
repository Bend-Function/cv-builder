'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ResumeData, defaultResumeData, Section } from '@/lib/resume-data'
import { loadResumeData, createDebouncedSaver } from '@/lib/storage'
import { exportResumeJSON, importResumeJSON } from '@/lib/validate'
import { EditorPanel } from '@/components/editor/EditorPanel'
import { ResumePreview } from '@/components/preview/ResumePreview'
import { SortableSectionList } from '@/components/editor/SortableSectionList'
import { SectionToggle } from '@/components/editor/SectionToggle'
import { ContactForm } from '@/components/editor/ContactForm'
import { ProfileForm } from '@/components/editor/ProfileForm'
import { SkillsForm } from '@/components/editor/SkillsForm'
import { ExperienceForm } from '@/components/editor/ExperienceForm'
import { ProjectsForm } from '@/components/editor/ProjectsForm'
import { EducationForm } from '@/components/editor/EducationForm'
import { CertificationsForm } from '@/components/editor/CertificationsForm'
import { RefereesForm } from '@/components/editor/RefereesForm'
import { Button } from '@/components/ui/button'

const debouncedSave = createDebouncedSaver(1000)

export default function Home() {
  const [data, setData] = useState<ResumeData>(defaultResumeData)
  const [activeSection, setActiveSection] = useState<string>('contact')
  const [isExporting, setIsExporting] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadResumeData()
    setData(saved)
    setLoaded(true)
  }, [])

  const update = useCallback(<K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setData((prev) => {
      const next = { ...prev, [key]: value, meta: { ...prev.meta, lastModified: new Date().toISOString() } }
      debouncedSave(next)
      return next
    })
  }, [])

  const handleReorder = useCallback((sections: Section[]) => {
    setData((prev) => {
      const next = {
        ...prev,
        sections: sections.map((s, i) => ({ ...s, order: i })),
        meta: { ...prev.meta, lastModified: new Date().toISOString() },
      }
      debouncedSave(next)
      return next
    })
  }, [])

  const handleToggle = useCallback((id: string, enabled: boolean) => {
    setData((prev) => {
      const next = {
        ...prev,
        sections: prev.sections.map((s) => (s.id === id ? { ...s, enabled } : s)),
        meta: { ...prev.meta, lastModified: new Date().toISOString() },
      }
      debouncedSave(next)
      return next
    })
  }, [])

  const handleThemeChange = useCallback((style: ResumeData['meta']['activeStyle']) => {
    setData((prev) => {
      const next = {
        ...prev,
        meta: { ...prev.meta, activeStyle: style, lastModified: new Date().toISOString() },
      }
      debouncedSave(next)
      return next
    })
  }, [])

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PDF generation failed' }))
        alert(err.error || 'PDF generation failed')
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'resume.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert('PDF generation failed')
    } finally {
      setIsExporting(false)
    }
  }, [data])

  const handleExportJSON = useCallback(() => {
    const json = exportResumeJSON(data)
    const blob = new Blob([json], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resume-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }, [data])

  const handleImportJSON = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = importResumeJSON(e.target?.result as string)
      if (result) {
        setData(result)
        debouncedSave(result)
      } else {
        alert('Invalid resume file format')
      }
    }
    reader.readAsText(file)
  }, [])

  const sectionLabel: Record<string, string> = {
    contact: 'Contact',
    profile: 'Profile',
    skills: 'Skills',
    experience: 'Experience',
    projects: 'Projects',
    education: 'Education',
    certifications: 'Certifications',
    referees: 'Referees',
  }

  const renderEditor = () => {
    switch (activeSection) {
      case 'contact':
        return <ContactForm contact={data.contact} onChange={(c) => update('contact', c)} />
      case 'profile':
        return <ProfileForm profile={data.profile} onChange={(p) => update('profile', p)} />
      case 'skills':
        return <SkillsForm skills={data.skills} onChange={(s) => update('skills', s)} />
      case 'experience':
        return <ExperienceForm experience={data.experience} onChange={(e) => update('experience', e)} />
      case 'projects':
        return <ProjectsForm projects={data.projects} onChange={(p) => update('projects', p)} />
      case 'education':
        return <EducationForm education={data.education} onChange={(e) => update('education', e)} />
      case 'certifications':
        return <CertificationsForm certifications={data.certifications} onChange={(c) => update('certifications', c)} />
      case 'referees':
        return <RefereesForm referees={data.referees} onChange={(r) => update('referees', r)} />
      default:
        return null
    }
  }

  if (!loaded) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#080a0f]">
        <div className="text-text-secondary font-serif text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080a0f]">
      <EditorPanel>
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Sections</span>
            <div className="flex items-center gap-2">
              <select
                value={data.meta.activeStyle}
                onChange={(e) => handleThemeChange(e.target.value as ResumeData['meta']['activeStyle'])}
                className="bg-panel border border-border-panel rounded-md text-text-primary text-xs px-2 py-1 outline-none focus:border-accent-dim"
              >
                <option value="classic-blue">Classic Blue</option>
                <option value="crimson-block">Crimson Block</option>
                <option value="minimal-mono">Minimal Mono</option>
              </select>
              <Button size="sm" variant="outline" onClick={handleExportJSON}>
                Export JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                Import JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImportJSON(e.target.files[0])}
              />
              <Button size="sm" onClick={handleExportPDF} disabled={isExporting}>
                {isExporting ? 'Exporting…' : 'Export PDF'}
              </Button>
            </div>
          </div>
          <SortableSectionList sections={data.sections} onReorder={handleReorder}>
            {(section) => (
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection(section.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActiveSection(section.id)
                  }
                }}
                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                  activeSection === section.id
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-text-secondary hover:bg-workspace hover:text-text-primary'
                }`}
              >
                <span>{sectionLabel[section.id] ?? section.id}</span>
                <SectionToggle
                  enabled={section.enabled}
                  onChange={(enabled) => handleToggle(section.id, enabled)}
                />
              </div>
            )}
          </SortableSectionList>
        </div>

        <div className="border-t border-border-panel pt-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
              {sectionLabel[activeSection] ?? activeSection}
            </span>
          </div>
          {renderEditor()}
        </div>
      </EditorPanel>

      <ResumePreview data={data} />
    </div>
  )
}
