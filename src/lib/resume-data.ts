import { type ThemeId, DEFAULT_THEME } from './themes'
import { type LayoutConfig, defaultLayoutConfig } from './layout-config'

export interface ResumeMeta {
  version: number
  lastModified: string
  activeStyle: ThemeId
  layout: LayoutConfig
}

export interface Section {
  id: string
  enabled: boolean
  order: number
}

export interface Profile {
  type: 'paragraph' | 'bulletPoints'
  content: string
  bullets: string[]
}

export interface Contact {
  fullName: string
  city: string
  phone: string
  email: string
  linkedIn: string
  github: string
  portfolio: string
}

export interface SkillCategory {
  category: string
  items: string
}

export interface ExperienceItem {
  id: string
  title: string
  company: string
  location?: string
  startDate: string
  endDate: string
  body: string
  bullets?: string[]
}

export interface ProjectItem {
  id: string
  name: string
  context: string
  location?: string
  startDate: string
  endDate: string
  body: string
  bullets?: string[]
}

export interface EducationItem {
  id: string
  degree: string
  institution: string
  location: string
  startDate: string
  endDate: string
  details: string[]
}

export interface CertificationItem {
  id: string
  name: string
  issuer: string
  date: string
}

export interface Referee {
  name: string
  title: string
  organisation: string
  contact: string
}

export interface RefereesConfig {
  mode: 'omit' | 'on-request' | 'full'
  list: Referee[]
}

export interface ResumeData {
  meta: ResumeMeta
  sections: Section[]
  contact: Contact
  profile: Profile
  skills: SkillCategory[]
  experience: ExperienceItem[]
  projects: ProjectItem[]
  education: EducationItem[]
  certifications: CertificationItem[]
  referees: RefereesConfig
}

export const defaultSections: Section[] = [
  { id: 'contact', enabled: true, order: 0 },
  { id: 'profile', enabled: true, order: 1 },
  { id: 'skills', enabled: true, order: 2 },
  { id: 'experience', enabled: true, order: 3 },
  { id: 'projects', enabled: true, order: 4 },
  { id: 'education', enabled: true, order: 5 },
  { id: 'certifications', enabled: false, order: 6 },
  { id: 'referees', enabled: true, order: 7 },
]

export const defaultResumeData: ResumeData = {
  meta: {
    version: 2,
    lastModified: new Date().toISOString(),
    activeStyle: DEFAULT_THEME,
    layout: defaultLayoutConfig,
  },
  sections: [...defaultSections],
  contact: {
    fullName: 'Alex Chen',
    city: 'Sydney, NSW',
    phone: '0412 345 678',
    email: 'alex.chen@email.com',
    linkedIn: 'linkedin.com/in/alexchen',
    github: 'github.com/alexchen',
    portfolio: '',
  },
  profile: {
    type: 'paragraph',
    content: 'Final-year Computer Science student with a Distinction average. Full-stack development experience with React, Node.js and AWS. Passionate about building scalable web applications and seeking a graduate software engineering role in a dynamic tech team.',
    bullets: [
      'Final-year Computer Science student with a Distinction average',
      'Full-stack development experience with React, Node.js and AWS',
      'Passionate about building scalable web applications',
    ],
  },
  skills: [
    { category: 'Languages', items: 'JavaScript, TypeScript, Python, SQL' },
    { category: 'Frameworks', items: 'React, Next.js, Node.js, Express, Tailwind CSS' },
    { category: 'Cloud & DevOps', items: 'AWS (EC2, S3, Lambda), Docker, GitHub Actions, Vercel' },
    { category: 'Tools', items: 'Git, Figma, Jest, Cypress, MongoDB, PostgreSQL' },
  ],
  experience: [
    {
      id: 'exp-1',
      title: 'Software Engineering Intern',
      company: 'TechCorp, Sydney',
      location: 'Sydney, NSW',
      startDate: 'Dec 2024',
      endDate: 'Current',
      body: [
        '- Developed and deployed microservices using **Node.js** and AWS Lambda, reducing API response time by 40%',
        '- Collaborated with a team of 5 engineers to redesign the customer dashboard using React and TypeScript',
        '- Implemented automated testing with Jest and Cypress, increasing test coverage from 45% to 82%',
      ].join('\n'),
    },
    {
      id: 'exp-2',
      title: 'Junior Web Developer',
      company: 'Digital Studio, Melbourne',
      location: 'Melbourne, VIC',
      startDate: 'Jun 2024',
      endDate: 'Nov 2024',
      body: [
        '- Built responsive landing pages for 8+ clients using Next.js and Tailwind CSS',
        '- Integrated REST APIs and third-party services including Stripe and SendGrid',
        '  - Included Stripe and SendGrid workflows',
        '- Mentored two new interns on Git workflows and code review best practices',
      ].join('\n'),
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'E-Commerce Platform',
      context: 'Personal Project | MERN Stack',
      location: '',
      startDate: 'Aug 2024',
      endDate: 'Nov 2024',
      body: [
        'Personal project built to practice production-grade full-stack delivery.',
        '',
        '- Built full-stack e-commerce app with React, Node.js, MongoDB and Stripe payment integration',
        '- Implemented JWT authentication, role-based access control and admin dashboard',
        '- Deployed on Vercel and Render with CI/CD pipeline via GitHub Actions',
      ].join('\n'),
    },
    {
      id: 'proj-2',
      name: 'Real-Time Chat Application',
      context: 'UNSW | Team of 3',
      location: 'Sydney, NSW',
      startDate: 'Mar 2024',
      endDate: 'Jun 2024',
      body: [
        '- Developed real-time messaging app using Socket.io, React and Express with 200+ concurrent users',
        '- Designed MongoDB schema for message threads, user presence and read receipts',
        '- Achieved Distinction grade; praised for clean architecture and comprehensive documentation',
      ].join('\n'),
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'Bachelor of Computer Science',
      institution: 'UNSW Sydney',
      location: 'Sydney, NSW',
      startDate: '2022',
      endDate: 'Expected Nov 2025',
      details: ['Distinction average (WAM: 78)', "Dean's Honour List 2023", 'Major in Software Engineering'],
    },
  ],
  certifications: [],
  referees: {
    mode: 'on-request',
    list: [
      { name: 'Sarah Mitchell', title: 'Engineering Manager', organisation: 'TechCorp, Sydney', contact: 'sarah.mitchell@techcorp.com' },
      { name: 'Dr. James Wong', title: 'Senior Lecturer', organisation: 'UNSW Sydney', contact: 'j.wong@unsw.edu.au' },
    ],
  },
}
