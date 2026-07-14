import ReactMarkdown from 'react-markdown'
import { Card } from '../../components/ui/Card'

type ChatBubbleProps = {
  role: 'user' | 'assistant' | 'system'
  content: string
  name?: string
}

export function ChatBubble({ role, content, name }: ChatBubbleProps) {
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

  const isUser = role === 'user'

  return (
    <div
      data-testid="chat-bubble-row"
      className={`flex my-sm ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className="max-w-[78%]">
        {name && (
          <div
            className={`mb-xs text-xs font-medium text-text-muted ${isUser ? 'text-right' : 'text-left'}`}
          >
            {name}
          </div>
        )}
        <Card
          className={`prose prose-sm max-w-none ${
            isUser ? '!bg-accent-fill/10 font-sans' : 'font-voice'
          }`}
          data-testid="chat-bubble"
          data-role={role}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </Card>
      </div>
    </div>
  )
}
