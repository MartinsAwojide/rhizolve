import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { deriveNodeStatus } from './nodeStyle'
import type { WhyNode as WhyNodeType } from '../chat/types'

type WhyNodeData = {
  node: WhyNodeType
}

export type WhyNodeFlowNode = Node<WhyNodeData, 'whyNode'>

const STATUS_CLASS: Record<string, string> = {
  active: 'border-node-active bg-node-active/10',
  confirmed: 'border-node-confirmed bg-node-confirmed/10',
  ruledOut: 'border-node-ruled-out',
  rootCause: 'border-node-root-cause bg-node-root-cause/10',
  suspended: 'border-node-suspended border-dashed',
  conflict: 'border-node-conflict',
}

const GEMBA_BADGE: Record<'OK' | 'NOK', string> = {
  OK: 'bg-success text-on-accent',
  NOK: 'bg-danger text-on-accent',
}

function gembaBadgeLabel(result: WhyNodeType['gemba_result']): 'OK' | 'NOK' | null {
  if (result === 'OK') return 'OK'
  if (result === 'NOK' || result === 'ROOT_CAUSE') return 'NOK'
  return null
}

export function WhyNode({ data }: NodeProps<WhyNodeFlowNode>) {
  const { node } = data
  const status = deriveNodeStatus(node)
  const badgeLabel = gembaBadgeLabel(node.gemba_result)

  return (
    <div className="flex items-center gap-sm">
      <div
        data-testid="why-node"
        data-status={status}
        className={`rounded-card border-2 bg-surface-2 p-sm text-sm text-text-primary ${STATUS_CLASS[status]}`}
      >
        <Handle type="target" position={Position.Left} />
        {node.hypothesis}
        <Handle type="source" position={Position.Right} />
      </div>
      {badgeLabel && (
        <span
          data-testid="why-node-gemba-badge"
          className={`rounded-pill px-sm py-xs text-xs font-medium ${GEMBA_BADGE[badgeLabel]}`}
        >
          {badgeLabel}
        </span>
      )}
    </div>
  )
}
