import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const useConversationMock = vi.fn()
vi.mock('./features/chat/useConversation', () => ({
  useConversation: (...args: unknown[]) => useConversationMock(...args),
}))

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useParams: () => ({ id: 'proj-1' }) }
})

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}))

vi.mock('./features/investigation/useWhyTree', () => ({
  useWhyTree: () => ({ nodes: [] }),
}))

vi.mock('./hooks/usePresence', () => ({
  usePresence: () => ({ participants: [], driver: null }),
}))

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const whyTreeOnNodeClick = { current: null as ((nodeId: string) => void) | null }
vi.mock('./features/investigation/WhyTree', () => ({
  WhyTree: ({ onNodeClick }: { onNodeClick?: (nodeId: string) => void }) => {
    whyTreeOnNodeClick.current = onNodeClick ?? null
    return <div data-testid="why-tree-stub" />
  },
}))

function baseConversation(overrides: Record<string, unknown> = {}) {
  return {
    messages: [],
    btwMessages: [],
    btwOpen: false,
    closeBtw: vi.fn(),
    mode: 'shallow',
    overrideMode: vi.fn(),
    sendMessage: vi.fn(),
    investigationId: null,
    startInvestigation: vi.fn(),
    submitHypothesisReview: vi.fn(),
    submitValidatorReview: vi.fn(),
    submitCountermeasureReview: vi.fn(),
    submitGembaResult: vi.fn(),
    ...overrides,
  }
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

beforeEach(() => {
  useConversationMock.mockReset()
  whyTreeOnNodeClick.current = null
  setViewport(1440)
})

describe('App', () => {
  it('renders chat messages via ChatThread', () => {
    useConversationMock.mockReturnValue(
      baseConversation({
        messages: [{ type: 'shallow', role: 'assistant', content: 'Hi there' }],
      }),
    )
    renderApp()
    expect(screen.getByText('Hi there')).toBeInTheDocument()
  })

  it('renders the start-investigation form when there is no active investigation', () => {
    useConversationMock.mockReturnValue(baseConversation())
    renderApp()
    expect(
      screen.getByRole('button', { name: /start investigation/i }),
    ).toBeInTheDocument()
  })

  it('submits the start-investigation form via startInvestigation', () => {
    const startInvestigation = vi.fn()
    useConversationMock.mockReturnValue(baseConversation({ startInvestigation }))
    renderApp()

    fireEvent.change(screen.getByLabelText(/phenomenon/i), {
      target: { value: 'Glue overflowed' },
    })
    fireEvent.click(screen.getByRole('button', { name: /start investigation/i }))

    expect(startInvestigation).toHaveBeenCalledWith('Glue overflowed')
  })

  it('does not render the start-investigation form once an investigation exists', () => {
    useConversationMock.mockReturnValue(baseConversation({ investigationId: 'inv-1' }))
    renderApp()
    expect(
      screen.queryByRole('button', { name: /start investigation/i }),
    ).not.toBeInTheDocument()
  })

  it('renders the WhyTree stub once an investigation exists', () => {
    useConversationMock.mockReturnValue(baseConversation({ investigationId: 'inv-1' }))
    renderApp()
    expect(screen.getByTestId('why-tree-stub')).toBeInTheDocument()
  })

  it('scrolls the matching chat node into view when the why-tree reports a node click', () => {
    const node = {
      id: 'n1',
      branch_path: 'root.h1',
      depth: 1,
      hypothesis: 'seal wear',
      gemba_result: 'NOK' as const,
      gemba_notes: '',
      is_root_cause: false,
      countermeasure: '',
    }
    useConversationMock.mockReturnValue(
      baseConversation({
        investigationId: 'inv-1',
        messages: [{ type: 'interrupt', interrupt_type: 'gemba_result_review', node }],
      }),
    )
    renderApp()

    const wrapper = screen.getByTestId('node-message-wrapper')
    const scrollSpy = vi.fn()
    wrapper.scrollIntoView = scrollSpy

    whyTreeOnNodeClick.current?.('n1')

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' })
  })
})
