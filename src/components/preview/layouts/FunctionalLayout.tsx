import { Fragment } from 'react'
import { ResumeData } from '@/lib/resume-data'
import { Functional as ContactSection } from '../sections/ContactSection'
import { Functional as ProfileSection } from '../sections/ProfileSection'
import { Functional as SkillsSection } from '../sections/SkillsSection'
import { Functional as ExperienceSection } from '../sections/ExperienceSection'
import { Functional as ProjectsSection } from '../sections/ProjectsSection'
import { Functional as EducationSection } from '../sections/EducationSection'
import { Functional as CertificationsSection } from '../sections/CertificationsSection'
import { Functional as RefereesSection } from '../sections/RefereesSection'

export function FunctionalLayout({ data }: { data: ResumeData }) {
  const { contact, profile, skills, experience, projects, education, certifications, referees, sections } = data

  const sectionComponents: Record<string, React.ReactNode> = {
    contact: <ContactSection contact={contact} />,
    profile: <ProfileSection profile={profile} />,
    skills: skills.length > 0 ? <SkillsSection skills={skills} /> : null,
    experience: experience.length > 0 ? <ExperienceSection experience={experience} /> : null,
    projects: projects.length > 0 ? <ProjectsSection projects={projects} /> : null,
    education: education.length > 0 ? <EducationSection education={education} /> : null,
    certifications: certifications.length > 0 ? <CertificationsSection certifications={certifications} /> : null,
    referees: <RefereesSection referees={referees} />,
  }

  return (
    <div>
      {sections
        .filter((s) => s.enabled)
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <Fragment key={section.id}>{sectionComponents[section.id]}</Fragment>
        ))}
      {(contact.fullName || contact.phone || contact.email) && (
        <div className="paper-footer">
          {[contact.fullName, contact.phone, contact.email].filter(Boolean).join(' | ')}
        </div>
      )}
    </div>
  )
}
