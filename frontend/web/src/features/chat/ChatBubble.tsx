import ReactMarkdown from 'react-markdown'
import { Card } from '../../components/ui/Card'

type ChatBubbleProps = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  if (role === 'system') {
    return (
      <div
        className="text-center text-xs text-text-muted my-sm"
        data-testid="chat-bubble"
        data-role={role}
      >
        {content}
      </div>
    )
  }

  return (
    <Card
      className="prose prose-sm max-w-none"
      data-testid="chat-bubble"
      data-role={role}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </Card>
  )
}
