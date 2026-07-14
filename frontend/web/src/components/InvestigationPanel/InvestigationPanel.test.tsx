import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvestigationPanel } from './InvestigationPanel'

const useWhyTreeMock = vi.fn()
const authFetchMock = vi.fn()

vi.mock('../../features/investigation/useWhyTree', () => ({
  useWhyTree: (...args: unknown[]) => useWhyTreeMock(...args),
}))

vi.mock('../../hooks/useAuthFetch', () => ({
  useAuthFetch: () => authFetchMock,
}))

function renderPanel(props: Parameters<typeof InvestigationPanel>[0]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <InvestigationPanel {...props} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  useWhyTreeMock.mockReset()
  useWhyTreeMock.mockReturnValue({ nodes: [] })
  authFetchMock.mockReset()
  authFetchMock.mockResolvedValue({
    investigation_id: 'inv-1',
    phenomenon: 'Glue overflowed',
    domain: 'manufacturing',
    why_nodes: [],
    root_cause: null,
    countermeasure: null,
  })
})

describe('InvestigationPanel', () => {
  it('renders the report placeholder when no investigation exists', () => {
    renderPanel({ projectId: 'proj-1', investigationId: null })
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Start an investigation to see the why-tree',
    )
  })

  it('renders WhyTree scoped to projectId/investigationId when one exists', () => {
    useWhyTreeMock.mockReturnValue({ nodes: [] })
    renderPanel({ projectId: 'proj-1', investigationId: 'inv-1' })
    expect(useWhyTreeMock).toHaveBeenCalledWith('proj-1', 'inv-1')
  })

  it('calls useWhyTree exactly once, shared between the tree view and the footer', () => {
    useWhyTreeMock.mockReturnValue({ nodes: [] })
    renderPanel({ projectId: 'proj-1', investigationId: 'inv-1' })
    expect(useWhyTreeMock).toHaveBeenCalledTimes(1)
  })

  it('switches to the report tab on click', () => {
    useWhyTreeMock.mockReturnValue({ nodes: [] })
    renderPanel({ projectId: 'proj-1', investigationId: 'inv-1' })
    fireEvent.click(screen.getByRole('tab', { name: /report/i }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Fault tree')
  })

  it('hides the legend by default and shows it after toggling', () => {
    useWhyTreeMock.mockReturnValue({ nodes: [] })
    renderPanel({ projectId: 'proj-1', investigationId: 'inv-1' })
    expect(screen.queryByText('Ruled out')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /legend/i }))
    expect(screen.getByText('Ruled out')).toBeInTheDocument()
    expect(screen.getByText('Root cause')).toBeInTheDocument()
    expect(screen.getByText('Conflict')).toBeInTheDocument()
  })

  it('respects a controlled activeTab prop and reports changes via onTabChange', () => {
    useWhyTreeMock.mockReturnValue({ nodes: [] })
    const onTabChange = vi.fn()
    renderPanel({
      projectId: 'proj-1',
      investigationId: 'inv-1',
      activeTab: 'report',
      onTabChange,
    })
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Fault tree')
    fireEvent.click(screen.getByRole('tab', { name: /why tree/i }))
    expect(onTabChange).toHaveBeenCalledWith('why-tree')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Fault tree')
  })

  it('shows a mono footer summarizing depth, node count, and root causes', () => {
    useWhyTreeMock.mockReturnValue({
      nodes: [
        { id: '1', branch_path: '0', depth: 1, hypothesis: 'a', gemba_result: 'pending', gemba_notes: '', is_root_cause: false, countermeasure: '' },
        { id: '2', branch_path: '0.0', depth: 2, hypothesis: 'b', gemba_result: 'NOK', gemba_notes: '', is_root_cause: true, countermeasure: '' },
      ],
    })
    renderPanel({ projectId: 'proj-1', investigationId: 'inv-1' })
    expect(screen.getByText('depth 2 · 2 nodes · 1 root cause')).toBeInTheDocument()
  })
})
