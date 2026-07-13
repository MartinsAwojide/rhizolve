import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders label text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('defaults to primary variant styling', () => {
    render(<Button>Primary</Button>)
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveClass('bg-accent-fill')
  })

  it('applies secondary variant styling when requested', () => {
    render(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button', { name: 'Secondary' })).not.toHaveClass('bg-accent-fill')
  })

  it('respects the disabled prop', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled()
  })

  it('applies ghost variant styling when requested', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const btn = screen.getByRole('button', { name: 'Ghost' })
    expect(btn).not.toHaveClass('bg-accent-fill')
    expect(btn).toHaveClass('text-accent')
  })

  it('applies danger variant styling when requested', () => {
    render(<Button variant="danger">Danger</Button>)
    const btn = screen.getByRole('button', { name: 'Danger' })
    expect(btn).toHaveClass('text-danger')
    expect(btn).toHaveClass('border-danger')
  })

  it('defaults to md size', () => {
    render(<Button>Sized</Button>)
    expect(screen.getByRole('button', { name: 'Sized' })).toHaveClass('h-10')
  })

  it('applies sm size classes when requested', () => {
    render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('h-8')
  })

  it('applies lg size classes when requested', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button', { name: 'Large' })).toHaveClass('h-12')
  })
})
