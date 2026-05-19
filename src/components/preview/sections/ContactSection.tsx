import { Contact } from '@/lib/resume-data'

function toHref(value: string, type: 'email' | 'url'): string | null {
  if (!value) return null
  if (type === 'email') return `mailto:${value}`
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function ContactLink({ value, type }: { value: string; type: 'email' | 'url' }) {
  const href = toHref(value, type)
  if (!href) return <>{value}</>
  return <a href={href}>{value}</a>
}

export function Standard({ contact }: { contact: Contact }) {
  const parts: React.ReactNode[] = []

  if (contact.city) parts.push(contact.city)
  if (contact.phone) parts.push(contact.phone)
  if (contact.email) parts.push(<ContactLink key="email" value={contact.email} type="email" />)
  if (contact.linkedIn) parts.push(<ContactLink key="linkedin" value={contact.linkedIn} type="url" />)
  if (contact.github) parts.push(<ContactLink key="github" value={contact.github} type="url" />)
  if (contact.portfolio) parts.push(<ContactLink key="portfolio" value={contact.portfolio} type="url" />)

  const children: React.ReactNode[] = []
  parts.forEach((part, i) => {
    if (i > 0) children.push(' | ')
    children.push(part)
  })

  return (
    <div className="paper-contact-wrapper">
      <h1 className="paper-name">{contact.fullName || 'Your Name'}</h1>
      <div className="paper-contact">{children}</div>
    </div>
  )
}

export function Functional({ contact }: { contact: Contact }) {
  const lines: React.ReactNode[] = []

  if (contact.city) lines.push(contact.city)
  if (contact.phone) lines.push(contact.phone)
  if (contact.email) lines.push(<ContactLink key="email" value={contact.email} type="email" />)
  if (contact.linkedIn) lines.push(<ContactLink key="linkedin" value={contact.linkedIn} type="url" />)
  if (contact.github) lines.push(<ContactLink key="github" value={contact.github} type="url" />)
  if (contact.portfolio) lines.push(<ContactLink key="portfolio" value={contact.portfolio} type="url" />)

  return (
    <div className="paper-contact-block--functional">
      <h1 className="paper-name">{contact.fullName || 'Your Name'}</h1>
      <div className="paper-contact--stack">
        {lines.map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  )
}
