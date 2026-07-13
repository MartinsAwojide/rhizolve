const LABELS = ['Basic', 'Developing', 'Defined', 'Managed', 'Optimising']

type MaturityMeterProps = {
  level?: number
  showLabel?: boolean
}

export function MaturityMeter({ level = 3, showLabel = true }: MaturityMeterProps) {
  const clamped = Math.max(1, Math.min(5, level))

  return (
    <span className="inline-flex items-center gap-sm font-sans">
      <span className="inline-flex gap-[3px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            data-segment
            data-filled={i <= clamped}
            className={`h-[5px] w-4 rounded-pill ${i <= clamped ? 'bg-accent-fill' : 'bg-border-strong'}`}
          />
        ))}
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-text-secondary">
          L{clamped} · {LABELS[clamped - 1]}
        </span>
      )}
    </span>
  )
}
