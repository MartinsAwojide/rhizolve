import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GembaCheckCard } from './GembaCheckCard'

describe('GembaCheckCard', () => {
  it('exposes the data-testid and shows hypothesis/instructions', () => {
    render(
      <GembaCheckCard hypothesis="Belt worn out" instructions="Inspect belt" onSubmit={vi.fn()} />,
    )
    expect(screen.getByTestId('gemba-check-card')).toBeInTheDocument()
    expect(screen.getByText('Belt worn out')).toBeInTheDocument()
    expect(screen.getByText('Inspect belt')).toBeInTheDocument()
  })

  it('disables submit until a result is selected', () => {
    render(
      <GembaCheckCard hypothesis="Belt worn out" instructions="Inspect belt" onSubmit={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: /^submit$/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: 'OK' }))
    expect(screen.getByRole('button', { name: /^submit$/i })).not.toBeDisabled()
  })

  it('submits the selected result', () => {
    const onSubmit = vi.fn()
    render(
      <GembaCheckCard hypothesis="Belt worn out" instructions="Inspect belt" onSubmit={onSubmit} />,
    )
    fireEvent.click(screen.getByRole('radio', { name: 'NOK' }))
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'NOK', attachments: [] }),
    )
  })

  it('includes uploaded attachments in the submit payload', () => {
    const onSubmit = vi.fn()
    render(
      <GembaCheckCard hypothesis="Belt worn out" instructions="Inspect belt" onSubmit={onSubmit} />,
    )
    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText(/attachment/i), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('radio', { name: 'OK' }))
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ attachments: [file] }))
  })
})
