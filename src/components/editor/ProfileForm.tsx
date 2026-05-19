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
    <div>
      <div className="form-group">
        <label className="form-label">Format</label>
        <div className="form-row">
          <button
            type="button"
            onClick={() => setType('paragraph')}
            className={`btn flex-1 ${profile.type === 'paragraph' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Paragraph
          </button>
          <button
            type="button"
            onClick={() => setType('bulletPoints')}
            className={`btn flex-1 ${profile.type === 'bulletPoints' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Bullet Points
          </button>
        </div>
      </div>

      {profile.type === 'paragraph' ? (
        <div className="form-group">
          <label htmlFor="profile-content" className="form-label">
            Profile Summary
          </label>
          <textarea
            id="profile-content"
            value={profile.content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="form-textarea"
            placeholder="Write a concise 35-80 word summary of your skills, experience and career goals."
          />
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label">Profile Points</label>
          {profile.bullets.map((bullet, i) => (
            <div key={i} className="bullet-row">
              <span className="bullet-dot">›</span>
              <input
                type="text"
                value={bullet}
                onChange={(e) => setBullet(i, e.target.value)}
                className="bullet-input"
                placeholder="Key point about your background"
                aria-label={`Profile point ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => removeBullet(i)}
                className="item-delete"
                aria-label={`Remove profile point ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" onClick={addBullet} className="add-btn">
            + Add point
          </button>
        </div>
      )}
    </div>
  )
}
