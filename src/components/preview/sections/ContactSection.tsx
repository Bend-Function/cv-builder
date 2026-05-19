import { Contact } from '@/lib/resume-data'

export function Standard({ contact }: { contact: Contact }) {
  const contactParts = [contact.city, contact.phone, contact.email, contact.linkedIn, contact.github].filter(Boolean)

  return (
    <div style={{ textAlign: 'center', marginBottom: '14pt' }}>
      <h1 className="paper-name">{contact.fullName || 'Your Name'}</h1>
      <div className="paper-contact">{contactParts.join(' | ')}</div>
    </div>
  )
}

export function Functional({ contact }: { contact: Contact }) {
  return (
    <div className="paper-contact-block--functional">
      <h1 className="paper-name">{contact.fullName || 'Your Name'}</h1>
      <div className="paper-contact--stack">
        {[contact.city, contact.phone, contact.email, contact.linkedIn, contact.github, contact.portfolio]
          .filter(Boolean)
          .map((line, i) => <div key={i}>{line}</div>)}
      </div>
    </div>
  )
}
