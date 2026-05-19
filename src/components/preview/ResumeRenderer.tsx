import { Fragment } from 'react'
import { ResumeData } from '@/lib/resume-data'

interface ResumeRendererProps {
  data: ResumeData
}

export function ResumeRenderer({ data }: ResumeRendererProps) {
  const { contact, profile, skills, experience, projects, education, certifications, referees, sections } = data

  const isFunctional = data.meta.activeStyle === 'functional'

  const isEnabled = (id: string) => sections.find((s) => s.id === id)?.enabled ?? true

  const contactParts = [contact.city, contact.phone, contact.email, contact.linkedIn, contact.github].filter(Boolean)

  const sectionMap: Record<string, React.ReactNode> = {
    contact: isEnabled('contact') && (
      isFunctional ? (
        <div className="paper-contact-block--functional">
          <h1 className="paper-name">{contact.fullName || 'Your Name'}</h1>
          <div className="paper-contact--stack">
            {[contact.city, contact.phone, contact.email, contact.linkedIn, contact.github, contact.portfolio]
              .filter(Boolean)
              .map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginBottom: '14pt' }}>
          <h1 className="paper-name">{contact.fullName || 'Your Name'}</h1>
          <div className="paper-contact">{contactParts.join(' | ')}</div>
        </div>
      )
    ),
    profile: isEnabled('profile') && (
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
    ),
    skills: isEnabled('skills') && skills.length > 0 && (
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
    ),
    experience: isEnabled('experience') && experience.length > 0 && (
      <div className="paper-section">
        <div className="paper-section-title">Work Experience</div>
        {experience.map((exp) => (
          isFunctional ? (
            <div key={exp.id} className="paper-item--functional">
              <div className="paper-item-meta">
                <div className="paper-item-org">{exp.company}</div>
                {exp.location && <div className="paper-item-location">{exp.location}</div>}
                <div className="paper-item-date">{exp.startDate} – {exp.endDate}</div>
              </div>
              <div className="paper-item-content">
                <div className="paper-item-role">{exp.title}</div>
                {exp.bullets.length > 0 && (
                  <ul className="paper-bullets">
                    {exp.bullets.filter(Boolean).map((b, i) => (<li key={i}>{b}</li>))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
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
          )
        ))}
      </div>
    ),
    projects: isEnabled('projects') && projects.length > 0 && (
      <div className="paper-section">
        <div className="paper-section-title">Selected Projects</div>
        {projects.map((proj) => (
          isFunctional ? (
            <div key={proj.id} className="paper-item--functional">
              <div className="paper-item-meta">
                <div className="paper-item-org">{proj.name}</div>
                {proj.location && <div className="paper-item-location">{proj.location}</div>}
                <div className="paper-item-date">{proj.startDate} – {proj.endDate}</div>
              </div>
              <div className="paper-item-content">
                <div className="paper-item-role">{proj.context}</div>
                {proj.bullets.length > 0 && (
                  <ul className="paper-bullets">
                    {proj.bullets.filter(Boolean).map((b, i) => (<li key={i}>{b}</li>))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
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
          )
        ))}
      </div>
    ),
    education: isEnabled('education') && education.length > 0 && (
      <div className="paper-section">
        <div className="paper-section-title">Education</div>
        {education.map((edu) => (
          isFunctional ? (
            <div key={edu.id} className="paper-item--functional">
              <div className="paper-item-meta">
                <div className="paper-item-org">{edu.institution}</div>
                {edu.location && <div className="paper-item-location">{edu.location}</div>}
                <div className="paper-item-date">{edu.startDate} – {edu.endDate}</div>
              </div>
              <div className="paper-item-content">
                <div className="paper-item-role">{edu.degree}</div>
                {edu.details.length > 0 && (
                  <ul className="paper-bullets">
                    {edu.details.filter(Boolean).map((d, i) => (<li key={i}>{d}</li>))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
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
          )
        ))}
      </div>
    ),
    certifications: isEnabled('certifications') && certifications.length > 0 && (
      <div className="paper-section">
        <div className="paper-section-title">Certifications</div>
        {certifications.map((cert) => (
          isFunctional ? (
            <div key={cert.id} className="paper-item--functional">
              <div className="paper-item-meta">
                <div className="paper-item-org">{cert.issuer}</div>
                {cert.date && <div className="paper-item-date">{cert.date}</div>}
              </div>
              <div className="paper-item-content">
                <div className="paper-item-role">{cert.name}</div>
              </div>
            </div>
          ) : (
            <div key={cert.id} style={{ fontSize: '9.5pt', marginBottom: '2pt' }}>
              <strong>{cert.name}</strong> — {cert.issuer}
              {cert.date ? `, ${cert.date}` : ''}
            </div>
          )
        ))}
      </div>
    ),
    referees: isEnabled('referees') && (
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
    ),
  }

  return (
    <div>
      {sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <Fragment key={section.id}>{sectionMap[section.id]}</Fragment>
        ))}
      {isFunctional && (contact.fullName || contact.phone || contact.email) && (
        <div className="paper-footer">
          {[contact.fullName, contact.phone, contact.email].filter(Boolean).join(' | ')}
        </div>
      )}
    </div>
  )
}
