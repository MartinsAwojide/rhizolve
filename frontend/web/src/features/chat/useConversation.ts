import { useCallback, useRef, useState } from 'react'
import { useAuthFetch } from '../../hooks/useAuthFetch'
import type { ChatMessage } from './types'

type ChatMode = 'shallow' | 'deep'

type ChatResponseBody = {
  response: string | null
  graph_invoked: boolean
  thread_id: string
  active_mode: ChatMode
}

export function useConversation() {
  const authFetch = useAuthFetch()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [mode, setMode] = useState<ChatMode>('shallow')
  const overriddenRef = useRef(false)
  const threadIdRef = useRef('default')

  const overrideMode = useCallback((next: ChatMode) => {
    overriddenRef.current = true
    setMode(next)
  }, [])

  const sendMessage = useCallback(
    async (text: string, _isBtw: boolean) => {
      setMessages((prev) => [...prev, { type: 'shallow', role: 'user', content: text }])

      const data: ChatResponseBody = await authFetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode,
          thread_id: threadIdRef.current,
        }),
      })

      threadIdRef.current = data.thread_id
      if (!overriddenRef.current) {
        setMode(data.active_mode)
      }
      if (data.response) {
        setMessages((prev) => [
          ...prev,
          { type: 'shallow', role: 'assistant', content: data.response as string },
        ])
      }
    },
    [authFetch, mode],
  )

  return { messages, mode, overrideMode, sendMessage }
}
