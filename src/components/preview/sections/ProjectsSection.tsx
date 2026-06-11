import { ProjectItem } from '@/lib/resume-data'
import { MarkdownBody } from '../MarkdownBody'

export function Standard({ projects }: { projects: ProjectItem[] }) {
  return (
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
          <MarkdownBody text={proj.body} />
        </div>
      ))}
    </div>
  )
}

export function Functional({ projects }: { projects: ProjectItem[] }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Selected Projects</div>
      {projects.map((proj) => (
        <div key={proj.id} className="paper-item--functional">
          <div className="paper-item-meta">
            <div className="paper-item-org">{proj.name}</div>
            {proj.location && <div className="paper-item-location">{proj.location}</div>}
            <div className="paper-item-date">{proj.startDate} – {proj.endDate}</div>
          </div>
          <div className="paper-item-content">
            <div className="paper-item-role">{proj.context}</div>
            <MarkdownBody text={proj.body} />
          </div>
        </div>
      ))}
    </div>
  )
}
