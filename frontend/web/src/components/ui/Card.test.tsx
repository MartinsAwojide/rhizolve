import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card, CardHeader } from './Card'

describe('Card', () => {
  it('renders children inside a surface container', () => {
    render(<Card>hello card</Card>)
    expect(screen.getByText('hello card')).toBeInTheDocument()
  })

  it('applies additional className when provided', () => {
    render(<Card className="extra-class">content</Card>)
    expect(screen.getByText('content')).toHaveClass('extra-class')
  })

  it('defaults to md elevation shadow', () => {
    render(<Card>content</Card>)
    expect(screen.getByText('content')).toHaveClass('shadow-md')
  })

  it('applies requested elevation', () => {
    render(<Card elevation="lg">content</Card>)
    const el = screen.getByText('content')
    expect(el).toHaveClass('shadow-lg')
    expect(el).not.toHaveClass('shadow-md')
  })

  it('applies no shadow class for flat elevation', () => {
    render(<Card elevation="flat">content</Card>)
    expect(screen.getByText('content')).not.toHaveClass('shadow-sm', 'shadow-md', 'shadow-lg')
  })

  it('defaults to padded', () => {
    render(<Card>content</Card>)
    expect(screen.getByText('content')).toHaveClass('p-lg')
  })

  it('removes padding when padded is false', () => {
    render(<Card padded={false}>content</Card>)
    expect(screen.getByText('content')).not.toHaveClass('p-lg')
  })

  it('CardHeader renders title and meta', () => {
    render(<CardHeader title="My title" meta={<span>meta info</span>} />)
    expect(screen.getByText('My title')).toBeInTheDocument()
    expect(screen.getByText('meta info')).toBeInTheDocument()
  })
})
