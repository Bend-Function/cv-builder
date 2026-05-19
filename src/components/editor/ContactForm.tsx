import { Contact } from '@/lib/resume-data'

interface ContactFormProps {
  contact: Contact
  onChange: (contact: Contact) => void
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input"
      />
    </div>
  )
}

export function ContactForm({ contact, onChange }: ContactFormProps) {
  const update = (field: keyof Contact, value: string) => {
    onChange({ ...contact, [field]: value })
  }

  return (
    <div>
      <Field label="Full Name" value={contact.fullName} onChange={(v) => update('fullName', v)} placeholder="Alex Chen" />
      <div className="form-row">
        <Field label="City" value={contact.city} onChange={(v) => update('city', v)} placeholder="Sydney, NSW" />
        <Field label="Phone" value={contact.phone} onChange={(v) => update('phone', v)} placeholder="0412 345 678" />
      </div>
      <Field label="Email" value={contact.email} onChange={(v) => update('email', v)} placeholder="alex.chen@email.com" />
      <Field label="LinkedIn" value={contact.linkedIn} onChange={(v) => update('linkedIn', v)} placeholder="linkedin.com/in/alexchen" />
      <Field label="GitHub" value={contact.github} onChange={(v) => update('github', v)} placeholder="github.com/alexchen" />
      <Field label="Portfolio" value={contact.portfolio} onChange={(v) => update('portfolio', v)} placeholder="alexchen.dev" />
    </div>
  )
}
