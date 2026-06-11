import { ExperienceItem } from '@/lib/resume-data'

interface ExperienceFormProps {
  experience: ExperienceItem[]
  onChange: (experience: ExperienceItem[]) => void
}

export function ExperienceForm({ experience, onChange }: ExperienceFormProps) {
  const update = (index: number, field: keyof ExperienceItem, value: string) => {
    const next = [...experience]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  const add = () => onChange([...experience, { id: `exp-${Date.now()}`, title: '', company: '', location: '', startDate: '', endDate: '', body: '' }])
  const remove = (index: number) => onChange(experience.filter((_, i) => i !== index))

  return (
    <div>
      {experience.map((exp, i) => (
        <div key={exp.id} className="item-card">
          <div className="item-header">
            <span className="item-number">#{i + 1}</span>
            <button type="button" onClick={() => remove(i)} className="item-delete" aria-label={`Remove experience ${i + 1}`}>×</button>
          </div>
          <div className="form-group">
            <label htmlFor={`exp-${exp.id}-title`} className="form-label">Job Title</label>
            <input id={`exp-${exp.id}-title`} type="text" value={exp.title} onChange={(e) => update(i, 'title', e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor={`exp-${exp.id}-company`} className="form-label">Company</label>
            <input id={`exp-${exp.id}-company`} type="text" value={exp.company} onChange={(e) => update(i, 'company', e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label htmlFor={`exp-${exp.id}-location`} className="form-label">Location</label>
            <input id={`exp-${exp.id}-location`} type="text" value={exp.location ?? ''} onChange={(e) => update(i, 'location', e.target.value)} className="form-input" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor={`exp-${exp.id}-startDate`} className="form-label">Start Date</label>
              <input id={`exp-${exp.id}-startDate`} type="text" value={exp.startDate} onChange={(e) => update(i, 'startDate', e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor={`exp-${exp.id}-endDate`} className="form-label">End Date</label>
              <input id={`exp-${exp.id}-endDate`} type="text" value={exp.endDate} onChange={(e) => update(i, 'endDate', e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor={`exp-${exp.id}-body`} className="form-label">Description & Achievements</label>
            <textarea
              id={`exp-${exp.id}-body`}
              value={exp.body}
              onChange={(e) => update(i, 'body', e.target.value)}
              rows={8}
              className="form-textarea markdown-textarea"
              placeholder={[
                'Write markdown. Example:',
                '',
                'Built **React** services for customer workflows.',
                '',
                '- Improved API response time by 40%',
                '  - Migrated hot paths to AWS Lambda',
                '    - Added dashboards for latency tracking',
              ].join('\n')}
            />
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="add-btn">+ Add Experience</button>
    </div>
  )
}
