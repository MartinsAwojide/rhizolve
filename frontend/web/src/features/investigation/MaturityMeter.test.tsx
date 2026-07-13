import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MaturityMeter } from './MaturityMeter'

describe('MaturityMeter', () => {
  it('shows label by default with level and name', () => {
    render(<MaturityMeter level={3} />)
    expect(screen.getByText('L3 · Defined')).toBeInTheDocument()
  })

  it('hides label when showLabel is false', () => {
    render(<MaturityMeter level={3} showLabel={false} />)
    expect(screen.queryByText('L3 · Defined')).not.toBeInTheDocument()
  })

  it('renders 5 segments', () => {
    const { container } = render(<MaturityMeter level={2} />)
    expect(container.querySelectorAll('[data-segment]').length).toBe(5)
  })

  it('fills segments up to the clamped level', () => {
    const { container } = render(<MaturityMeter level={2} />)
    const segments = container.querySelectorAll('[data-segment]')
    expect(segments[0]).toHaveAttribute('data-filled', 'true')
    expect(segments[1]).toHaveAttribute('data-filled', 'true')
    expect(segments[2]).toHaveAttribute('data-filled', 'false')
  })

  it('clamps level above 5 down to 5', () => {
    render(<MaturityMeter level={9} />)
    expect(screen.getByText('L5 · Optimising')).toBeInTheDocument()
  })

  it('clamps level below 1 up to 1', () => {
    render(<MaturityMeter level={0} />)
    expect(screen.getByText('L1 · Basic')).toBeInTheDocument()
  })
})
