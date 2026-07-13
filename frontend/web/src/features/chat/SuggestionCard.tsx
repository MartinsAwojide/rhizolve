import { Button } from '../../components/ui/Button'

type SuggestionCardProps = {
  targetNode?: string
  suggestion: string
  onAccept: () => void
  onDismiss: () => void
}

export function SuggestionCard({ targetNode, suggestion, onAccept, onDismiss }: SuggestionCardProps) {
  return (
    <div
      data-testid="suggestion-card"
      className="max-w-[460px] rounded-card border-[1.5px] border-dashed border-accent bg-surface-2 p-lg"
    >
      <div className="mb-sm flex items-center gap-sm">
        <span className="text-xs font-medium text-accent">Suggested branch</span>
        {targetNode && <span className="font-mono text-xs text-text-muted">→ node {targetNode}</span>}
      </div>
      <div className="mb-md font-voice text-base text-text-primary">{suggestion}</div>
      <div className="flex gap-sm">
        <Button variant="primary" size="sm" onClick={onAccept}>
          Accept suggestion
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
