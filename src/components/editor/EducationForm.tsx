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
        <div key={edu.id} className="bg-workspace border border-border-subtle rounded-md p-4 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-serif text-[11px] font-semibold text-accent tracking-wide">#{i + 1}</span>
            <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
          </div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Degree</label><input type="text" value={edu.degree} onChange={(e) => update(i, 'degree', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Institution</label><input type="text" value={edu.institution} onChange={(e) => update(i, 'institution', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Location</label><input type="text" value={edu.location} onChange={(e) => update(i, 'location', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Start Date</label><input type="text" value={edu.startDate} onChange={(e) => update(i, 'startDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">End Date</label><input type="text" value={edu.endDate} onChange={(e) => update(i, 'endDate', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Details</label>
            {edu.details.map((d, j) => (
              <div key={j} className="flex items-start gap-1 mb-1">
                <span className="text-accent mt-1.5 text-sm shrink-0">›</span>
                <input type="text" value={d} onChange={(e) => setDetail(i, j, e.target.value)} className="flex-1 bg-transparent border-b border-border-subtle text-text-primary text-sm py-1 outline-none focus:border-accent-dim placeholder-text-muted placeholder-italic" />
                <button onClick={() => removeDetail(i, j)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors">×</button>
              </div>
            ))}
            <button onClick={() => addDetail(i)} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 mt-1 hover:bg-accent/10 transition-colors">+ Add detail</button>
          </div>
        </div>
      ))}
      <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Education</button>
    </div>
  )
}
