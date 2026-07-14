import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WhyTree } from './WhyTree'
import type { WhyNode } from '../chat/types'

const nodes: WhyNode[] = [
  {
    id: 'n1',
    branch_path: 'root.h1',
    depth: 1,
    hypothesis: 'Belt worn out',
    gemba_result: 'pending',
    gemba_notes: '',
    is_root_cause: false,
    countermeasure: '',
  },
  {
    id: 'n2',
    branch_path: 'root.h1.h1',
    depth: 2,
    hypothesis: 'Seal cracked',
    gemba_result: 'pending',
    gemba_notes: '',
    is_root_cause: false,
    countermeasure: '',
  },
]

describe('WhyTree', () => {
  it('renders one WhyNode per tree node', () => {
    render(<WhyTree nodes={nodes} />)
    expect(screen.getAllByTestId('why-node')).toHaveLength(2)
  })

  it('calls onNodeClick with the clicked node id', () => {
    const onNodeClick = vi.fn()
    render(<WhyTree nodes={nodes} onNodeClick={onNodeClick} />)
    fireEvent.click(screen.getByText('Belt worn out'))
    expect(onNodeClick).toHaveBeenCalledWith('n1')
  })
})
