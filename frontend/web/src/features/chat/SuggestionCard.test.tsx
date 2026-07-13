import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SuggestionCard } from './SuggestionCard'

describe('SuggestionCard', () => {
  it('renders the suggestion text in the serif voice', () => {
    render(<SuggestionCard suggestion="Consider checking the drive belt tension" onAccept={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText('Consider checking the drive belt tension')).toHaveClass('font-voice')
  })

  it('applies a dashed accent border', () => {
    render(<SuggestionCard suggestion="text" onAccept={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByTestId('suggestion-card')).toHaveClass('border-dashed', 'border-accent')
  })

  it('does not show a target node reference by default', () => {
    render(<SuggestionCard suggestion="text" onAccept={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.queryByText(/node/i)).not.toBeInTheDocument()
  })

  it('shows the target node in mono when provided', () => {
    render(<SuggestionCard suggestion="text" targetNode="0.1" onAccept={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText('→ node 0.1')).toHaveClass('font-mono')
  })

  it('calls onAccept when the accept button is clicked', () => {
    const onAccept = vi.fn()
    render(<SuggestionCard suggestion="text" onAccept={onAccept} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /accept suggestion/i }))
    expect(onAccept).toHaveBeenCalled()
  })

  it('calls onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    render(<SuggestionCard suggestion="text" onAccept={vi.fn()} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
