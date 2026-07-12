import { useState } from 'react'
import { Button } from '../../components/ui/Button'
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

  return (
    <div className="flex items-center gap-sm">
      <ModeIndicator mode={mode} onOverride={onOverride} />
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
