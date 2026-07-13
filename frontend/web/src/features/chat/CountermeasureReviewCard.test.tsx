import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CountermeasureReviewCard } from './CountermeasureReviewCard'

describe('CountermeasureReviewCard', () => {
  it('exposes the data-testid and shows the proposed countermeasure', () => {
    render(
      <CountermeasureReviewCard countermeasure="Replace belt monthly" onSubmit={vi.fn()} />,
    )
    expect(screen.getByTestId('countermeasure-review-card')).toBeInTheDocument()
    expect(screen.getByText('Replace belt monthly')).toBeInTheDocument()
  })

  it('accepts the countermeasure as-is', () => {
    const onSubmit = vi.fn()
    render(<CountermeasureReviewCard countermeasure="Replace belt monthly" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /^accept$/i }))
    expect(onSubmit).toHaveBeenCalledWith({ accepted: true })
  })

  it('submits an edited countermeasure', () => {
    const onSubmit = vi.fn()
    render(<CountermeasureReviewCard countermeasure="Replace belt monthly" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    fireEvent.change(screen.getByRole('textbox', { name: /edit countermeasure/i }), {
      target: { value: 'Replace belt quarterly' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save edit/i }))
    expect(onSubmit).toHaveBeenCalledWith({ accepted: true, edit: 'Replace belt quarterly' })
  })

  it('rejects the countermeasure with feedback', () => {
    const onSubmit = vi.fn()
    render(<CountermeasureReviewCard countermeasure="Replace belt monthly" onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /^reject$/i }))
    fireEvent.change(screen.getByRole('textbox', { name: /feedback/i }), {
      target: { value: 'Too costly, propose cheaper option' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send feedback/i }))
    expect(onSubmit).toHaveBeenCalledWith({
      accepted: false,
      feedback: 'Too costly, propose cheaper option',
    })
  })

  it('renders the AI-authored countermeasure text in the serif voice', () => {
    render(<CountermeasureReviewCard countermeasure="Replace belt monthly" onSubmit={vi.fn()} />)
    expect(screen.getByText('Replace belt monthly')).toHaveClass('font-voice')
  })

  it('styles the reject button with the danger variant', () => {
    render(<CountermeasureReviewCard countermeasure="Replace belt monthly" onSubmit={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^reject$/i })).toHaveClass('text-danger')
  })
})
