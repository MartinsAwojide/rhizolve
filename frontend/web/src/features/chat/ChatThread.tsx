import { ChatBubble } from './ChatBubble'
import { HypothesisReviewCard } from './HypothesisReviewCard'
import { GembaCheckCard } from './GembaCheckCard'
import { ValidatorReviewCard } from './ValidatorReviewCard'
import { CountermeasureReviewCard } from './CountermeasureReviewCard'
import type { ChatMessage } from './types'

type ChatThreadProps = {
  messages: ChatMessage[]
}

const NOOP = () => {}

export function ChatThread({ messages }: ChatThreadProps) {
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
                onSubmit={NOOP}
              />
            )
          case 'gemba_result_review':
            return (
              <GembaCheckCard
                key={index}
                hypothesis={message.node.hypothesis}
                instructions={message.node.gemba_notes}
                onSubmit={NOOP}
              />
            )
          case 'validator_review':
            return (
              <ValidatorReviewCard
                key={index}
                node={message.node}
                confidence={message.confidence}
                onSubmit={NOOP}
              />
            )
          case 'countermeasure_review':
            return (
              <CountermeasureReviewCard
                key={index}
                countermeasure={message.node.countermeasure}
                onSubmit={NOOP}
              />
            )
        }
      })}
    </div>
  )
}
