import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import type { PresenceParticipant } from '../../hooks/usePresence'

type PresenceBarProps = {
  participants: PresenceParticipant[]
  driver: PresenceParticipant | null
  onExportReport: () => void
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function PresenceBar({ participants, driver, onExportReport }: PresenceBarProps) {
  return (
    <div className="flex items-center gap-sm border-b border-border px-lg py-sm">
      <div className="flex">
        {participants.map((participant, index) => (
          <div
            key={participant.user_id}
            title={participant.name ?? undefined}
            style={{ marginLeft: index ? -6 : 0 }}
            className={`flex h-7 w-7 items-center justify-center rounded-pill border-2 bg-accent-fill text-xs font-medium text-on-accent ${
              driver?.user_id === participant.user_id ? 'border-accent' : 'border-surface-0'
            }`}
          >
            {initials(participant.name)}
          </div>
        ))}
      </div>
      {driver && <Badge tone="accent">{driver.name} driving</Badge>}
      <Button type="button" variant="secondary" size="sm" className="ml-auto" onClick={onExportReport}>
        Export report
      </Button>
    </div>
  )
}
