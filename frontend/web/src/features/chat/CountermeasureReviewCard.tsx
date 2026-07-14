import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

type CountermeasureAction = {
  accepted: boolean
  edit?: string
  feedback?: string
}

type CountermeasureReviewCardProps = {
  countermeasure: string
  onSubmit: (action: CountermeasureAction) => void | Promise<void>
}

type Mode = 'default' | 'editing' | 'rejecting'

export function CountermeasureReviewCard({
  countermeasure,
  onSubmit,
}: CountermeasureReviewCardProps) {
  const [mode, setMode] = useState<Mode>('default')
  const [editText, setEditText] = useState(countermeasure)
  const [feedback, setFeedback] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <Card data-testid="countermeasure-review-card">
      <p className="rounded-control border border-border bg-surface-1 p-sm font-voice text-text-primary">
        {countermeasure}
      </p>

      {mode === 'default' && (
        <div className="mt-md flex gap-sm">
          <Button type="button" variant="danger" onClick={() => setMode('rejecting')}>
            Reject
          </Button>
          <Button type="button" variant="secondary" onClick={() => setMode('editing')}>
            Edit
          </Button>
          <Button
            type="button"
            disabled={submitted}
            onClick={() => {
              setSubmitted(true)
              Promise.resolve(onSubmit({ accepted: true })).catch(() => setSubmitted(false))
            }}
          >
            Accept
          </Button>
        </div>
      )}

      {mode === 'editing' && (
        <div className="mt-md">
          <Input
            as="textarea"
            id="countermeasure-edit"
            label="Edit countermeasure"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <Button
            type="button"
            className="mt-sm"
            disabled={submitted}
            onClick={() => {
              setSubmitted(true)
              Promise.resolve(onSubmit({ accepted: true, edit: editText })).catch(() =>
                setSubmitted(false),
              )
            }}
          >
            Save edit
          </Button>
        </div>
      )}

      {mode === 'rejecting' && (
        <div className="mt-md">
          <Input
            as="textarea"
            id="countermeasure-feedback"
            label="Feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <Button
            type="button"
            className="mt-sm"
            disabled={submitted}
            onClick={() => {
              setSubmitted(true)
              Promise.resolve(onSubmit({ accepted: false, feedback })).catch(() =>
                setSubmitted(false),
              )
            }}
          >
            Send feedback
          </Button>
        </div>
      )}
    </Card>
  )
}
