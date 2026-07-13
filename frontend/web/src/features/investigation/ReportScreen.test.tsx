import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReportScreen } from './ReportScreen'

describe('ReportScreen', () => {
  it('renders the TL;DR summary in the serif voice', () => {
    render(<ReportScreen />)
    expect(screen.getByText('Summary (TL;DR)')).toBeInTheDocument()
    expect(screen.getByTestId('report-tldr')).toHaveClass('font-voice')
  })

  it('renders a static fault-tree with node-status markers', () => {
    render(<ReportScreen />)
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
  })

  it('renders a root cause section', () => {
    render(<ReportScreen />)
    expect(screen.getByText('Root cause')).toBeInTheDocument()
  })

  it('renders a countermeasure section in the serif voice', () => {
    render(<ReportScreen />)
    expect(screen.getByText('Countermeasure')).toBeInTheDocument()
    expect(screen.getByTestId('report-countermeasure')).toHaveClass('font-voice')
  })

  it('renders unwired export buttons', () => {
    render(<ReportScreen />)
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aiag 8d/i })).toBeInTheDocument()
  })

  it('renders a mono signature footer placeholder', () => {
    render(<ReportScreen />)
    expect(screen.getByTestId('report-signature-footer')).toHaveClass('font-mono')
  })
})
