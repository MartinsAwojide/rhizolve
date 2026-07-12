import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useWhyTree } from './useWhyTree'
import { buildTreeLayout } from './layout'
import { WhyNode } from './WhyNode'

const nodeTypes = { whyNode: WhyNode }

type WhyTreeProps = {
  projectId: string
  investigationId: string
  onNodeClick?: (nodeId: string) => void
}

export function WhyTree({ projectId, investigationId, onNodeClick }: WhyTreeProps) {
  const { nodes } = useWhyTree(projectId, investigationId)
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
