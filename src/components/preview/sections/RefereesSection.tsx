import { RefereesConfig } from '@/lib/resume-data'

export function Standard({ referees }: { referees: RefereesConfig }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Referees</div>
      {referees.mode === 'on-request' && (
        <p style={{ fontSize: '9.5pt', margin: 0, fontStyle: 'italic' }}>Available upon request</p>
      )}
      {referees.mode === 'full' &&
        referees.list.map((ref, i) => (
          <div key={i} style={{ fontSize: '9.5pt', marginBottom: '4pt' }}>
            <strong>{ref.name}</strong> — {ref.title}, {ref.organisation}
            <br />
            <span style={{ color: '#555' }}>{ref.contact}</span>
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
        <p style={{ fontSize: '9.5pt', margin: 0, fontStyle: 'italic' }}>Available upon request</p>
      )}
      {referees.mode === 'full' &&
        referees.list.map((ref, i) => (
          <div key={i} style={{ fontSize: '9.5pt', marginBottom: '4pt' }}>
            <strong>{ref.name}</strong> — {ref.title}, {ref.organisation}
            <br />
            <span style={{ color: '#555' }}>{ref.contact}</span>
          </div>
        ))}
    </div>
  )
}
