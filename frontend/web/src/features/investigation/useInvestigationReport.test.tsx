import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useInvestigationReport } from './useInvestigationReport'

const authFetchMock = vi.fn()

vi.mock('../../hooks/useAuthFetch', () => ({
  useAuthFetch: () => authFetchMock,
}))

beforeEach(() => {
  authFetchMock.mockReset()
})

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useInvestigationReport', () => {
  it('fetches the report for the given project and investigation', async () => {
    authFetchMock.mockResolvedValue({
      investigation_id: 'inv-1',
      phenomenon: 'Glue overflowed',
      domain: 'manufacturing',
      why_nodes: [],
      root_cause: null,
      countermeasure: null,
    })
    const { result } = renderHook(() => useInvestigationReport('proj-1', 'inv-1'), { wrapper })

    await waitFor(() => expect(result.current.data?.phenomenon).toBe('Glue overflowed'))
    expect(authFetchMock).toHaveBeenCalledWith(
      '/api/v1/projects/proj-1/investigations/inv-1/report',
    )
  })

  it('does not fetch when investigationId is empty', () => {
    renderHook(() => useInvestigationReport('proj-1', ''), { wrapper })
    expect(authFetchMock).not.toHaveBeenCalled()
  })
})
