import { CertificationItem } from '@/lib/resume-data'

interface CertificationsFormProps {
  certifications: CertificationItem[]
  onChange: (certifications: CertificationItem[]) => void
}

export function CertificationsForm({ certifications, onChange }: CertificationsFormProps) {
  const update = (index: number, field: keyof CertificationItem, value: string) => {
    const next = [...certifications]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }
  const add = () => onChange([...certifications, { id: `cert-${Date.now()}`, name: '', issuer: '', date: '' }])
  const remove = (index: number) => onChange(certifications.filter((_, i) => i !== index))

  return (
    <div>
      {certifications.map((cert, i) => (
        <div key={cert.id} className="item-card">
          <div className="item-header">
            <span className="item-number">#{i + 1}</span>
            <button type="button" onClick={() => remove(i)} className="item-delete" aria-label={`Remove certification ${i + 1}`}>×</button>
          </div>
          <div className="form-group">
            <label htmlFor={`cert-${cert.id}-name`} className="form-label">Certification Name</label>
            <input id={`cert-${cert.id}-name`} type="text" value={cert.name} onChange={(e) => update(i, 'name', e.target.value)} className="form-input" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor={`cert-${cert.id}-issuer`} className="form-label">Issuer</label>
              <input id={`cert-${cert.id}-issuer`} type="text" value={cert.issuer} onChange={(e) => update(i, 'issuer', e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor={`cert-${cert.id}-date`} className="form-label">Date</label>
              <input id={`cert-${cert.id}-date`} type="text" value={cert.date} onChange={(e) => update(i, 'date', e.target.value)} className="form-input" />
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="add-btn">+ Add Certification</button>
    </div>
  )
}
