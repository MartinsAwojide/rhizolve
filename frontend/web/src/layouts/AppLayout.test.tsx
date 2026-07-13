import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from './AppLayout'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}))

function renderLayout(props: Parameters<typeof AppLayout>[0] = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AppLayout {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function setViewport(width: number) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => {
      const minWidthMatch = /min-width:\s*(\d+)px/.exec(query)
      const maxWidthMatch = /max-width:\s*(\d+)px/.exec(query)
      let matches = true
      if (minWidthMatch) matches &&= width >= Number(minWidthMatch[1])
      if (maxWidthMatch) matches &&= width <= Number(maxWidthMatch[1])
      return {
        matches,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }
    }),
  )
}

beforeEach(() => setViewport(1440))
afterEach(() => vi.unstubAllGlobals())

describe('AppLayout', () => {
  it('shows all three columns at 1440px', () => {
    setViewport(1440)
    renderLayout()
    expect(screen.getByTestId('sidebar')).toBeVisible()
    expect(screen.getByTestId('investigation-panel')).toBeVisible()
  })

  it('collapses investigation panel below 1280px', () => {
    setViewport(1024)
    renderLayout()
    expect(screen.getByTestId('sidebar')).toBeVisible()
    expect(screen.queryByTestId('investigation-panel')).not.toBeVisible()
  })

  it('collapses both sidebar and investigation panel below 768px', () => {
    setViewport(600)
    renderLayout()
    expect(screen.queryByTestId('sidebar')).not.toBeVisible()
    expect(screen.queryByTestId('investigation-panel')).not.toBeVisible()
  })

  it('hides the investigation panel when there is no active investigation', () => {
    setViewport(1440)
    renderLayout({ hasActiveInvestigation: false })
    expect(screen.queryByTestId('investigation-panel')).not.toBeVisible()
  })
})
