import { ChatBubble } from './ChatBubble'
import { HypothesisReviewCard } from './HypothesisReviewCard'
import { GembaCheckCard } from './GembaCheckCard'
import { ValidatorReviewCard } from './ValidatorReviewCard'
import { CountermeasureReviewCard } from './CountermeasureReviewCard'
import type { ChatMessage, PendingHypothesis } from './types'

type GembaResult = 'OK' | 'NOK' | 'ROOT_CAUSE'

type ChatThreadProps = {
  messages: ChatMessage[]
  onSubmitHypothesisReview?: (hypotheses: PendingHypothesis[]) => void
  onSubmitGembaResult?: (payload: { result: GembaResult; attachments: File[] }) => void
  onSubmitValidatorReview?: (decision: { override: boolean }) => void
  onSubmitCountermeasureReview?: (action: {
    accepted: boolean
    edit?: string
    feedback?: string
  }) => void
}

const NOOP = () => {}

export function ChatThread({
  messages,
  onSubmitHypothesisReview = NOOP,
  onSubmitGembaResult = NOOP,
  onSubmitValidatorReview = NOOP,
  onSubmitCountermeasureReview = NOOP,
}: ChatThreadProps) {
  return (
    <div className="flex flex-col gap-md">
      {messages.map((message, index) => {
        if (message.type === 'shallow') {
          return <ChatBubble key={index} role={message.role} content={message.content} />
        }

        switch (message.interrupt_type) {
          case 'hypothesis_review':
            return (
              <HypothesisReviewCard
                key={index}
                hypotheses={message.hypotheses}
                onSubmit={onSubmitHypothesisReview}
              />
            )
          case 'gemba_result_review':
            return (
              <div key={index} data-testid="node-message-wrapper" data-node-id={message.node.id}>
                <GembaCheckCard
                  hypothesis={message.node.hypothesis}
                  instructions={message.node.gemba_notes}
                  onSubmit={onSubmitGembaResult}
                />
              </div>
            )
          case 'validator_review':
            return (
              <div key={index} data-testid="node-message-wrapper" data-node-id={message.node.id}>
                <ValidatorReviewCard
                  node={message.node}
                  confidence={message.confidence}
                  onSubmit={onSubmitValidatorReview}
                />
              </div>
            )
          case 'countermeasure_review':
            return (
              <div key={index} data-testid="node-message-wrapper" data-node-id={message.node.id}>
                <CountermeasureReviewCard
                  countermeasure={message.node.countermeasure}
                  onSubmit={onSubmitCountermeasureReview}
                />
              </div>
            )
        }
      })}
    </div>
  )
}
