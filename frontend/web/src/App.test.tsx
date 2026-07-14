import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const useConversationMock = vi.fn()
vi.mock('./features/chat/useConversation', () => ({
  useConversation: (...args: unknown[]) => useConversationMock(...args),
}))

const useParamsMock = vi.fn(() => ({ id: 'proj-1', investigationId: undefined }))
const navigateMock = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useParams: () => useParamsMock(),
    useNavigate: () => navigateMock,
  }
})

const useProjectsMock = vi.fn(() => ({ data: undefined }))
vi.mock('./features/projects/useProjects', () => ({
  useProjects: () => useProjectsMock(),
}))

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
  navigateMock.mockReset()
  useParamsMock.mockReturnValue({ id: 'proj-1', investigationId: undefined })
  useProjectsMock.mockReturnValue({ data: undefined })
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

  it('shows the current project name as the presence-bar title', () => {
    useParamsMock.mockReturnValue({ id: 'proj-1', investigationId: 'inv-1' })
    useProjectsMock.mockReturnValue({
      data: [{ id: 'proj-1', name: 'Line 3 seal failures', active_investigation_id: 'inv-1' }],
    })
    useConversationMock.mockReturnValue(baseConversation({ investigationId: 'inv-1' }))
    renderApp()
    expect(screen.getByTestId('presence-bar-title')).toHaveTextContent('Line 3 seal failures')
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

  it('passes the investigationId route param through to useConversation as the initial id', () => {
    useParamsMock.mockReturnValue({ id: 'proj-1', investigationId: 'inv-9' })
    useConversationMock.mockReturnValue(baseConversation({ investigationId: 'inv-9' }))
    renderApp()
    expect(useConversationMock).toHaveBeenCalledWith('proj-1', 'inv-9')
  })

  it('redirects to the project\'s active investigation when the URL has no investigationId', () => {
    useParamsMock.mockReturnValue({ id: 'proj-1', investigationId: undefined })
    useProjectsMock.mockReturnValue({
      data: [{ id: 'proj-1', active_investigation_id: 'inv-9' }],
    })
    useConversationMock.mockReturnValue(baseConversation())
    renderApp()
    expect(navigateMock).toHaveBeenCalledWith('/projects/proj-1/investigations/inv-9', {
      replace: true,
    })
  })

  it('does not redirect when already on an investigation URL', () => {
    useParamsMock.mockReturnValue({ id: 'proj-1', investigationId: 'inv-9' })
    useProjectsMock.mockReturnValue({
      data: [{ id: 'proj-1', active_investigation_id: 'inv-9' }],
    })
    useConversationMock.mockReturnValue(baseConversation({ investigationId: 'inv-9' }))
    renderApp()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('does not redirect when the project has no active investigation', () => {
    useParamsMock.mockReturnValue({ id: 'proj-1', investigationId: undefined })
    useProjectsMock.mockReturnValue({
      data: [{ id: 'proj-1', active_investigation_id: null }],
    })
    useConversationMock.mockReturnValue(baseConversation())
    renderApp()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('keeps the composer outside the scrolling chat-thread region', () => {
    useConversationMock.mockReturnValue(
      baseConversation({
        investigationId: 'inv-1',
        messages: [{ type: 'shallow', role: 'assistant', content: 'Hi there' }],
      }),
    )
    renderApp()

    const scrollRegion = screen.getByTestId('chat-thread-scroll')
    const composer = screen.getByTestId('chat-composer')

    expect(scrollRegion).toHaveClass('overflow-y-auto')
    expect(scrollRegion.contains(composer)).toBe(false)
    expect(scrollRegion).toContainElement(screen.getByText('Hi there'))
  })

  it('autoscrolls the chat thread to the bottom when a new message arrives', () => {
    useConversationMock.mockReturnValue(
      baseConversation({
        investigationId: 'inv-1',
        messages: [{ type: 'shallow', role: 'assistant', content: 'Hi there' }],
      }),
    )
    const { rerender } = renderApp()

    const scrollRegion = screen.getByTestId('chat-thread-scroll')
    Object.defineProperty(scrollRegion, 'scrollHeight', { value: 500, configurable: true })
    scrollRegion.scrollTop = 0

    useConversationMock.mockReturnValue(
      baseConversation({
        investigationId: 'inv-1',
        messages: [
          { type: 'shallow', role: 'assistant', content: 'Hi there' },
          { type: 'shallow', role: 'user', content: 'Another message' },
        ],
      }),
    )
    rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(scrollRegion.scrollTop).toBe(500)
  })

  it('navigates to the investigation URL after starting a new investigation', async () => {
    const startInvestigation = vi.fn().mockResolvedValue('inv-new')
    useConversationMock.mockReturnValue(baseConversation({ startInvestigation }))
    renderApp()

    fireEvent.change(screen.getByLabelText(/phenomenon/i), {
      target: { value: 'Glue overflowed' },
    })
    fireEvent.click(screen.getByRole('button', { name: /start investigation/i }))

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith('/projects/proj-1/investigations/inv-new'),
    )
  })
})
