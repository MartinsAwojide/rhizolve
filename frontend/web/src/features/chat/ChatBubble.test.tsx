import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChatBubble } from './ChatBubble'

describe('ChatBubble', () => {
  it('renders bold markdown', () => {
    render(<ChatBubble role="assistant" content="**bold text**" />)
    expect(screen.getByText('bold text').tagName).toBe('STRONG')
  })

  it('renders a markdown list', () => {
    render(<ChatBubble role="assistant" content={'- one\n- two'} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders a markdown link', () => {
    render(<ChatBubble role="assistant" content="[click](https://example.com)" />)
    expect(screen.getByRole('link', { name: 'click' })).toHaveAttribute(
      'href',
      'https://example.com',
    )
  })

  it('exposes the data-testid and role attribute', () => {
    render(<ChatBubble role="user" content="hi" />)
    const bubble = screen.getByTestId('chat-bubble')
    expect(bubble).toHaveAttribute('data-role', 'user')
  })

  it('renders a system message centered and muted, without a card', () => {
    render(<ChatBubble role="system" content="Driver changed to Alex" />)
    const bubble = screen.getByTestId('chat-bubble')
    expect(bubble).toHaveAttribute('data-role', 'system')
    expect(bubble).toHaveClass('text-center', 'text-text-muted', 'text-xs')
  })
})
