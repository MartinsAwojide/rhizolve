import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/msw/server'
import { NeedsAttentionRail } from './NeedsAttentionRail'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}))

function renderRail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NeedsAttentionRail />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('NeedsAttentionRail', () => {
  it('renders nothing when there are no attention items', async () => {
    renderRail()
    expect(await screen.findByLabelText('Needs attention')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows needs-attention items assigned to the current user', async () => {
    server.use(
      http.get('/api/v1/dashboard/attention', () =>
        HttpResponse.json({
          assignedGemba: [],
          conflicts: [
            {
              id: 1,
              project_id: 'proj-1',
              investigation_id: 'inv-1',
              branch_path: '3.1',
            },
          ],
          quorum: [],
        }),
      ),
    )
    renderRail()
    expect(await screen.findByText(/3\.1/)).toBeInTheDocument()
  })

  it('shows quorum-pending items with a link into the project', async () => {
    server.use(
      http.get('/api/v1/dashboard/attention', () =>
        HttpResponse.json({
          assignedGemba: [],
          conflicts: [],
          quorum: [{ investigation_id: 'inv-2', project_id: 'proj-2', current_depth: 2 }],
        }),
      ),
    )
    renderRail()
    const link = await screen.findByText(/inv-2/)
    expect(link.closest('a')).toHaveAttribute('href', '/projects/proj-2')
  })
})
