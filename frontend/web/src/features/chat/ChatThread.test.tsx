import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChatThread } from './ChatThread'
import type { ChatMessage, PendingHypothesis, WhyNode } from './types'

const mockHypotheses: PendingHypothesis[] = [
  {
    hypothesis: 'Belt worn out',
    branch_path: '0',
    depth: 1,
    gemba_instructions: 'Inspect belt for wear',
  },
]

const mockNode: WhyNode = {
  id: 'node-1',
  branch_path: '0',
  depth: 1,
  hypothesis: 'Belt worn out',
  gemba_result: 'pending',
  gemba_notes: '',
  is_root_cause: false,
  countermeasure: '',
}

describe('ChatThread', () => {
  it('renders a hypothesis review card for hypothesis_review interrupts', () => {
    render(
      <ChatThread
        messages={[{ type: 'interrupt', interrupt_type: 'hypothesis_review', hypotheses: mockHypotheses }]}
      />,
    )
    expect(screen.getByTestId('hypothesis-review-card')).toBeInTheDocument()
  })

  it('renders a gemba check card for gemba_result_review interrupts', () => {
    const messages: ChatMessage[] = [
      { type: 'interrupt', interrupt_type: 'gemba_result_review', node: mockNode },
    ]
    render(<ChatThread messages={messages} />)
    expect(screen.getByTestId('gemba-check-card')).toBeInTheDocument()
  })

  it('renders a validator review card for validator_review interrupts', () => {
    const messages: ChatMessage[] = [
      { type: 'interrupt', interrupt_type: 'validator_review', node: mockNode },
    ]
    render(<ChatThread messages={messages} />)
    expect(screen.getByTestId('validator-review-card')).toBeInTheDocument()
  })

  it('renders a countermeasure review card for countermeasure_review interrupts', () => {
    const messages: ChatMessage[] = [
      { type: 'interrupt', interrupt_type: 'countermeasure_review', node: mockNode },
    ]
    render(<ChatThread messages={messages} />)
    expect(screen.getByTestId('countermeasure-review-card')).toBeInTheDocument()
  })

  it('renders a chat bubble for shallow messages', () => {
    const messages: ChatMessage[] = [{ type: 'shallow', role: 'assistant', content: 'Hi there' }]
    render(<ChatThread messages={messages} />)
    expect(screen.getByTestId('chat-bubble')).toBeInTheDocument()
  })
})
