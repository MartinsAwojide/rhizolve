import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ReportScreen } from './ReportScreen'
import type { WhyNode } from '../chat/types'

const authFetchMock = vi.fn()

vi.mock('../../hooks/useAuthFetch', () => ({
  useAuthFetch: () => authFetchMock,
}))

const rootHypothesis: WhyNode = {
  id: 'n1',
  branch_path: 'root.h1',
  depth: 1,
  hypothesis: 'Worn conveyor seal',
  gemba_result: 'NOK',
  gemba_notes: '',
  is_root_cause: true,
  countermeasure: 'Replace the seal monthly',
}

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ReportScreen projectId="proj-1" investigationId="inv-1" />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  authFetchMock.mockReset()
  authFetchMock.mockResolvedValue({
    investigation_id: 'inv-1',
    phenomenon: 'Line 3 seal failures',
    domain: 'manufacturing',
    why_nodes: [rootHypothesis],
    root_cause: 'Worn conveyor seal',
    countermeasure: 'Replace the seal monthly',
  })
})

describe('ReportScreen', () => {
  it('renders the phenomenon as the title', async () => {
    renderScreen()
    expect(await screen.findByText('Line 3 seal failures')).toBeInTheDocument()
  })

  it('renders a fault-tree node-status marker per why-node', async () => {
    renderScreen()
    await screen.findByText('Line 3 seal failures')
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
  })

  it('renders the real root cause', async () => {
    renderScreen()
    const rootCause = await screen.findByTestId('report-root-cause')
    await waitFor(() => expect(rootCause).toHaveTextContent('Worn conveyor seal'))
  })

  it('renders the real countermeasure in the serif voice', async () => {
    renderScreen()
    const countermeasure = await screen.findByTestId('report-countermeasure')
    await waitFor(() => expect(countermeasure).toHaveTextContent('Replace the seal monthly'))
    expect(countermeasure).toHaveClass('font-voice')
  })

  it('renders a placeholder message when no root cause has been found yet', async () => {
    authFetchMock.mockResolvedValue({
      investigation_id: 'inv-1',
      phenomenon: 'Line 3 seal failures',
      domain: 'manufacturing',
      why_nodes: [],
      root_cause: null,
      countermeasure: null,
    })
    renderScreen()
    expect(
      await screen.findByText(/not conclusively identified/i),
    ).toBeInTheDocument()
  })

  it('renders unwired export buttons', async () => {
    renderScreen()
    await screen.findByText('Line 3 seal failures')
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aiag 8d/i })).toBeInTheDocument()
  })
})
