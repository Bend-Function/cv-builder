import { CertificationItem } from '@/lib/resume-data'

export function Standard({ certifications }: { certifications: CertificationItem[] }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Certifications</div>
      {certifications.map((cert) => (
        <div key={cert.id} style={{ fontSize: '9.5pt', marginBottom: '2pt' }}>
          <strong>{cert.name}</strong> — {cert.issuer}
          {cert.date ? `, ${cert.date}` : ''}
        </div>
      ))}
    </div>
  )
}

export function Functional({ certifications }: { certifications: CertificationItem[] }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Certifications</div>
      {certifications.map((cert) => (
        <div key={cert.id} className="paper-item--functional">
          <div className="paper-item-meta">
            <div className="paper-item-org">{cert.issuer}</div>
            {cert.date && <div className="paper-item-date">{cert.date}</div>}
          </div>
          <div className="paper-item-content">
            <div className="paper-item-role">{cert.name}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
