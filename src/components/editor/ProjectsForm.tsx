import { ProjectItem } from '@/lib/resume-data'

interface ProjectsFormProps {
  projects: ProjectItem[]
  onChange: (projects: ProjectItem[]) => void
}

export function ProjectsForm({ projects, onChange }: ProjectsFormProps) {
  const update = (index: number, field: keyof ProjectItem, value: string | string[]) => {
    const next = [...projects]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }
  const add = () => onChange([...projects, { id: `proj-${Date.now()}`, name: '', context: '', startDate: '', endDate: '', bullets: [''] }])
  const remove = (index: number) => onChange(projects.filter((_, i) => i !== index))
  const addBullet = (index: number) => update(index, 'bullets', [...projects[index].bullets, ''])
  const removeBullet = (projIdx: number, bulletIdx: number) => update(projIdx, 'bullets', projects[projIdx].bullets.filter((_, i) => i !== bulletIdx))
  const setBullet = (projIdx: number, bulletIdx: number, value: string) => {
    const bullets = [...projects[projIdx].bullets]
    bullets[bulletIdx] = value
    update(projIdx, 'bullets', bullets)
  }

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
            <label className="form-label">Description</label>
            {proj.bullets.map((b, j) => (
              <div key={j} className="bullet-row">
                <span className="bullet-dot">›</span>
                <input
                  type="text"
                  value={b}
                  onChange={(e) => setBullet(i, j, e.target.value)}
                  className="bullet-input"
                  aria-label={`Description bullet ${j + 1}`}
                />
                <button type="button" onClick={() => removeBullet(i, j)} className="item-delete" aria-label={`Remove description bullet ${j + 1}`}>×</button>
              </div>
            ))}
            <button type="button" onClick={() => addBullet(i)} className="add-btn">+ Add bullet</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="add-btn">+ Add Project</button>
    </div>
  )
}
