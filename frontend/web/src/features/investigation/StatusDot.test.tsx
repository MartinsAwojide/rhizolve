import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusDot } from './StatusDot'

describe('StatusDot', () => {
  it('renders a dot with data-status attribute', () => {
    render(<StatusDot status="active" />)
    expect(screen.getByTestId('status-dot')).toHaveAttribute('data-status', 'active')
  })

  it('applies solid fill for active', () => {
    render(<StatusDot status="active" />)
    expect(screen.getByTestId('status-dot')).toHaveClass('bg-project-status-active')
  })

  it('applies hollow border for closed', () => {
    render(<StatusDot status="closed" />)
    const el = screen.getByTestId('status-dot')
    expect(el).toHaveClass('bg-transparent')
    expect(el).toHaveClass('border-project-status-closed')
  })

  it('applies warning fill for draft', () => {
    render(<StatusDot status="draft" />)
    expect(screen.getByTestId('status-dot')).toHaveClass('bg-project-status-draft')
  })

  it('does not render a label by default', () => {
    render(<StatusDot status="active" />)
    expect(screen.queryByText('Active')).not.toBeInTheDocument()
  })

  it('renders a label when withLabel is set', () => {
    render(<StatusDot status="active" withLabel />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })
})
