import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/msw/server'
import { ProjectDashboardPage } from './ProjectDashboardPage'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProjectDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProjectDashboardPage', () => {
  it('renders a project card grid, metrics row, attention rail, and a new-project card', async () => {
    server.use(
      http.get('/api/v1/projects', () =>
        HttpResponse.json([
          {
            id: 'proj-1',
            name: 'Glue Line Investigations',
            domain: 'manufacturing',
            description: 'Line 3 investigations',
            visibility: 'private',
            compliance_standards: [],
            maturity_level: 2,
            owner_id: 1,
            status: 'active',
            active_investigation_count: 1,
            member_count: 3,
          },
        ]),
      ),
    )
    renderPage()

    expect(await screen.findByText('Glue Line Investigations')).toBeInTheDocument()
    expect(screen.getByText('New project')).toBeInTheDocument()
    expect(screen.getByLabelText('Needs attention')).toBeInTheDocument()
    expect(screen.getByText('Root causes found')).toBeInTheDocument()
  })
})
