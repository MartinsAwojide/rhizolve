import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Draft</Badge>)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('defaults to neutral tone', () => {
    render(<Badge>Neutral</Badge>)
    expect(screen.getByText('Neutral')).toHaveClass('text-text-secondary')
  })

  it('applies accent tone', () => {
    render(<Badge tone="accent">Accent</Badge>)
    expect(screen.getByText('Accent')).toHaveClass('text-accent')
  })

  it('applies success tone', () => {
    render(<Badge tone="success">Success</Badge>)
    expect(screen.getByText('Success')).toHaveClass('text-success')
  })

  it('applies danger tone', () => {
    render(<Badge tone="danger">Danger</Badge>)
    expect(screen.getByText('Danger')).toHaveClass('text-danger')
  })

  it('applies warning tone', () => {
    render(<Badge tone="warning">Warning</Badge>)
    expect(screen.getByText('Warning')).toHaveClass('text-warning')
  })

  it('renders as a span with pill radius', () => {
    render(<Badge>Pill</Badge>)
    const el = screen.getByText('Pill')
    expect(el.tagName).toBe('SPAN')
    expect(el).toHaveClass('rounded-pill')
  })
})
