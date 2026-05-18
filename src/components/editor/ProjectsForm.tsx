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
        <div key={proj.id} className="bg-workspace border border-border-subtle rounded-md p-4 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-serif text-[11px] font-semibold text-accent tracking-wide">#{i + 1}</span>
            <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
          </div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Project Name</label><input type="text" value={proj.name} onChange={(e) => update(i, 'name', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Context</label><input type="text" value={proj.context} onChange={(e) => update(i, 'context', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Start Date</label><input type="text" value={proj.startDate} onChange={(e) => update(i, 'startDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">End Date</label><input type="text" value={proj.endDate} onChange={(e) => update(i, 'endDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Description</label>
            {proj.bullets.map((b, j) => (
              <div key={j} className="flex items-start gap-1 mb-1">
                <span className="text-accent mt-1.5 text-sm shrink-0">›</span>
                <input type="text" value={b} onChange={(e) => setBullet(i, j, e.target.value)} className="flex-1 bg-transparent border-b border-border-subtle text-text-primary text-sm py-1 outline-none focus:border-accent-dim placeholder-text-muted placeholder-italic" />
                <button onClick={() => removeBullet(i, j)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors">×</button>
              </div>
            ))}
            <button onClick={() => addBullet(i)} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 mt-1 hover:bg-accent/10 transition-colors">+ Add bullet</button>
          </div>
        </div>
      ))}
      <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Project</button>
    </div>
  )
}
