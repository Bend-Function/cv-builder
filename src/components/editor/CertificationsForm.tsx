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
        <div key={cert.id} className="bg-workspace border border-border-subtle rounded-md p-4 mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-serif text-[11px] font-semibold text-accent tracking-wide">#{i + 1}</span>
            <button onClick={() => remove(i)} className="text-text-muted hover:text-red-400 p-1 rounded transition-colors text-lg">×</button>
          </div>
          <div className="mb-2"><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Certification Name</label><input type="text" value={cert.name} onChange={(e) => update(i, 'name', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Issuer</label><input type="text" value={cert.issuer} onChange={(e) => update(i, 'issuer', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
            <div><label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">Date</label><input type="text" value={cert.date} onChange={(e) => update(i, 'date', e.target.value)} className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim" /></div>
          </div>
        </div>
      ))}
      <button onClick={add} className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 hover:bg-accent/10 transition-colors">+ Add Certification</button>
    </div>
  )
}
