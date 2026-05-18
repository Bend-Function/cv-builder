import { RefereesConfig } from '@/lib/resume-data'

interface RefereesFormProps {
  referees: RefereesConfig
  onChange: (referees: RefereesConfig) => void
}

export function RefereesForm({ referees, onChange }: RefereesFormProps) {
  const setMode = (mode: RefereesConfig['mode']) => onChange({ ...referees, mode })
  const add = () => onChange({ ...referees, list: [...referees.list, { name: '', title: '', organisation: '', contact: '' }] })
  const remove = (index: number) => onChange({ ...referees, list: referees.list.filter((_, i) => i !== index) })
  const update = (index: number, field: keyof RefereesConfig['list'][0], value: string) => {
    const list = [...referees.list]
    list[index] = { ...list[index], [field]: value }
    onChange({ ...referees, list })
  }

  return (
    <div>
      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Display Mode</label>
        <select
          value={referees.mode}
          onChange={(e) => setMode(e.target.value as RefereesConfig['mode'])}
          className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim appearance-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236a7080' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '32px' }}
        >
          <option value="omit">Omit entirely</option>
          <option value="on-request">Available upon request</option>
          <option value="full">List referees</option>
        </select>
      </div>
      {referees.mode === 'full' && (
        <>
          {referees.list.map((ref, i) => (
            <div key={i} className="bg-workspace border border-border-subtle rounded-md p-4 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-serif text-[11px] font-semibold text-accent tracking-wide">#{i + 1}</span>
                <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
              </div>
              <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Name</label><input type="text" value={ref.name} onChange={(e) => update(i, 'name', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
              <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Title</label><input type="text" value={ref.title} onChange={(e) => update(i, 'title', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
              <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Organisation</label><input type="text" value={ref.organisation} onChange={(e) => update(i, 'organisation', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
              <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Contact</label><input type="text" value={ref.contact} onChange={(e) => update(i, 'contact', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
            </div>
          ))}
          <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Referee</button>
        </>
      )}
    </div>
  )
}
