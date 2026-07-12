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
})
