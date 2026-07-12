import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  it('displays the current mode as a pill', () => {
    render(<ChatInput mode="Investigation" onSubmit={vi.fn()} />)
    expect(screen.getByText('Investigation')).toBeInTheDocument()
  })

  it('calls onSubmit with the typed text and isBtw false for normal messages', () => {
    const onSubmit = vi.fn()
    render(<ChatInput mode="Investigation" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'What next?' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSubmit).toHaveBeenCalledWith('What next?', false)
  })

  it('detects a /btw prefix and sets isBtw true', () => {
    const onSubmit = vi.fn()
    render(<ChatInput mode="Investigation" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '/btw the machine also smells hot' },
    })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSubmit).toHaveBeenCalledWith('/btw the machine also smells hot', true)
  })

  it('clears the input after submit', () => {
    render(<ChatInput mode="Investigation" onSubmit={vi.fn()} />)
    const textbox = screen.getByRole('textbox')
    fireEvent.change(textbox, { target: { value: 'hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(textbox).toHaveValue('')
  })
})
