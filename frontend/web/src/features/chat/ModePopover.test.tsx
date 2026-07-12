import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModePopover } from './ModePopover'

describe('ModePopover', () => {
  it('exposes the data-testid and explains the current mode', () => {
    render(<ModePopover mode="shallow" onOverride={vi.fn()} />)
    expect(screen.getByTestId('mode-popover')).toBeInTheDocument()
    expect(screen.getByText(/Currently in/i)).toBeInTheDocument()
  })

  it('calls onOverride with shallow when forcing shallow', () => {
    const onOverride = vi.fn()
    render(<ModePopover mode="deep" onOverride={onOverride} />)
    fireEvent.click(screen.getByRole('button', { name: /force shallow/i }))
    expect(onOverride).toHaveBeenCalledWith('shallow')
  })

  it('calls onOverride with deep when forcing deep', () => {
    const onOverride = vi.fn()
    render(<ModePopover mode="shallow" onOverride={onOverride} />)
    fireEvent.click(screen.getByRole('button', { name: /force deep/i }))
    expect(onOverride).toHaveBeenCalledWith('deep')
  })
})
