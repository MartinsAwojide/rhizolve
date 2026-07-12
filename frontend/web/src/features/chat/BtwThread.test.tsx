import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BtwThread } from './BtwThread'
import type { ChatMessage } from './types'

const messages: ChatMessage[] = [
  { type: 'shallow', role: 'user', content: '/btw quick question' },
  { type: 'shallow', role: 'assistant', content: 'quick answer' },
]

describe('BtwThread', () => {
  it('exposes the data-testid and renders a bubble per message', () => {
    render(<BtwThread messages={messages} onClose={vi.fn()} />)
    expect(screen.getByTestId('btw-thread')).toBeInTheDocument()
    expect(screen.getAllByTestId('chat-bubble')).toHaveLength(2)
  })

  it('renders the message content', () => {
    render(<BtwThread messages={messages} onClose={vi.fn()} />)
    expect(screen.getByText('/btw quick question')).toBeInTheDocument()
    expect(screen.getByText('quick answer')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<BtwThread messages={messages} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
