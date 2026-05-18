'use client'

import { useState, useCallback } from 'react'
import { ResumeData, defaultResumeData, Section } from '@/lib/resume-data'
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

export default function Home() {
  const [data, setData] = useState<ResumeData>(defaultResumeData)
  const [activeSection, setActiveSection] = useState<string>('contact')
  const [isExporting, setIsExporting] = useState(false)

  const update = useCallback(<K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setData((prev) => ({ ...prev, [key]: value, meta: { ...prev.meta, lastModified: new Date().toISOString() } }))
  }, [])

  const handleReorder = useCallback((sections: Section[]) => {
    setData((prev) => ({
      ...prev,
      sections: sections.map((s, i) => ({ ...s, order: i })),
      meta: { ...prev.meta, lastModified: new Date().toISOString() },
    }))
  }, [])

  const handleToggle = useCallback((id: string, enabled: boolean) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, enabled } : s)),
      meta: { ...prev.meta, lastModified: new Date().toISOString() },
    }))
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080a0f]">
      <EditorPanel>
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Sections</span>
            <Button size="sm" onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? 'Exporting…' : 'Export PDF'}
            </Button>
          </div>
          <SortableSectionList sections={data.sections} onReorder={handleReorder}>
            {(section) => (
              <button
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
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
              </button>
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
