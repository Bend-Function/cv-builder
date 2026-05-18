interface SectionToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
}

export function SectionToggle({ enabled, onChange }: SectionToggleProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-text-muted font-medium">{enabled ? 'On' : 'Off'}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onChange(!enabled)
        }}
        className={`w-9 h-5 rounded-full relative transition-colors ${
          enabled ? 'bg-accent/30' : 'bg-border-subtle'
        }`}
      >
        <span
          className={`absolute top-[2px] w-4 h-4 rounded-full transition-all ${
            enabled ? 'left-[18px] bg-accent' : 'left-[2px] bg-text-secondary'
          }`}
        />
      </button>
    </div>
  )
}
