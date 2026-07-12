import ReactMarkdown from 'react-markdown'
import { Card } from '../../components/ui/Card'

type ChatBubbleProps = {
  role: 'user' | 'assistant'
  content: string
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
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
