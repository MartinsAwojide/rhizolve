import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { NodeStatusMarker, type NodeStatus } from '../investigation/NodeStatusMarker'

type GembaResult = 'OK' | 'NOK' | 'ROOT_CAUSE'

type GembaSubmitPayload = {
  result: GembaResult
  attachments: File[]
}

type GembaCheckCardProps = {
  hypothesis: string
  instructions: string
  onSubmit: (payload: GembaSubmitPayload) => void
}

const RESULTS: GembaResult[] = ['OK', 'NOK', 'ROOT_CAUSE']

const RESULT_STATUS: Record<GembaResult, NodeStatus> = {
  OK: 'ruledOut',
  NOK: 'confirmed',
  ROOT_CAUSE: 'rootCause',
}

export function GembaCheckCard({ hypothesis, instructions, onSubmit }: GembaCheckCardProps) {
  const [result, setResult] = useState<GembaResult | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])

  return (
    <Card data-testid="gemba-check-card">
      <p className="font-medium text-text-primary">{hypothesis}</p>
      <p className="text-text-secondary">{instructions}</p>
      <div role="radiogroup" className="mt-md flex gap-sm">
        {RESULTS.map((option) => (
          <label key={option} className="flex items-center gap-xs">
            <span aria-hidden="true">
              <NodeStatusMarker status={RESULT_STATUS[option]} size={20} emphaticRuledOut={option === 'OK'} />
            </span>
            <input
              type="radio"
              name="gemba-result"
              value={option}
              checked={result === option}
              onChange={() => setResult(option)}
            />
            {option}
          </label>
        ))}
      </div>
      <label className="mt-md block text-text-secondary" htmlFor="gemba-attachment-upload">
        Attachment
        <input
          id="gemba-attachment-upload"
          type="file"
          multiple
          onChange={(e) => setAttachments(Array.from(e.target.files ?? []))}
        />
      </label>
      <Button
        type="button"
        className="mt-md"
        disabled={!result}
        onClick={() => result && onSubmit({ result, attachments })}
      >
        Submit
      </Button>
    </Card>
  )
}
