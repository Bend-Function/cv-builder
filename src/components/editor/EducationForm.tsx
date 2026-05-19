import { EducationItem } from '@/lib/resume-data'

interface EducationFormProps {
  education: EducationItem[]
  onChange: (education: EducationItem[]) => void
}

export function EducationForm({ education, onChange }: EducationFormProps) {
  const update = (index: number, field: keyof EducationItem, value: string | string[]) => {
    const next = [...education]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }
  const add = () => onChange([...education, { id: `edu-${Date.now()}`, degree: '', institution: '', location: '', startDate: '', endDate: '', details: [''] }])
  const remove = (index: number) => onChange(education.filter((_, i) => i !== index))
  const addDetail = (index: number) => update(index, 'details', [...education[index].details, ''])
  const removeDetail = (eduIdx: number, detailIdx: number) => update(eduIdx, 'details', education[eduIdx].details.filter((_, i) => i !== detailIdx))
  const setDetail = (eduIdx: number, detailIdx: number, value: string) => {
    const details = [...education[eduIdx].details]
    details[detailIdx] = value
    update(eduIdx, 'details', details)
  }

  return (
    <div>
      {education.map((edu, i) => (
        <div key={edu.id} className="item-card">
          <div className="item-header">
            <span className="item-number">#{i + 1}</span>
            <button onClick={() => remove(i)} className="item-delete">×</button>
          </div>
          <div className="form-group">
            <label className="form-label">Degree</label>
            <input type="text" value={edu.degree} onChange={(e) => update(i, 'degree', e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Institution</label>
            <input type="text" value={edu.institution} onChange={(e) => update(i, 'institution', e.target.value)} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input type="text" value={edu.location} onChange={(e) => update(i, 'location', e.target.value)} className="form-input" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="text" value={edu.startDate} onChange={(e) => update(i, 'startDate', e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input type="text" value={edu.endDate} onChange={(e) => update(i, 'endDate', e.target.value)} className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Details</label>
            {edu.details.map((d, j) => (
              <div key={j} className="bullet-row">
                <span className="bullet-dot">›</span>
                <input type="text" value={d} onChange={(e) => setDetail(i, j, e.target.value)} className="bullet-input" />
                <button onClick={() => removeDetail(i, j)} className="item-delete">×</button>
              </div>
            ))}
            <button onClick={() => addDetail(i)} className="add-btn">+ Add detail</button>
          </div>
        </div>
      ))}
      <button onClick={add} className="add-btn">+ Add Education</button>
    </div>
  )
}
