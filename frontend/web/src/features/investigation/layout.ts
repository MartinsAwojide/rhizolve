import { hierarchy, tree } from 'd3-hierarchy'
import type { WhyNode } from '../chat/types'

export type XYFlowNode = {
  id: string
  type: 'whyNode'
  position: { x: number; y: number }
  data: { node: WhyNode }
}

export type XYFlowEdge = {
  id: string
  source: string
  target: string
  type: 'step'
}

const NODE_WIDTH = 220
const NODE_HEIGHT = 120

type TreeItem = {
  id: string
  node: WhyNode | null
  children: TreeItem[]
}

function parentBranchPath(branchPath: string): string {
  const lastDot = branchPath.lastIndexOf('.')
  return lastDot === -1 ? '' : branchPath.slice(0, lastDot)
}

function buildHierarchy(nodes: WhyNode[]): TreeItem {
  const itemByPath = new Map<string, TreeItem>()
  for (const node of nodes) {
    itemByPath.set(node.branch_path, { id: node.id, node, children: [] })
  }

  const root: TreeItem = { id: '__root__', node: null, children: [] }

  for (const node of nodes) {
    const item = itemByPath.get(node.branch_path)!
    const parent = itemByPath.get(parentBranchPath(node.branch_path))
    ;(parent ?? root).children.push(item)
  }

  return root
}

export function buildTreeLayout(nodes: WhyNode[]): {
  nodes: XYFlowNode[]
  edges: XYFlowEdge[]
} {
  const root = hierarchy(buildHierarchy(nodes), (d) => d.children)
  const layout = tree<TreeItem>().nodeSize([NODE_WIDTH, NODE_HEIGHT])(root)

  const xyNodes: XYFlowNode[] = []
  const edges: XYFlowEdge[] = []

  for (const descendant of layout.descendants()) {
    if (descendant.data.node === null) continue
    xyNodes.push({
      id: descendant.data.id,
      type: 'whyNode',
      position: { x: descendant.x, y: descendant.y },
      data: { node: descendant.data.node },
    })
    const parent = descendant.parent
    if (parent && parent.data.node !== null) {
      edges.push({
        id: `e-${parent.data.id}-${descendant.data.id}`,
        source: parent.data.id,
        target: descendant.data.id,
        type: 'step',
      })
    }
  }

  return { nodes: xyNodes, edges }
}
