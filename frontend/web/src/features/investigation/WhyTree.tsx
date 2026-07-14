import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { WhyNode as WhyNodeData } from '../chat/types'
import { buildTreeLayout } from './layout'
import { WhyNode } from './WhyNode'

const nodeTypes = { whyNode: WhyNode }

type WhyTreeProps = {
  nodes: WhyNodeData[]
  onNodeClick?: (nodeId: string) => void
}

export function WhyTree({ nodes, onNodeClick }: WhyTreeProps) {
  const { nodes: xyNodes, edges } = buildTreeLayout(nodes)

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={xyNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => onNodeClick?.(node.id)}
        fitView
      />
    </ReactFlowProvider>
  )
}
