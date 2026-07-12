import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

type CountermeasureAction = {
  accepted: boolean
  edit?: string
  feedback?: string
}

type CountermeasureReviewCardProps = {
  countermeasure: string
  onSubmit: (action: CountermeasureAction) => void
}

type Mode = 'default' | 'editing' | 'rejecting'

export function CountermeasureReviewCard({
  countermeasure,
  onSubmit,
}: CountermeasureReviewCardProps) {
  const [mode, setMode] = useState<Mode>('default')
  const [editText, setEditText] = useState(countermeasure)
  const [feedback, setFeedback] = useState('')

  return (
    <Card data-testid="countermeasure-review-card">
      <p className="text-text-primary">{countermeasure}</p>

      {mode === 'default' && (
        <div className="mt-md flex gap-sm">
          <Button type="button" onClick={() => onSubmit({ accepted: true })}>
            Accept
          </Button>
          <Button type="button" variant="secondary" onClick={() => setMode('editing')}>
            Edit
          </Button>
          <Button type="button" variant="secondary" onClick={() => setMode('rejecting')}>
            Reject
          </Button>
        </div>
      )}

      {mode === 'editing' && (
        <div className="mt-md">
          <label className="block text-text-secondary" htmlFor="countermeasure-edit">
            Edit countermeasure
            <textarea
              id="countermeasure-edit"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="mt-xs block w-full rounded-control bg-surface-1 p-sm text-text-primary"
            />
          </label>
          <Button
            type="button"
            className="mt-sm"
            onClick={() => onSubmit({ accepted: true, edit: editText })}
          >
            Save edit
          </Button>
        </div>
      )}

      {mode === 'rejecting' && (
        <div className="mt-md">
          <label className="block text-text-secondary" htmlFor="countermeasure-feedback">
            Feedback
            <textarea
              id="countermeasure-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="mt-xs block w-full rounded-control bg-surface-1 p-sm text-text-primary"
            />
          </label>
          <Button
            type="button"
            className="mt-sm"
            onClick={() => onSubmit({ accepted: false, feedback })}
          >
            Send feedback
          </Button>
        </div>
      )}
    </Card>
  )
}
