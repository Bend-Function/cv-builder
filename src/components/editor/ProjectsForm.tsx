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
            <button onClick={() => remove(i)} className="item-delete">×</button>
          </div>
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input type="text" value={proj.name} onChange={(e) => update(i, 'name', e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Context</label>
            <input type="text" value={proj.context} onChange={(e) => update(i, 'context', e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input type="text" value={proj.location ?? ''} onChange={(e) => update(i, 'location', e.target.value)} className="form-input" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="text" value={proj.startDate} onChange={(e) => update(i, 'startDate', e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input type="text" value={proj.endDate} onChange={(e) => update(i, 'endDate', e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            {proj.bullets.map((b, j) => (
              <div key={j} className="bullet-row">
                <span className="bullet-dot">›</span>
                <input type="text" value={b} onChange={(e) => setBullet(i, j, e.target.value)} className="bullet-input" />
                <button onClick={() => removeBullet(i, j)} className="item-delete">×</button>
              </div>
            ))}
            <button onClick={() => addBullet(i)} className="add-btn">+ Add bullet</button>
          </div>
        </div>
      ))}
      <button onClick={add} className="add-btn">+ Add Project</button>
    </div>
  )
}
