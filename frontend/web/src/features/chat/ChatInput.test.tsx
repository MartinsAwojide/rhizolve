import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  it('displays the current mode via the mode indicator', () => {
    render(<ChatInput mode="shallow" onSubmit={vi.fn()} onOverride={vi.fn()} />)
    expect(screen.getByText('●')).toBeInTheDocument()
    expect(screen.getByText('Shallow')).toBeInTheDocument()
  })

  it('calls onSubmit with the typed text and isBtw false for normal messages', () => {
    const onSubmit = vi.fn()
    render(<ChatInput mode="shallow" onSubmit={onSubmit} onOverride={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'What next?' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSubmit).toHaveBeenCalledWith('What next?', false)
  })

  it('detects a /btw prefix and sets isBtw true', () => {
    const onSubmit = vi.fn()
    render(<ChatInput mode="shallow" onSubmit={onSubmit} onOverride={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '/btw the machine also smells hot' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSubmit).toHaveBeenCalledWith('/btw the machine also smells hot', true)
  })

  it('clears the input after submit', () => {
    render(<ChatInput mode="shallow" onSubmit={vi.fn()} onOverride={vi.fn()} />)
    const textbox = screen.getByRole('textbox')
    fireEvent.change(textbox, { target: { value: 'hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(textbox).toHaveValue('')
  })

  it('forwards a manual mode override from the mode indicator', () => {
    const onOverride = vi.fn()
    render(<ChatInput mode="shallow" onSubmit={vi.fn()} onOverride={onOverride} />)
    fireEvent.click(screen.getByRole('button', { name: /shallow/i }))
    fireEvent.click(screen.getByRole('button', { name: /force deep/i }))
    expect(onOverride).toHaveBeenCalledWith('deep')
  })

  it('sends on Enter without Shift', () => {
    const onSubmit = vi.fn()
    render(<ChatInput mode="shallow" onSubmit={onSubmit} onOverride={vi.fn()} />)
    const textbox = screen.getByRole('textbox')
    fireEvent.change(textbox, { target: { value: 'What next?' } })
    fireEvent.keyDown(textbox, { key: 'Enter', shiftKey: false })
    expect(onSubmit).toHaveBeenCalledWith('What next?', false)
  })

  it('does not send on Shift+Enter, allowing a newline instead', () => {
    const onSubmit = vi.fn()
    render(<ChatInput mode="shallow" onSubmit={onSubmit} onOverride={vi.fn()} />)
    const textbox = screen.getByRole('textbox')
    fireEvent.change(textbox, { target: { value: 'line one' } })
    fireEvent.keyDown(textbox, { key: 'Enter', shiftKey: true })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows a placeholder and a /btw hint', () => {
    render(<ChatInput mode="shallow" onSubmit={vi.fn()} onOverride={vi.fn()} />)
    expect(screen.getByPlaceholderText(/message the investigation/i)).toBeInTheDocument()
    expect(screen.getByText(/\/btw/)).toBeInTheDocument()
  })
})
