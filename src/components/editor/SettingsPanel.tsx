'use client'

import { useState, useCallback } from 'react'
import { Settings, X, Save, Trash2, Edit3, Plus } from 'lucide-react'
import { THEMES, type ThemeId } from '@/lib/themes'
import { type LayoutConfig, type Preset, SYSTEM_FONTS, createPreset } from '@/lib/layout-config'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  layout: LayoutConfig
  activeStyle: ThemeId
  presets: Preset[]
  activePresetId: string | null
  onUpdateLayout: (layout: LayoutConfig) => void
  onUpdateTheme: (themeId: ThemeId) => void
  onSelectPreset: (preset: Preset) => void
  onSavePreset: (preset: Preset) => void
  onRenamePreset: (id: string, name: string) => void
  onDeletePreset: (id: string) => void
}

type TabId = 'presets' | 'theme' | 'layout'

const TABS: { id: TabId; label: string }[] = [
  { id: 'presets', label: 'Presets' },
  { id: 'theme', label: 'Theme' },
  { id: 'layout', label: 'Layout' },
]

export function SettingsPanel({
  isOpen,
  onClose,
  layout,
  activeStyle,
  presets,
  activePresetId,
  onUpdateLayout,
  onUpdateTheme,
  onSelectPreset,
  onSavePreset,
  onRenamePreset,
  onDeletePreset,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('layout')
  const [newPresetName, setNewPresetName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleLayoutChange = useCallback(
    (field: keyof LayoutConfig, value: string | number) => {
      onUpdateLayout({ ...layout, [field]: value })
    },
    [layout, onUpdateLayout]
  )

  const handleSaveNew = useCallback(() => {
    const name = newPresetName.trim()
    if (!name) return
    const preset = createPreset(name, activeStyle, layout)
    onSavePreset(preset)
    setNewPresetName('')
  }, [newPresetName, activeStyle, layout, onSavePreset])

  const startRename = useCallback((preset: Preset) => {
    setRenamingId(preset.id)
    setRenameValue(preset.name)
  }, [])

  const commitRename = useCallback(() => {
    if (renamingId && renameValue.trim()) {
      onRenamePreset(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }, [renamingId, renameValue, onRenamePreset])

  if (!isOpen) return null

  const defaultPresetIds = new Set(
    presets.filter((p) => p.name === 'Classic Blue' || p.name === 'Crimson Block' || p.name === 'Minimal Mono' || p.name === 'Functional').map((p) => p.id)
  )

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <div className="settings-title">
            <Settings size={16} />
            <span>Settings</span>
          </div>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">
            <X size={16} />
          </button>
        </div>

        <div className="settings-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {activeTab === 'presets' && (
            <div className="settings-section">
              <label className="form-label">Active Preset</label>
              <select
                className="form-select"
                value={activePresetId ?? ''}
                onChange={(e) => {
                  const preset = presets.find((p) => p.id === e.target.value)
                  if (preset) onSelectPreset(preset)
                }}
              >
                <option value="" disabled>Select a preset</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <div className="preset-actions">
                {presets.map((preset) => (
                  <div key={preset.id} className="preset-row">
                    {renamingId === preset.id ? (
                      <input
                        className="form-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename()
                          if (e.key === 'Escape') {
                            setRenamingId(null)
                            setRenameValue('')
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="preset-name">{preset.name}</span>
                    )}
                    {!defaultPresetIds.has(preset.id) && renamingId !== preset.id && (
                      <div className="preset-row-actions">
                        <button
                          className="preset-btn"
                          onClick={() => startRename(preset)}
                          aria-label={`Rename ${preset.name}`}
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          className="preset-btn preset-btn-danger"
                          onClick={() => onDeletePreset(preset.id)}
                          aria-label={`Delete ${preset.name}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="preset-save-row">
                <input
                  className="form-input"
                  placeholder="New preset name"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveNew()
                  }}
                />
                <button className="btn btn-primary btn-small" onClick={handleSaveNew}>
                  <Plus size={12} />
                  <span>Save</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="settings-section">
              <label className="form-label">Theme</label>
              <div className="theme-grid">
                {THEMES.map((t) => (
                  <label key={t.id} className={`theme-card ${activeStyle === t.id ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="theme"
                      value={t.id}
                      checked={activeStyle === t.id}
                      onChange={() => onUpdateTheme(t.id)}
                    />
                    <span className="theme-card-name">{t.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="settings-section">
              <fieldset className="settings-fieldset">
                <legend className="form-label">Margins (mm)</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Top</label>
                    <input
                      type="number"
                      className="form-input"
                      value={layout.marginTop}
                      onChange={(e) => handleLayoutChange('marginTop', Number(e.target.value))}
                      min={0}
                      max={60}
                      step={1}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bottom</label>
                    <input
                      type="number"
                      className="form-input"
                      value={layout.marginBottom}
                      onChange={(e) => handleLayoutChange('marginBottom', Number(e.target.value))}
                      min={0}
                      max={60}
                      step={1}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Left</label>
                    <input
                      type="number"
                      className="form-input"
                      value={layout.marginLeft}
                      onChange={(e) => handleLayoutChange('marginLeft', Number(e.target.value))}
                      min={0}
                      max={60}
                      step={1}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Right</label>
                    <input
                      type="number"
                      className="form-input"
                      value={layout.marginRight}
                      onChange={(e) => handleLayoutChange('marginRight', Number(e.target.value))}
                      min={0}
                      max={60}
                      step={1}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="settings-fieldset">
                <legend className="form-label">Spacing (pt)</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Section Gap</label>
                    <input
                      type="number"
                      className="form-input"
                      value={layout.sectionGap}
                      onChange={(e) => handleLayoutChange('sectionGap', Number(e.target.value))}
                      min={0}
                      max={48}
                      step={1}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Title Gap</label>
                    <input
                      type="number"
                      className="form-input"
                      value={layout.titleGap}
                      onChange={(e) => handleLayoutChange('titleGap', Number(e.target.value))}
                      min={0}
                      max={24}
                      step={1}
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="settings-fieldset">
                <legend className="form-label">Typography</legend>
                <div className="form-group">
                  <label className="form-label">Body Font</label>
                  <select
                    className="form-select"
                    value={layout.bodyFont}
                    onChange={(e) => handleLayoutChange('bodyFont', e.target.value)}
                  >
                    {SYSTEM_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Heading Font</label>
                  <select
                    className="form-select"
                    value={layout.headingFont}
                    onChange={(e) => handleLayoutChange('headingFont', e.target.value)}
                  >
                    {SYSTEM_FONTS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Body Size (pt)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={layout.bodyFontSize}
                      onChange={(e) => handleLayoutChange('bodyFontSize', Number(e.target.value))}
                      min={6}
                      max={18}
                      step={0.5}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Heading Size (pt)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={layout.headingFontSize}
                      onChange={(e) => handleLayoutChange('headingFontSize', Number(e.target.value))}
                      min={8}
                      max={24}
                      step={0.5}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Name Size (pt)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={layout.nameFontSize}
                    onChange={(e) => handleLayoutChange('nameFontSize', Number(e.target.value))}
                    min={12}
                    max={36}
                    step={0.5}
                  />
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
