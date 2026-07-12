import { Handle, Position, type NodeProps } from '@xyflow/react'
import { deriveNodeStatus } from './nodeStyle'
import type { WhyNode as WhyNodeType } from '../chat/types'

type WhyNodeData = {
  node: WhyNodeType
}

const STATUS_CLASS: Record<string, string> = {
  active: 'border-node-active bg-node-active/10',
  confirmed: 'border-node-confirmed bg-node-confirmed/10',
  ruledOut: 'border-node-ruled-out',
  rootCause: 'border-node-root-cause bg-node-root-cause/10',
  suspended: 'border-node-suspended border-dashed',
  conflict: 'border-node-conflict',
}

export function WhyNode({ data }: NodeProps<{ data: WhyNodeData } & Record<string, unknown>>) {
  const { node } = data as WhyNodeData
  const status = deriveNodeStatus(node)

  return (
    <div
      data-testid="why-node"
      data-status={status}
      className={`rounded-card border-2 bg-surface-2 p-sm text-sm text-text-primary ${STATUS_CLASS[status]}`}
    >
      <Handle type="target" position={Position.Top} />
      {node.hypothesis}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
