import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ValidatorReviewCard } from './ValidatorReviewCard'
import type { WhyNode } from './types'

const mockNode: WhyNode = {
  id: 'node-1',
  branch_path: '0',
  depth: 1,
  hypothesis: 'Belt worn out',
  gemba_result: 'NOK',
  gemba_notes: 'Belt shows visible cracking',
  is_root_cause: true,
  countermeasure: '',
}

describe('ValidatorReviewCard', () => {
  it('exposes the data-testid and renders without a confidence prop', () => {
    render(<ValidatorReviewCard node={mockNode} onSubmit={vi.fn()} />)
    expect(screen.getByTestId('validator-review-card')).toBeInTheDocument()
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument()
  })

  it('renders the confidence badge when provided', () => {
    render(<ValidatorReviewCard node={mockNode} confidence={0.82} onSubmit={vi.fn()} />)
    expect(screen.getByText(/82%/)).toBeInTheDocument()
  })

  it('shows the AI decision as root cause', () => {
    render(<ValidatorReviewCard node={mockNode} onSubmit={vi.fn()} />)
    expect(screen.getByText(/root cause/i)).toBeInTheDocument()
  })

  it('submits override true when the override toggle is used', () => {
    const onSubmit = vi.fn()
    render(<ValidatorReviewCard node={mockNode} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /override/i }))
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }))
    expect(onSubmit).toHaveBeenCalledWith({ override: true })
  })

  it('submits override false by default', () => {
    const onSubmit = vi.fn()
    render(<ValidatorReviewCard node={mockNode} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }))
    expect(onSubmit).toHaveBeenCalledWith({ override: false })
  })

  it('renders the confidence percentage in mono and a proportional meter bar', () => {
    render(<ValidatorReviewCard node={mockNode} confidence={0.82} onSubmit={vi.fn()} />)
    expect(screen.getByText('82%')).toHaveClass('font-mono')
    expect(screen.getByTestId('confidence-meter-fill')).toHaveStyle({ width: '82%' })
  })
})
