import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/msw/server'
import { useProjects } from './useProjects'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useProjects', () => {
  it('fetches and returns the project list', async () => {
    server.use(
      http.get('/api/v1/projects', () =>
        HttpResponse.json([
          {
            id: 'proj-1',
            name: 'Glue Line Investigations',
            domain: 'manufacturing',
            description: 'Line 3 investigations',
            maturity_level: 2,
            status: 'active',
            active_investigation_count: 1,
            member_count: 3,
          },
        ]),
      ),
    )

    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(result.current.data?.[0].name).toBe('Glue Line Investigations')
  })
})
