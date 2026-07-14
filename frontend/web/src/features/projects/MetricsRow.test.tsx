import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/msw/server'
import { MetricsRow } from './MetricsRow'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}))

function renderRow() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MetricsRow />
    </QueryClientProvider>,
  )
}

describe('MetricsRow', () => {
  it('renders the four org-scoped metrics', async () => {
    server.use(
      http.get('/api/v1/dashboard/metrics', () =>
        HttpResponse.json({
          active_investigations: 4,
          root_causes_found: 7,
          average_depth_to_cause: 3.5,
          gemba_completion_rate: 0.8,
        }),
      ),
    )
    renderRow()
    expect(await screen.findByText('4')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3.5')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
  })

  it('renders a dash for null metrics', async () => {
    server.use(
      http.get('/api/v1/dashboard/metrics', () =>
        HttpResponse.json({
          active_investigations: 0,
          root_causes_found: 0,
          average_depth_to_cause: null,
          gemba_completion_rate: null,
        }),
      ),
    )
    renderRow()
    expect(await screen.findAllByText('—')).toHaveLength(2)
  })

  it('uses a responsive grid matching AppLayout breakpoints', () => {
    server.use(
      http.get('/api/v1/dashboard/metrics', () => HttpResponse.json({})),
    )
    const { container } = renderRow()
    const grid = container.firstElementChild
    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-2', 'xl:grid-cols-4')
  })
})
