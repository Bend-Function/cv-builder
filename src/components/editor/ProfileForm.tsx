'use client'

import { Profile } from '@/lib/resume-data'

interface ProfileFormProps {
  profile: Profile
  onChange: (profile: Profile) => void
}

export function ProfileForm({ profile, onChange }: ProfileFormProps) {
  const setType = (type: 'paragraph' | 'bulletPoints') => {
    onChange({ ...profile, type })
  }

  const setContent = (content: string) => {
    onChange({ ...profile, content })
  }

  const setBullet = (index: number, value: string) => {
    const bullets = [...profile.bullets]
    bullets[index] = value
    onChange({ ...profile, bullets })
  }

  const addBullet = () => {
    onChange({ ...profile, bullets: [...profile.bullets, ''] })
  }

  const removeBullet = (index: number) => {
    const bullets = profile.bullets.filter((_, i) => i !== index)
    onChange({ ...profile, bullets })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
          Format
        </span>
        <div className="flex rounded-md overflow-hidden border border-border-subtle">
          <button
            type="button"
            onClick={() => setType('paragraph')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              profile.type === 'paragraph'
                ? 'bg-accent text-workspace'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Paragraph
          </button>
          <button
            type="button"
            onClick={() => setType('bulletPoints')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border-subtle ${
              profile.type === 'bulletPoints'
                ? 'bg-accent text-workspace'
                : 'bg-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Bullet Points
          </button>
        </div>
      </div>

      {profile.type === 'paragraph' ? (
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
            Profile Summary
          </label>
          <textarea
            value={profile.content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-workspace border border-border-subtle rounded-md text-text-primary text-sm outline-none focus:border-accent-dim focus:ring-2 focus:ring-accent/15 placeholder-text-muted resize-y min-h-[60px]"
            placeholder="Write a concise 35-80 word summary of your skills, experience and career goals."
          />
        </div>
      ) : (
        <div>
          <label className="block text-[11px] font-semibold text-text-secondary uppercase tracking-wide mb-1">
            Profile Points
          </label>
          {profile.bullets.map((bullet, i) => (
            <div key={i} className="flex items-start gap-1 mb-1">
              <span className="text-accent mt-1.5 text-sm shrink-0">›</span>
              <input
                type="text"
                value={bullet}
                onChange={(e) => setBullet(i, e.target.value)}
                className="flex-1 bg-transparent border-b border-border-subtle text-text-primary text-sm py-1 outline-none focus:border-accent-dim placeholder-text-muted placeholder-italic"
                placeholder="Key point about your background"
              />
              <button
                type="button"
                onClick={() => removeBullet(i)}
                className="text-text-muted hover:text-red-400 p-1 rounded transition-colors"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addBullet}
            className="inline-flex items-center gap-1 text-accent text-xs font-semibold border border-border-subtle rounded-full px-3 py-1 mt-1 hover:bg-accent/10 transition-colors"
          >
            + Add point
          </button>
        </div>
      )}
    </div>
  )
}
