import { RefereesConfig } from '@/lib/resume-data'

export function Standard({ referees }: { referees: RefereesConfig }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Referees</div>
      {referees.mode === 'on-request' && (
        <p className="paper-referee-note">Available upon request</p>
      )}
      {referees.mode === 'full' &&
        referees.list.map((ref, i) => (
          <div key={i} className="paper-referee-item">
            <strong>{ref.name}</strong> — {ref.title}, {ref.organisation}
            <br />
            <span className="paper-referee-contact">{ref.contact}</span>
          </div>
        ))}
    </div>
  )
}

export function Functional({ referees }: { referees: RefereesConfig }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Referees</div>
      {referees.mode === 'on-request' && (
        <p className="paper-referee-note">Available upon request</p>
      )}
      {referees.mode === 'full' &&
        referees.list.map((ref, i) => (
          <div key={i} className="paper-referee-item">
            <strong>{ref.name}</strong> — {ref.title}, {ref.organisation}
            <br />
            <span className="paper-referee-contact">{ref.contact}</span>
          </div>
        ))}
    </div>
  )
}
