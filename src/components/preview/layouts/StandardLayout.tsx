import { Fragment } from 'react'
import { ResumeData } from '@/lib/resume-data'
import { Standard as ContactSection } from '../sections/ContactSection'
import { Standard as ProfileSection } from '../sections/ProfileSection'
import { Standard as SkillsSection } from '../sections/SkillsSection'
import { Standard as ExperienceSection } from '../sections/ExperienceSection'
import { Standard as ProjectsSection } from '../sections/ProjectsSection'
import { Standard as EducationSection } from '../sections/EducationSection'
import { Standard as CertificationsSection } from '../sections/CertificationsSection'
import { Standard as RefereesSection } from '../sections/RefereesSection'

export function StandardLayout({ data }: { data: ResumeData }) {
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
    </div>
  )
}
