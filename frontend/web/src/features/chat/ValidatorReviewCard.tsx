import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import type { WhyNode } from './types'

type ValidatorReviewCardProps = {
  node: WhyNode
  confidence?: number
  onSubmit: (decision: { override: boolean }) => void | Promise<void>
}

export function ValidatorReviewCard({ node, confidence, onSubmit }: ValidatorReviewCardProps) {
  const [override, setOverride] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  return (
    <Card data-testid="validator-review-card">
      <p className="font-medium text-text-primary">{node.hypothesis}</p>
      <p className="text-text-secondary">
        AI decision: {node.is_root_cause ? 'Root cause' : 'Not root cause'}
      </p>
      {confidence !== undefined && (
        <div className="mt-sm">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Confidence</span>
            <span className="font-mono text-text-secondary">{Math.round(confidence * 100)}%</span>
          </div>
          <div className="mt-xs h-1.5 overflow-hidden rounded-pill bg-border">
            <div
              data-testid="confidence-meter-fill"
              className="h-full rounded-pill bg-accent-fill"
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
        </div>
      )}
      <label className="mt-md flex items-center gap-xs">
        <input
          type="checkbox"
          checked={override}
          onChange={(e) => setOverride(e.target.checked)}
        />
        Override AI decision
      </label>
      <Button
        type="button"
        className="mt-md"
        disabled={submitted}
        onClick={() => {
          setSubmitted(true)
          Promise.resolve(onSubmit({ override })).catch(() => setSubmitted(false))
        }}
      >
        Submit
      </Button>
    </Card>
  )
}
