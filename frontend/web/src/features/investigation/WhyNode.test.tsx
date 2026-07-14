import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { describe, expect, it } from 'vitest'
import { WhyNode } from './WhyNode'
import type { WhyNode as WhyNodeType } from '../chat/types'

const baseNode: WhyNodeType = {
  id: 'n1',
  branch_path: 'root.h1',
  depth: 1,
  hypothesis: 'Belt worn out',
  gemba_result: 'pending',
  gemba_notes: '',
  is_root_cause: false,
  countermeasure: '',
}

function renderNode(node: WhyNodeType) {
  return render(
    <ReactFlowProvider>
      <WhyNode
        id={node.id}
        data={{ node }}
        type="whyNode"
        selected={false}
        isConnectable={false}
        zIndex={0}
        dragging={false}
        draggable={false}
        selectable={false}
        deletable={false}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
      />
    </ReactFlowProvider>,
  )
}

describe('WhyNode', () => {
  it('renders the hypothesis text and testid', () => {
    renderNode(baseNode)
    expect(screen.getByTestId('why-node')).toBeInTheDocument()
    expect(screen.getByText('Belt worn out')).toBeInTheDocument()
  })

  it.each([
    [{ ...baseNode }, 'active'],
    [{ ...baseNode, gemba_result: 'OK' as const }, 'ruledOut'],
    [{ ...baseNode, gemba_result: 'NOK' as const }, 'confirmed'],
    [{ ...baseNode, is_root_cause: true }, 'rootCause'],
    [{ ...baseNode, status: 'suspended' as const }, 'suspended'],
    [{ ...baseNode, conflict: true }, 'conflict'],
  ])('sets data-status to %s for the derived status', (node, expected) => {
    renderNode(node)
    expect(screen.getByTestId('why-node')).toHaveAttribute('data-status', expected)
  })

  it('shows no gemba badge while a hypothesis is still pending', () => {
    renderNode(baseNode)
    expect(screen.queryByTestId('why-node-gemba-badge')).not.toBeInTheDocument()
  })

  it('shows a green OK badge when the gemba check passed (ruled out)', () => {
    renderNode({ ...baseNode, gemba_result: 'OK' })
    const badge = screen.getByTestId('why-node-gemba-badge')
    expect(badge).toHaveTextContent('OK')
    expect(badge).toHaveClass('bg-success')
  })

  it('shows a red NOK badge when the gemba check failed (confirmed)', () => {
    renderNode({ ...baseNode, gemba_result: 'NOK' })
    const badge = screen.getByTestId('why-node-gemba-badge')
    expect(badge).toHaveTextContent('NOK')
    expect(badge).toHaveClass('bg-danger')
  })

  it('shows a red NOK badge for a ROOT_CAUSE gemba result', () => {
    renderNode({ ...baseNode, gemba_result: 'ROOT_CAUSE' })
    const badge = screen.getByTestId('why-node-gemba-badge')
    expect(badge).toHaveTextContent('NOK')
    expect(badge).toHaveClass('bg-danger')
  })
})
