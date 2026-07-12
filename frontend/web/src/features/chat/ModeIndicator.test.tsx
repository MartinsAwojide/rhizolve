import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ModeIndicator } from './ModeIndicator'

describe('ModeIndicator', () => {
  it('shows the shallow marker and label', () => {
    render(<ModeIndicator mode="shallow" onOverride={vi.fn()} />)
    expect(screen.getByText('● Shallow')).toBeInTheDocument()
  })

  it('shows the deep marker and label', () => {
    render(<ModeIndicator mode="deep" onOverride={vi.fn()} />)
    expect(screen.getByText('◆ Deep')).toBeInTheDocument()
  })

  it('opens the popover on click', () => {
    render(<ModeIndicator mode="shallow" onOverride={vi.fn()} />)
    expect(screen.queryByTestId('mode-popover')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /shallow/i }))
    expect(screen.getByTestId('mode-popover')).toBeInTheDocument()
  })

  it('forwards an override selection from the popover to onOverride', () => {
    const onOverride = vi.fn()
    render(<ModeIndicator mode="shallow" onOverride={onOverride} />)
    fireEvent.click(screen.getByRole('button', { name: /shallow/i }))
    fireEvent.click(screen.getByRole('button', { name: /force deep/i }))
    expect(onOverride).toHaveBeenCalledWith('deep')
  })
})
