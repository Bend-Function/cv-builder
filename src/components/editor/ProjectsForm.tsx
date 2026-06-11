import { ProjectItem } from '@/lib/resume-data'

interface ProjectsFormProps {
  projects: ProjectItem[]
  onChange: (projects: ProjectItem[]) => void
}

export function ProjectsForm({ projects, onChange }: ProjectsFormProps) {
  const update = (index: number, field: keyof ProjectItem, value: string) => {
    const next = [...projects]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }
  const add = () => onChange([...projects, { id: `proj-${Date.now()}`, name: '', context: '', location: '', startDate: '', endDate: '', body: '' }])
  const remove = (index: number) => onChange(projects.filter((_, i) => i !== index))

  return (
    <div>
      {projects.map((proj, i) => (
        <div key={proj.id} className="item-card">
          <div className="item-header">
            <span className="item-number">#{i + 1}</span>
            <button type="button" onClick={() => remove(i)} className="item-delete" aria-label={`Remove project ${i + 1}`}>×</button>
          </div>
          <div className="form-group">
            <label htmlFor={`proj-${proj.id}-name`} className="form-label">Project Name</label>
            <input id={`proj-${proj.id}-name`} type="text" value={proj.name} onChange={(e) => update(i, 'name', e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor={`proj-${proj.id}-context`} className="form-label">Context</label>
            <input id={`proj-${proj.id}-context`} type="text" value={proj.context} onChange={(e) => update(i, 'context', e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor={`proj-${proj.id}-location`} className="form-label">Location</label>
            <input id={`proj-${proj.id}-location`} type="text" value={proj.location ?? ''} onChange={(e) => update(i, 'location', e.target.value)} className="form-input" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor={`proj-${proj.id}-startDate`} className="form-label">Start Date</label>
              <input id={`proj-${proj.id}-startDate`} type="text" value={proj.startDate} onChange={(e) => update(i, 'startDate', e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor={`proj-${proj.id}-endDate`} className="form-label">End Date</label>
              <input id={`proj-${proj.id}-endDate`} type="text" value={proj.endDate} onChange={(e) => update(i, 'endDate', e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor={`proj-${proj.id}-body`} className="form-label">Description</label>
            <textarea
              id={`proj-${proj.id}-body`}
              value={proj.body}
              onChange={(e) => update(i, 'body', e.target.value)}
              rows={8}
              className="form-textarea markdown-textarea"
              placeholder={[
                'Write markdown. Example:',
                '',
                'Built a **full-stack** app with Stripe payments.',
                '',
                '- Implemented JWT authentication',
                '  - Added role-based access control',
                '    - Protected admin dashboard routes',
              ].join('\n')}
            />
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="add-btn">+ Add Project</button>
    </div>
  )
}
