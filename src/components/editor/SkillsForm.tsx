import { SkillCategory } from '@/lib/resume-data'

interface SkillsFormProps {
  skills: SkillCategory[]
  onChange: (skills: SkillCategory[]) => void
}

export function SkillsForm({ skills, onChange }: SkillsFormProps) {
  const update = (index: number, field: keyof SkillCategory, value: string) => {
    const next = [...skills]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  const add = () => onChange([...skills, { category: 'New Category', items: '' }])
  const remove = (index: number) => onChange(skills.filter((_, i) => i !== index))

  return (
    <div>
      {skills.map((skill, i) => (
        <div key={i} className="item-card">
          <div className="item-header">
            <span className="item-number">#{i + 1}</span>
            <button type="button" onClick={() => remove(i)} className="item-delete" aria-label={`Remove skill category ${i + 1}`}>×</button>
          </div>
          <div className="form-group">
            <label htmlFor={`skill-${i}-category`} className="form-label">Category</label>
            <input
              id={`skill-${i}-category`}
              type="text"
              value={skill.category}
              onChange={(e) => update(i, 'category', e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor={`skill-${i}-items`} className="form-label">Skills (comma-separated)</label>
            <input
              id={`skill-${i}-items`}
              type="text"
              value={skill.items}
              onChange={(e) => update(i, 'items', e.target.value)}
              className="form-input"
            />
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="add-btn">+ Add Category</button>
    </div>
  )
}
