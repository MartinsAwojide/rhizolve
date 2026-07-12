import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import type { WhyNode } from './types'

type ValidatorReviewCardProps = {
  node: WhyNode
  confidence?: number
  onSubmit: (decision: { override: boolean }) => void
}

export function ValidatorReviewCard({ node, confidence, onSubmit }: ValidatorReviewCardProps) {
  const [override, setOverride] = useState(false)

  return (
    <Card data-testid="validator-review-card">
      <p className="font-medium text-text-primary">{node.hypothesis}</p>
      <p className="text-text-secondary">
        AI decision: {node.is_root_cause ? 'Root cause' : 'Not root cause'}
      </p>
      {confidence !== undefined && (
        <p className="text-text-muted">Confidence: {Math.round(confidence * 100)}%</p>
      )}
      <label className="mt-md flex items-center gap-xs">
        <input
          type="checkbox"
          checked={override}
          onChange={(e) => setOverride(e.target.checked)}
        />
        Override AI decision
      </label>
      <Button type="button" className="mt-md" onClick={() => onSubmit({ override })}>
        Submit
      </Button>
    </Card>
  )
}
