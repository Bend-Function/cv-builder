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
            <button onClick={() => remove(i)} className="item-delete">×</button>
          </div>
          <div className="form-group">
            <label className="form-label">Certification Name</label>
            <input type="text" value={cert.name} onChange={(e) => update(i, 'name', e.target.value)} className="form-input" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Issuer</label>
              <input type="text" value={cert.issuer} onChange={(e) => update(i, 'issuer', e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="text" value={cert.date} onChange={(e) => update(i, 'date', e.target.value)} className="form-input" />
            </div>
          </div>
        </div>
      ))}
      <button onClick={add} className="add-btn">+ Add Certification</button>
    </div>
  )
}
