'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Settings } from 'lucide-react'
import { ResumeData, defaultResumeData, Section } from '@/lib/resume-data'
import { type ThemeId } from '@/lib/themes'
import { loadResumeData, createDebouncedSaver, loadPresets, savePresets, loadActivePresetId, saveActivePresetId } from '@/lib/storage'
import { exportResumeJSON, importResumeJSON } from '@/lib/validate'
import { type LayoutConfig, type Preset } from '@/lib/layout-config'
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
import { SettingsPanel } from '@/components/editor/SettingsPanel'

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [presets, setPresets] = useState<Preset[]>([])
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadResumeData()
    const loadedPresets = loadPresets()
    const loadedActiveId = loadActivePresetId()
    setData(saved)
    setPresets(loadedPresets)
    setActivePresetId(loadedActiveId)
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

  const handleUpdateTheme = useCallback((style: ThemeId) => {
    setData((prev) => {
      const next = {
        ...prev,
        meta: { ...prev.meta, activeStyle: style, lastModified: new Date().toISOString() },
      }
      debouncedSave(next)
      return next
    })
  }, [])

  const handleUpdateLayout = useCallback((layout: LayoutConfig) => {
    setData((prev) => {
      const next = {
        ...prev,
        meta: { ...prev.meta, layout, lastModified: new Date().toISOString() },
      }
      debouncedSave(next)
      return next
    })
  }, [])

  const handleSelectPreset = useCallback((preset: Preset) => {
    setActivePresetId(preset.id)
    saveActivePresetId(preset.id)
    setData((prev) => {
      const next = {
        ...prev,
        meta: {
          ...prev.meta,
          activeStyle: preset.themeId,
          layout: { ...preset.layout },
          lastModified: new Date().toISOString(),
        },
      }
      debouncedSave(next)
      return next
    })
  }, [])

  const handleSavePreset = useCallback((preset: Preset) => {
    setPresets((prev) => {
      const next = [...prev, preset]
      savePresets(next)
      return next
    })
    setActivePresetId(preset.id)
    saveActivePresetId(preset.id)
  }, [])

  const handleRenamePreset = useCallback((id: string, name: string) => {
    setPresets((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, name } : p))
      savePresets(next)
      return next
    })
  }, [])

  const handleDeletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id)
      savePresets(next)
      return next
    })
    if (activePresetId === id) {
      setActivePresetId(null)
      saveActivePresetId(null)
    }
  }, [activePresetId])

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

  const handleResizerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!panelRef.current) return
    const current = panelRef.current.offsetWidth
    let next = current
    if (e.key === 'ArrowLeft') next = current - 16
    if (e.key === 'ArrowRight') next = current + 16
    if (e.key === 'Home') next = 280
    if (e.key === 'End') next = Math.floor(window.innerWidth / 2)
    next = Math.max(280, Math.min(Math.floor(window.innerWidth / 2), next))
    panelRef.current.style.width = `${next}px`
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
        <div className="app-loading">
          <div className="app-loading-text">Loading...</div>
        </div>
      </div>
    )
  }

  const panelWidth = panelRef.current?.offsetWidth ?? 380

  return (
    <div className="app">
      {/* Toolbar */}
      <header role="banner" className="toolbar">
        <div className="toolbar-brand">
          <h1>Typographer<span className="brand-accent">.</span></h1>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-secondary btn-small" onClick={handleExportJSON}>
            <span>Export JSON</span>
          </button>
          <label className="btn btn-secondary btn-small btn-import">
            <span>Import JSON</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="file-input-hidden"
              onChange={(e) => e.target.files?.[0] && handleImportJSON(e.target.files[0])}
            />
          </label>
          <button
            className="btn btn-secondary"
            onClick={handlePreviewPDF}
            disabled={isExporting}
            aria-busy={isExporting}
            aria-label={isExporting ? 'Exporting PDF' : 'Preview PDF'}
          >
            <span>{isExporting ? 'Exporting…' : 'Preview'}</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={handleExportPDF}
            disabled={isExporting}
            aria-busy={isExporting}
            aria-label={isExporting ? 'Exporting PDF' : 'Download PDF'}
          >
            <span>{isExporting ? 'Exporting…' : 'Download PDF'}</span>
          </button>
          <button
            className="settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Workspace */}
      <div className="workspace">
        {/* Editor Panel */}
        <aside aria-label="Resume editor" ref={panelRef} className="editor-panel" style={{ width: 380 }}>
          <div className="editor-header">
            <h2>Editor</h2>
          </div>
          <div className="editor-scroll">
            <SortableSectionList sections={data.sections} onReorder={handleReorder}>
              {(section) => (
                <div
                  className={`section-card ${expandedSections.has(section.id) ? 'expanded' : ''}`}
                >
                  <div className="section-card-header-row">
                    <button
                      type="button"
                      className="section-header"
                      aria-expanded={expandedSections.has(section.id)}
                      aria-controls={`section-body-${section.id}`}
                      onClick={() => toggleExpand(section.id)}
                    >
                      <span className="section-title">
                        <span className="chevron" aria-hidden="true">›</span>
                        {sectionLabel[section.id] ?? section.id}
                      </span>
                    </button>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={section.enabled}
                      className="toggle-switch"
                      onClick={() => handleToggle(section.id, !section.enabled)}
                    >
                      <span className="toggle-label">{section.enabled ? 'On' : 'Off'}</span>
                      <span className={`toggle-track ${section.enabled ? 'active' : ''}`} />
                    </button>
                  </div>
                  <div id={`section-body-${section.id}`} className="section-body">
                    {renderSectionForm(section.id)}
                  </div>
                </div>
              )}
            </SortableSectionList>
          </div>
        </aside>

        {/* Resizer */}
        <div
          className="resizer"
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={panelWidth}
          aria-valuemin={280}
          aria-valuemax={Math.floor(typeof window !== 'undefined' ? window.innerWidth / 2 : 960)}
          tabIndex={0}
          onMouseDown={handleMouseDown}
          onKeyDown={handleResizerKeyDown}
        />

        {/* Preview */}
        <ResumePreview data={data} />
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        layout={data.meta.layout}
        activeStyle={data.meta.activeStyle}
        presets={presets}
        activePresetId={activePresetId}
        onUpdateLayout={handleUpdateLayout}
        onUpdateTheme={handleUpdateTheme}
        onSelectPreset={handleSelectPreset}
        onSavePreset={handleSavePreset}
        onRenamePreset={handleRenamePreset}
        onDeletePreset={handleDeletePreset}
      />
    </div>
  )
}
