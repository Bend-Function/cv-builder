import { Contact } from '@/lib/resume-data'

interface ContactFormProps {
  contact: Contact
  onChange: (contact: Contact) => void
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/15 placeholder-text-muted"
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
      <div className="grid grid-cols-2 gap-2">
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
