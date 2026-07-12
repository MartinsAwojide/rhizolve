import { describe, expect, it } from 'vitest'
import { buildTreeLayout } from './layout'
import type { WhyNode } from '../chat/types'

function makeNode(overrides: Partial<WhyNode> & Pick<WhyNode, 'id' | 'branch_path' | 'depth'>): WhyNode {
  return {
    hypothesis: 'h',
    gemba_result: 'pending',
    gemba_notes: '',
    is_root_cause: false,
    countermeasure: '',
    ...overrides,
  }
}

describe('buildTreeLayout', () => {
  it('produces one xyflow node per why-tree node', () => {
    const nodes: WhyNode[] = [
      makeNode({ id: 'n1', branch_path: 'root.h1', depth: 1 }),
      makeNode({ id: 'n2', branch_path: 'root.h2', depth: 1 }),
    ]
    const { nodes: xyNodes } = buildTreeLayout(nodes)
    expect(xyNodes).toHaveLength(2)
    expect(xyNodes.map((n) => n.id).sort()).toEqual(['n1', 'n2'])
  })

  it('assigns each node a distinct position', () => {
    const nodes: WhyNode[] = [
      makeNode({ id: 'n1', branch_path: 'root.h1', depth: 1 }),
      makeNode({ id: 'n2', branch_path: 'root.h2', depth: 1 }),
    ]
    const { nodes: xyNodes } = buildTreeLayout(nodes)
    const [a, b] = xyNodes
    expect(a.position).not.toEqual(b.position)
  })

  it('creates an edge between a parent and its child branch_path', () => {
    const nodes: WhyNode[] = [
      makeNode({ id: 'n1', branch_path: 'root.h1', depth: 1 }),
      makeNode({ id: 'n2', branch_path: 'root.h1.h1', depth: 2 }),
    ]
    const { edges } = buildTreeLayout(nodes)
    expect(edges).toEqual([
      expect.objectContaining({ source: 'n1', target: 'n2', type: 'step' }),
    ])
  })

  it('does not create an edge for top-level nodes (no real parent node)', () => {
    const nodes: WhyNode[] = [makeNode({ id: 'n1', branch_path: 'root.h1', depth: 1 })]
    const { edges } = buildTreeLayout(nodes)
    expect(edges).toEqual([])
  })

  it('places deeper nodes further along the depth axis than their parent', () => {
    const nodes: WhyNode[] = [
      makeNode({ id: 'n1', branch_path: 'root.h1', depth: 1 }),
      makeNode({ id: 'n2', branch_path: 'root.h1.h1', depth: 2 }),
    ]
    const { nodes: xyNodes } = buildTreeLayout(nodes)
    const parent = xyNodes.find((n) => n.id === 'n1')!
    const child = xyNodes.find((n) => n.id === 'n2')!
    expect(child.position.y).toBeGreaterThan(parent.position.y)
  })
})
