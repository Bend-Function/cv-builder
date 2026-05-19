import { EducationItem } from '@/lib/resume-data'

export function Standard({ education }: { education: EducationItem[] }) {
  return (
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
          <div className="paper-item-subtitle paper-edu-subtitle">
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
  )
}

export function Functional({ education }: { education: EducationItem[] }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Education</div>
      {education.map((edu) => (
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
                {edu.details.filter(Boolean).map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
