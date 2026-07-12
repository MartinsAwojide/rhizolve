import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InvestigationPanel } from './InvestigationPanel'

const useWhyTreeMock = vi.fn()

vi.mock('../../features/investigation/useWhyTree', () => ({
  useWhyTree: (...args: unknown[]) => useWhyTreeMock(...args),
}))

describe('InvestigationPanel', () => {
  it('renders the report placeholder when no investigation exists', () => {
    render(<InvestigationPanel projectId="proj-1" investigationId={null} />)
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Start an investigation to see the why-tree',
    )
  })

  it('renders WhyTree scoped to projectId/investigationId when one exists', () => {
    useWhyTreeMock.mockReturnValue({ nodes: [] })
    render(<InvestigationPanel projectId="proj-1" investigationId="inv-1" />)
    expect(useWhyTreeMock).toHaveBeenCalledWith('proj-1', 'inv-1')
  })

  it('switches to the report tab on click', () => {
    useWhyTreeMock.mockReturnValue({ nodes: [] })
    render(<InvestigationPanel projectId="proj-1" investigationId="inv-1" />)
    fireEvent.click(screen.getByRole('tab', { name: /report/i }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Report placeholder')
  })
})
