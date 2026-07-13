import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PresenceBar } from './PresenceBar'
import type { PresenceParticipant } from '../../hooks/usePresence'

const participants: PresenceParticipant[] = [
  { user_id: 'u1', name: 'A. Rivera', role: 'owner', joined_at: '', editing: false, editing_node: null },
  { user_id: 'u2', name: 'J. Tan', role: 'analyst', joined_at: '', editing: false, editing_node: null },
]

describe('PresenceBar', () => {
  it('renders an avatar per participant', () => {
    render(<PresenceBar participants={participants} driver={null} onExportReport={vi.fn()} />)
    expect(screen.getByText('AR')).toBeInTheDocument()
    expect(screen.getByText('JT')).toBeInTheDocument()
  })

  it('shows a driving badge when a driver is set', () => {
    render(<PresenceBar participants={participants} driver={participants[0]} onExportReport={vi.fn()} />)
    expect(screen.getByText('A. Rivera driving')).toBeInTheDocument()
  })

  it('shows no driving badge when there is no driver', () => {
    render(<PresenceBar participants={participants} driver={null} onExportReport={vi.fn()} />)
    expect(screen.queryByText(/driving/)).not.toBeInTheDocument()
  })

  it('calls onExportReport when the export report button is clicked', () => {
    const onExportReport = vi.fn()
    render(<PresenceBar participants={participants} driver={null} onExportReport={onExportReport} />)
    fireEvent.click(screen.getByRole('button', { name: /export report/i }))
    expect(onExportReport).toHaveBeenCalled()
  })
})
