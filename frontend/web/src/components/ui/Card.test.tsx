import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('renders children inside a surface container', () => {
    render(<Card>hello card</Card>)
    expect(screen.getByText('hello card')).toBeInTheDocument()
  })

  it('applies additional className when provided', () => {
    render(<Card className="extra-class">content</Card>)
    expect(screen.getByText('content')).toHaveClass('extra-class')
  })
})
