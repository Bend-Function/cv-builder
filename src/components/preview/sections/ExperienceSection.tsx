import { ExperienceItem } from '@/lib/resume-data'
import { MarkdownBody } from '../MarkdownBody'

export function Standard({ experience }: { experience: ExperienceItem[] }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Work Experience</div>
      {experience.map((exp) => (
        <div key={exp.id}>
          <div className="paper-item-header">
            <div>
              <span className="paper-item-title">{exp.title}</span>{' '}
              <span className="paper-item-subtitle">
                | {exp.company}
                {exp.location ? ` | ${exp.location}` : ''}
              </span>
            </div>
            <span className="paper-item-date">
              {exp.startDate} – {exp.endDate}
            </span>
          </div>
          <MarkdownBody text={exp.body} />
        </div>
      ))}
    </div>
  )
}

export function Functional({ experience }: { experience: ExperienceItem[] }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Work Experience</div>
      {experience.map((exp) => (
        <div key={exp.id} className="paper-item--functional">
          <div className="paper-item-meta">
            <div className="paper-item-org">{exp.company}</div>
            {exp.location && <div className="paper-item-location">{exp.location}</div>}
            <div className="paper-item-date">{exp.startDate} – {exp.endDate}</div>
          </div>
          <div className="paper-item-content">
            <div className="paper-item-role">{exp.title}</div>
            <MarkdownBody text={exp.body} />
          </div>
        </div>
      ))}
    </div>
  )
}
