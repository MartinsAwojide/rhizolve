import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../../test/msw/server'
import { ProjectSidebar } from './ProjectSidebar'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}))

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

function renderSidebar(currentProjectId?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProjectSidebar currentProjectId={currentProjectId} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const projects = [
  {
    id: 'proj-1',
    name: 'Glue Line Investigations',
    domain: 'manufacturing',
    description: null,
    maturity_level: 4,
    status: 'active' as const,
    active_investigation_count: 1,
    member_count: 3,
  },
  {
    id: 'proj-2',
    name: 'Checkout latency spikes',
    domain: 'software',
    description: null,
    maturity_level: 2,
    status: 'active' as const,
    active_investigation_count: 0,
    member_count: 2,
  },
]

describe('ProjectSidebar', () => {
  it('renders the logo linking to the projects dashboard', async () => {
    server.use(http.get('/api/v1/projects', () => HttpResponse.json(projects)))
    renderSidebar()
    expect(await screen.findByText('Glue Line Investigations')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Rhizolve' }).closest('a')).toHaveAttribute('href', '/projects')
  })

  it('renders a nav item per project', async () => {
    server.use(http.get('/api/v1/projects', () => HttpResponse.json(projects)))
    renderSidebar()
    expect(await screen.findByText('Glue Line Investigations')).toBeInTheDocument()
    expect(screen.getByText('Checkout latency spikes')).toBeInTheDocument()
  })

  it('links the new-project button to /projects/new', async () => {
    server.use(http.get('/api/v1/projects', () => HttpResponse.json(projects)))
    renderSidebar()
    await screen.findByText('Glue Line Investigations')
    expect(screen.getByRole('link', { name: /new project/i })).toHaveAttribute('href', '/projects/new')
  })

  it('shows the mono footer for the current project', async () => {
    server.use(http.get('/api/v1/projects', () => HttpResponse.json(projects)))
    renderSidebar('proj-1')
    await screen.findByText('Glue Line Investigations')
    expect(screen.getByText('proj-1 · L4 · manufacturing')).toBeInTheDocument()
  })
})
