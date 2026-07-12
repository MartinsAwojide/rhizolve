import type { WhyNode } from '../chat/types'

export type NodeStatus =
  | 'active'
  | 'confirmed'
  | 'ruledOut'
  | 'rootCause'
  | 'suspended'
  | 'conflict'

export function deriveNodeStatus(node: WhyNode): NodeStatus {
  if (node.conflict) return 'conflict'
  if (node.is_root_cause) return 'rootCause'
  if (node.status === 'suspended') return 'suspended'
  if (node.gemba_result === 'NOK') return 'confirmed'
  if (node.gemba_result === 'OK') return 'ruledOut'
  return 'active'
}
