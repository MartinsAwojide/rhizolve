import { Button } from '../../components/ui/Button'
import { ChatBubble } from './ChatBubble'
import type { ChatMessage } from './types'

type BtwThreadProps = {
  messages: ChatMessage[]
  onClose: () => void
}

export function BtwThread({ messages, onClose }: BtwThreadProps) {
  return (
    <div
      data-testid="btw-thread"
      className="flex flex-col gap-md border-l-4 border-accent bg-surface-1 p-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary">By the way</span>
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
      {messages.map((message, index) =>
        message.type === 'shallow' ? (
          <ChatBubble key={index} role={message.role} content={message.content} />
        ) : null,
      )}
    </div>
  )
}
