import { useState } from 'react'
import { ModePopover } from './ModePopover'

type ChatMode = 'shallow' | 'deep'

type ModeIndicatorProps = {
  mode: ChatMode
  onOverride: (mode: ChatMode) => void
}

const MODE_GLYPH: Record<ChatMode, string> = {
  shallow: '●',
  deep: '◆',
}

const MODE_LABEL: Record<ChatMode, string> = {
  shallow: 'Shallow',
  deep: 'Deep',
}

export function ModeIndicator({ mode, onOverride }: ModeIndicatorProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-xs rounded-pill bg-surface-1 px-sm py-xs text-text-secondary"
      >
        <span className="text-accent">{MODE_GLYPH[mode]}</span>
        {MODE_LABEL[mode]}
      </button>
      {open && (
        <div className="absolute bottom-full mb-xs">
          <ModePopover
            mode={mode}
            onOverride={(next) => {
              onOverride(next)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
