import { ExperienceItem } from '@/lib/resume-data'

interface ExperienceFormProps {
  experience: ExperienceItem[]
  onChange: (experience: ExperienceItem[]) => void
}

export function ExperienceForm({ experience, onChange }: ExperienceFormProps) {
  const update = (index: number, field: keyof ExperienceItem, value: string | string[]) => {
    const next = [...experience]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  const add = () => onChange([...experience, { id: `exp-${Date.now()}`, title: '', company: '', startDate: '', endDate: '', bullets: [''] }])
  const remove = (index: number) => onChange(experience.filter((_, i) => i !== index))
  const addBullet = (index: number) => update(index, 'bullets', [...experience[index].bullets, ''])
  const removeBullet = (expIdx: number, bulletIdx: number) => {
    const bullets = experience[expIdx].bullets.filter((_, i) => i !== bulletIdx)
    update(expIdx, 'bullets', bullets)
  }
  const setBullet = (expIdx: number, bulletIdx: number, value: string) => {
    const bullets = [...experience[expIdx].bullets]
    bullets[bulletIdx] = value
    update(expIdx, 'bullets', bullets)
  }

  return (
    <div>
      {experience.map((exp, i) => (
        <div key={exp.id} className="item-card">
          <div className="item-header">
            <span className="item-number">#{i + 1}</span>
            <button onClick={() => remove(i)} className="item-delete">×</button>
          </div>
          <div className="form-group">
            <label className="form-label">Job Title</label>
            <input type="text" value={exp.title} onChange={(e) => update(i, 'title', e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Company</label>
            <input type="text" value={exp.company} onChange={(e) => update(i, 'company', e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input type="text" value={exp.location ?? ''} onChange={(e) => update(i, 'location', e.target.value)} className="form-input" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="text" value={exp.startDate} onChange={(e) => update(i, 'startDate', e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input type="text" value={exp.endDate} onChange={(e) => update(i, 'endDate', e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Achievements</label>
            {exp.bullets.map((b, j) => (
              <div key={j} className="bullet-row">
                <span className="bullet-dot">›</span>
                <input
                  type="text"
                  value={b}
                  onChange={(e) => setBullet(i, j, e.target.value)}
                  placeholder="Action verb + Task + Outcome"
                  className="bullet-input"
                />
                <button onClick={() => removeBullet(i, j)} className="item-delete">×</button>
              </div>
            ))}
            <button onClick={() => addBullet(i)} className="add-btn">+ Add bullet</button>
          </div>
        </div>
      ))}
      <button onClick={add} className="add-btn">+ Add Experience</button>
    </div>
  )
}
