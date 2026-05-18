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
        <div key={i} className="mb-4 pb-4 border-b border-border-subtle last:border-0 last:mb-0 last:pb-0">
          <div className="mb-2">
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Category</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skill.category}
                onChange={(e) => update(i, 'category', e.target.value)}
                className="flex-1 px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim"
              />
              <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Skills (comma-separated)</label>
            <input
              type="text"
              value={skill.items}
              onChange={(e) => update(i, 'items', e.target.value)}
              className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim"
            />
          </div>
        </div>
      ))}
      <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Category</button>
    </div>
  )
}
