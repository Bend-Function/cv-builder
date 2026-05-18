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
        <div key={exp.id} className="bg-workspace border border-border-subtle rounded-md p-4 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-serif text-[11px] font-semibold text-accent tracking-wide">#{i + 1}</span>
            <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
          </div>
          <div className="mb-2">
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Job Title</label>
            <input type="text" value={exp.title} onChange={(e) => update(i, 'title', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" />
          </div>
          <div className="mb-2">
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Company</label>
            <input type="text" value={exp.company} onChange={(e) => update(i, 'company', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Start Date</label>
              <input type="text" value={exp.startDate} onChange={(e) => update(i, 'startDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">End Date</label>
              <input type="text" value={exp.endDate} onChange={(e) => update(i, 'endDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Achievements</label>
            {exp.bullets.map((b, j) => (
              <div key={j} className="flex items-start gap-1 mb-1">
                <span className="text-accent mt-1.5 text-sm shrink-0">›</span>
                <input type="text" value={b} onChange={(e) => setBullet(i, j, e.target.value)} placeholder="Action verb + Task + Outcome" className="flex-1 bg-transparent border-b border-border-subtle text-text-primary text-sm py-1 outline-none focus:border-accent-dim placeholder-text-muted placeholder-italic" />
                <button onClick={() => removeBullet(i, j)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors">×</button>
              </div>
            ))}
            <button onClick={() => addBullet(i)} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 mt-1 hover:bg-accent/10 transition-colors">+ Add bullet</button>
          </div>
        </div>
      ))}
      <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Experience</button>
    </div>
  )
}
