import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ModeIndicator } from './ModeIndicator'

type ChatMode = 'shallow' | 'deep'

type ChatInputProps = {
  mode: ChatMode
  onSubmit: (text: string, isBtw: boolean) => void
  onOverride: (mode: ChatMode) => void
}

const BTW_PREFIX = /^\/btw\b/

export function ChatInput({ mode, onSubmit, onOverride }: ChatInputProps) {
  const [text, setText] = useState('')

  function handleSend() {
    if (!text.trim()) return
    onSubmit(text, BTW_PREFIX.test(text))
    setText('')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col gap-sm">
      <div className="flex items-center gap-sm">
        <ModeIndicator mode={mode} onOverride={onOverride} />
        <span className="text-xs text-text-muted">
          type <span className="font-mono">/btw</span> for a side question
        </span>
      </div>
      <div className="flex items-end gap-sm">
        <div className="flex-1">
          <Input
            as="textarea"
            id="chat-message"
            name="chat-message"
            aria-label="Message"
            placeholder="Message the investigation…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[44px]"
          />
        </div>
        <Button type="button" onClick={handleSend}>
          Send
        </Button>
      </div>
    </div>
  )
}
