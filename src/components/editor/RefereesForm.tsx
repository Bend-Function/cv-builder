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
      <div className="form-group">
        <label htmlFor="referees-mode" className="form-label">Display Mode</label>
        <select
          id="referees-mode"
          value={referees.mode}
          onChange={(e) => setMode(e.target.value as RefereesConfig['mode'])}
          className="form-select"
        >
          <option value="omit">Omit entirely</option>
          <option value="on-request">Available upon request</option>
          <option value="full">List referees</option>
        </select>
      </div>
      {referees.mode === 'full' && (
        <>
          {referees.list.map((ref, i) => (
            <div key={i} className="item-card">
              <div className="item-header">
                <span className="item-number">#{i + 1}</span>
                <button type="button" onClick={() => remove(i)} className="item-delete" aria-label={`Remove referee ${i + 1}`}>×</button>
              </div>
              <div className="form-group">
                <label htmlFor={`ref-${i}-name`} className="form-label">Name</label>
                <input id={`ref-${i}-name`} type="text" value={ref.name} onChange={(e) => update(i, 'name', e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor={`ref-${i}-title`} className="form-label">Title</label>
                <input id={`ref-${i}-title`} type="text" value={ref.title} onChange={(e) => update(i, 'title', e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor={`ref-${i}-organisation`} className="form-label">Organisation</label>
                <input id={`ref-${i}-organisation`} type="text" value={ref.organisation} onChange={(e) => update(i, 'organisation', e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor={`ref-${i}-contact`} className="form-label">Contact</label>
                <input id={`ref-${i}-contact`} type="text" value={ref.contact} onChange={(e) => update(i, 'contact', e.target.value)} className="form-input" />
              </div>
            </div>
          ))}
          <button type="button" onClick={add} className="add-btn">+ Add Referee</button>
        </>
      )}
    </div>
  )
}
