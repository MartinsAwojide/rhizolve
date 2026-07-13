import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('renders a text input by default', () => {
    render(<Input label="Name" />)
    expect(screen.getByLabelText('Name').tagName).toBe('INPUT')
  })

  it('renders a textarea when as="textarea"', () => {
    render(<Input as="textarea" label="Notes" />)
    expect(screen.getByLabelText('Notes').tagName).toBe('TEXTAREA')
  })

  it('renders hint text', () => {
    render(<Input label="Name" hint="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
  })

  it('applies invalid border styling when invalid', () => {
    render(<Input label="Name" invalid hint="Bad value" />)
    expect(screen.getByText('Bad value')).toHaveClass('text-danger')
  })

  it('forwards standard input props', () => {
    render(<Input label="Email" placeholder="you@example.com" />)
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
  })
})
