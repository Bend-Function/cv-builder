'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { ResumeData, defaultResumeData, Section } from '@/lib/resume-data'
import { THEMES, type ThemeId } from '@/lib/themes'
import { loadResumeData, createDebouncedSaver } from '@/lib/storage'
import { exportResumeJSON, importResumeJSON } from '@/lib/validate'
import { ResumePreview } from '@/components/preview/ResumePreview'
import { SortableSectionList } from '@/components/editor/SortableSectionList'
import { ContactForm } from '@/components/editor/ContactForm'
import { ProfileForm } from '@/components/editor/ProfileForm'
import { SkillsForm } from '@/components/editor/SkillsForm'
import { ExperienceForm } from '@/components/editor/ExperienceForm'
import { ProjectsForm } from '@/components/editor/ProjectsForm'
import { EducationForm } from '@/components/editor/EducationForm'
import { CertificationsForm } from '@/components/editor/CertificationsForm'
import { RefereesForm } from '@/components/editor/RefereesForm'

const debouncedSave = createDebouncedSaver(1000)

const sectionLabel: Record<string, string> = {
  contact: 'Contact Information',
  profile: 'Career Profile',
  skills: 'Technical Skills',
  experience: 'Work Experience',
  projects: 'Selected Projects',
  education: 'Education',
  certifications: 'Certifications',
  referees: 'Referees',
}

export default function Home() {
  const [data, setData] = useState<ResumeData>(defaultResumeData)
  const [loaded, setLoaded] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['contact']))
  const fileInputRef = useRef<HTMLInputElement>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

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

  const handleThemeChange = useCallback((style: ThemeId) => {
    setData((prev) => {
      const next = {
        ...prev,
        meta: { ...prev.meta, activeStyle: style, lastModified: new Date().toISOString() },
      }
      debouncedSave(next)
      return next
    })
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
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

  const handlePreviewPDF = useCallback(async () => {
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
      window.open(url, '_blank')
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

  // Resizer logic
  const handleMouseDown = useCallback(() => {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !panelRef.current) return
      const workspace = panelRef.current.parentElement
      if (!workspace) return
      const rect = workspace.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      const clamped = Math.max(280, Math.min(window.innerWidth / 2, newWidth))
      panelRef.current.style.width = `${clamped}px`
    }

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const renderSectionForm = (id: string) => {
    switch (id) {
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
      <div className="app">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-fraunces), serif', fontSize: '18px' }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="toolbar-brand">
          <h1>Typographer<span className="brand-accent">.</span></h1>
        </div>
        <div className="toolbar-actions">
          <div className="style-selector">
            <label>Style</label>
            <select
              value={data.meta.activeStyle}
              onChange={(e) => handleThemeChange(e.target.value as ThemeId)}
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-secondary btn-small" onClick={handleExportJSON}>
            <span>Export JSON</span>
          </button>
          <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer' }}>
            <span>Import JSON</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && handleImportJSON(e.target.files[0])}
            />
          </label>
          <button className="btn btn-secondary" onClick={handlePreviewPDF} disabled={isExporting}>
            <span>{isExporting ? 'Exporting…' : 'Preview'}</span>
          </button>
          <button className="btn btn-primary" onClick={handleExportPDF} disabled={isExporting}>
            <span>{isExporting ? 'Exporting…' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div className="workspace">
        {/* Editor Panel */}
        <div ref={panelRef} className="editor-panel" style={{ width: 380 }}>
          <div className="editor-header">
            <h2>Editor</h2>
          </div>
          <div className="editor-scroll">
            <SortableSectionList sections={data.sections} onReorder={handleReorder}>
              {(section) => (
                <div
                  className={`section-card ${expandedSections.has(section.id) ? 'expanded' : ''}`}
                >
                  <div
                    className="section-header"
                    onClick={() => toggleExpand(section.id)}
                  >
                    <span className="section-title">
                      <span className="chevron">›</span>
                      {sectionLabel[section.id] ?? section.id}
                    </span>
                    <div
                      className="toggle-switch"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggle(section.id, !section.enabled)
                      }}
                    >
                      <span className="toggle-label">{section.enabled ? 'On' : 'Off'}</span>
                      <span className={`toggle-track ${section.enabled ? 'active' : ''}`} />
                    </div>
                  </div>
                  <div className="section-body">
                    {renderSectionForm(section.id)}
                  </div>
                </div>
              )}
            </SortableSectionList>
          </div>
        </div>

        {/* Resizer */}
        <div className="resizer" onMouseDown={handleMouseDown} />

        {/* Preview */}
        <ResumePreview data={data} />
      </div>
    </div>
  )
}
