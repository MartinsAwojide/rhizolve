import { useState } from 'react'
import { Button } from '../../components/ui/Button'

type ChatInputProps = {
  mode: string
  onSubmit: (text: string, isBtw: boolean) => void
}

const BTW_PREFIX = /^\/btw\b/

export function ChatInput({ mode, onSubmit }: ChatInputProps) {
  const [text, setText] = useState('')

  function handleSend() {
    if (!text.trim()) return
    onSubmit(text, BTW_PREFIX.test(text))
    setText('')
  }

  return (
    <div className="flex items-center gap-sm">
      <span className="rounded-pill bg-surface-1 px-sm py-xs text-text-secondary">{mode}</span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 rounded-control bg-surface-1 px-sm py-xs text-text-primary"
      />
      <Button type="button" onClick={handleSend}>
        Send
      </Button>
    </div>
  )
}
