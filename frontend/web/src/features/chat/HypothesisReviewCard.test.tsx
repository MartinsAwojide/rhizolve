import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HypothesisReviewCard } from './HypothesisReviewCard'
import type { PendingHypothesis } from './types'

const mockHypotheses: PendingHypothesis[] = [
  {
    hypothesis: 'Belt worn out',
    branch_path: '0',
    depth: 1,
    gemba_instructions: 'Inspect belt for wear',
  },
  {
    hypothesis: 'Sensor miscalibrated',
    branch_path: '1',
    depth: 1,
    gemba_instructions: 'Check sensor calibration log',
  },
]

describe('HypothesisReviewCard', () => {
  it('exposes the data-testid and renders each hypothesis', () => {
    render(<HypothesisReviewCard hypotheses={mockHypotheses} onSubmit={vi.fn()} />)
    expect(screen.getByTestId('hypothesis-review-card')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Belt worn out')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Sensor miscalibrated')).toBeInTheDocument()
  })

  it('removes a hypothesis from the list', () => {
    render(<HypothesisReviewCard hypotheses={mockHypotheses} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: /remove/i })[0])
    expect(screen.queryByDisplayValue('Belt worn out')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('Sensor miscalibrated')).toBeInTheDocument()
  })

  it('adds a new blank hypothesis', () => {
    render(<HypothesisReviewCard hypotheses={mockHypotheses} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /add hypothesis/i }))
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(mockHypotheses.length)
  })

  it('reorders a hypothesis by moving it down', () => {
    render(<HypothesisReviewCard hypotheses={mockHypotheses} onSubmit={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: /move down/i })[0])
    const inputs = screen.getAllByDisplayValue(/Belt worn out|Sensor miscalibrated/)
    expect(inputs[0]).toHaveValue('Sensor miscalibrated')
    expect(inputs[1]).toHaveValue('Belt worn out')
  })

  it('submits the edited hypothesis list', () => {
    const onSubmit = vi.fn()
    render(<HypothesisReviewCard hypotheses={mockHypotheses} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }))
    expect(onSubmit).toHaveBeenCalledWith(mockHypotheses)
  })

  it('renders AI-authored hypothesis text in the serif voice', () => {
    render(<HypothesisReviewCard hypotheses={mockHypotheses} onSubmit={vi.fn()} />)
    expect(screen.getByDisplayValue('Belt worn out')).toHaveClass('font-voice')
  })

  it('shows a mono index marker per hypothesis', () => {
    render(<HypothesisReviewCard hypotheses={mockHypotheses} onSubmit={vi.fn()} />)
    expect(screen.getByText('1')).toHaveClass('font-mono')
    expect(screen.getByText('2')).toHaveClass('font-mono')
  })
})
