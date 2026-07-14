import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { PendingHypothesis } from './types'

type HypothesisReviewCardProps = {
  hypotheses: PendingHypothesis[]
  onSubmit: (edited: PendingHypothesis[]) => void | Promise<void>
}

const BLANK_HYPOTHESIS: PendingHypothesis = {
  hypothesis: '',
  branch_path: '',
  depth: 0,
  gemba_instructions: '',
}

export function HypothesisReviewCard({ hypotheses, onSubmit }: HypothesisReviewCardProps) {
  const [items, setItems] = useState(hypotheses)
  const [submitted, setSubmitted] = useState(false)

  function updateHypothesis(index: number, hypothesis: string) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, hypothesis } : item)))
  }

  function removeAt(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function addBlank() {
    setItems((prev) => [...prev, { ...BLANK_HYPOTHESIS }])
  }

  function moveDown(index: number) {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  function moveUp(index: number) {
    setItems((prev) => {
      if (index <= 0) return prev
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  return (
    <Card data-testid="hypothesis-review-card">
      <ul className="flex flex-col gap-sm">
        {items.map((item, index) => (
          <li key={`${item.branch_path}-${index}`} className="flex items-center gap-sm">
            <span className="font-mono text-xs text-text-muted">{index + 1}</span>
            <Input
              type="text"
              id={`hypothesis-${index}`}
              name={`hypothesis-${index}`}
              aria-label={`Hypothesis ${index + 1}`}
              title={item.hypothesis}
              value={item.hypothesis}
              onChange={(e) => updateHypothesis(index, e.target.value)}
              className="flex-1 font-voice"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => moveUp(index)}
              aria-label="Move up"
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => moveDown(index)}
              aria-label="Move down"
            >
              ↓
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => removeAt(index)}
              aria-label="Remove hypothesis"
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-md flex gap-sm">
        <Button type="button" variant="secondary" onClick={addBlank}>
          Add hypothesis
        </Button>
        <Button
          type="button"
          disabled={submitted}
          onClick={() => {
            setSubmitted(true)
            Promise.resolve(onSubmit(items)).catch(() => setSubmitted(false))
          }}
        >
          Submit
        </Button>
      </div>
    </Card>
  )
}
