import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

type ChatMode = 'shallow' | 'deep'

type ModePopoverProps = {
  mode: ChatMode
  onOverride: (mode: ChatMode) => void
}

export function ModePopover({ mode, onOverride }: ModePopoverProps) {
  return (
    <Card data-testid="mode-popover" className="text-sm">
      <p className="text-text-secondary">
        Currently in <strong>{mode}</strong> mode.{' '}
        {mode === 'shallow'
          ? 'Quick answers, no investigation graph.'
          : 'Running a structured 5 Whys investigation.'}
      </p>
      <div className="mt-sm flex gap-sm">
        <Button type="button" variant="secondary" onClick={() => onOverride('shallow')}>
          Force shallow
        </Button>
        <Button type="button" variant="secondary" onClick={() => onOverride('deep')}>
          Force deep
        </Button>
      </div>
    </Card>
  )
}
