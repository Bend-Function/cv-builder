import { ResumeData } from '@/lib/resume-data'

interface ResumeRendererProps {
  data: ResumeData
}

export function ResumeRenderer({ data }: ResumeRendererProps) {
  const { contact, profile, skills, experience, projects, education, certifications, referees, sections } = data

  const isEnabled = (id: string) => sections.find((s) => s.id === id)?.enabled ?? true

  const contactParts = [contact.city, contact.phone, contact.email, contact.linkedIn, contact.github].filter(Boolean)

  return (
    <div>
      {isEnabled('contact') && (
        <div style={{ textAlign: 'center', marginBottom: '14pt' }}>
          <h1 className="paper-name">{contact.fullName || 'Your Name'}</h1>
          <div className="paper-contact">{contactParts.join(' | ')}</div>
        </div>
      )}

      {isEnabled('profile') && (
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
      )}

      {isEnabled('skills') && skills.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">Technical Skills</div>
          {skills.map((skill, i) =>
            skill.category && skill.items ? (
              <div key={i} style={{ marginBottom: '3pt', fontSize: '9.5pt' }}>
                <strong>{skill.category}:</strong> {skill.items}
              </div>
            ) : null
          )}
        </div>
      )}

      {isEnabled('experience') && experience.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">Work Experience</div>
          {experience.map((exp) => (
            <div key={exp.id}>
              <div className="paper-item-header">
                <div>
                  <span className="paper-item-title">{exp.title}</span>{' '}
                  <span className="paper-item-subtitle">| {exp.company}</span>
                </div>
                <span className="paper-item-date">
                  {exp.startDate} – {exp.endDate}
                </span>
              </div>
              {exp.bullets.length > 0 && (
                <ul className="paper-bullets">
                  {exp.bullets.filter(Boolean).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {isEnabled('projects') && projects.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">Selected Projects</div>
          {projects.map((proj) => (
            <div key={proj.id}>
              <div className="paper-item-header">
                <div>
                  <span className="paper-item-title">{proj.name}</span>{' '}
                  <span className="paper-item-subtitle">| {proj.context}</span>
                </div>
                <span className="paper-item-date">
                  {proj.startDate} – {proj.endDate}
                </span>
              </div>
              {proj.bullets.length > 0 && (
                <ul className="paper-bullets">
                  {proj.bullets.filter(Boolean).map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {isEnabled('education') && education.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">Education</div>
          {education.map((edu) => (
            <div key={edu.id}>
              <div className="paper-item-header">
                <div>
                  <span className="paper-item-title">{edu.degree}</span>
                </div>
                <span className="paper-item-date">
                  {edu.startDate} – {edu.endDate}
                </span>
              </div>
              <div className="paper-item-subtitle" style={{ marginBottom: '2pt' }}>
                {edu.institution}
                {edu.location ? `, ${edu.location}` : ''}
              </div>
              {edu.details.length > 0 && (
                <ul className="paper-bullets">
                  {edu.details.filter(Boolean).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {isEnabled('certifications') && certifications.length > 0 && (
        <div className="paper-section">
          <div className="paper-section-title">Certifications</div>
          {certifications.map((cert) => (
            <div key={cert.id} style={{ fontSize: '9.5pt', marginBottom: '2pt' }}>
              <strong>{cert.name}</strong> — {cert.issuer}
              {cert.date ? `, ${cert.date}` : ''}
            </div>
          ))}
        </div>
      )}

      {isEnabled('referees') && (
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
      )}
    </div>
  )
}
