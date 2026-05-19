import { Profile } from '@/lib/resume-data'

export function Standard({ profile }: { profile: Profile }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Profile</div>
      {profile.type === 'paragraph' ? (
        <p style={{ fontSize: '9.5pt', margin: 0 }}>{profile.content}</p>
      ) : (
        <ul className="paper-bullets">
          {profile.bullets.filter(Boolean).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Functional({ profile }: { profile: Profile }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Profile</div>
      {profile.type === 'paragraph' ? (
        <p style={{ fontSize: '9.5pt', margin: 0 }}>{profile.content}</p>
      ) : (
        <ul className="paper-bullets">
          {profile.bullets.filter(Boolean).map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
