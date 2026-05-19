import { SkillCategory } from '@/lib/resume-data'

export function Standard({ skills }: { skills: SkillCategory[] }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Technical Skills</div>
      {skills.map((skill, i) =>
        skill.category && skill.items ? (
          <div key={i} className="paper-skill-row">
            <strong>{skill.category}:</strong> {skill.items}
          </div>
        ) : null
      )}
    </div>
  )
}

export function Functional({ skills }: { skills: SkillCategory[] }) {
  return (
    <div className="paper-section">
      <div className="paper-section-title">Technical Skills</div>
      {skills.map((skill, i) =>
        skill.category && skill.items ? (
          <div key={i} className="paper-skill-row">
            <strong>{skill.category}:</strong> {skill.items}
          </div>
        ) : null
      )}
    </div>
  )
}
