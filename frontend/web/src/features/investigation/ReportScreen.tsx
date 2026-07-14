import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import type { WhyNode } from '../chat/types'
import { buildTreeLayout } from './layout'
import { deriveNodeStatus } from './nodeStyle'
import { NodeStatusMarker } from './NodeStatusMarker'
import { useInvestigationReport } from './useInvestigationReport'

// Export (PDF/Markdown/AIAG-8D/HMAC signing/audit trail) is the separate,
// unimplemented E08 epic (US-51-US-59) — the buttons below stay unwired.

function orthogonalPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const midY = a.y + (b.y - a.y) / 2
  return `M ${a.x} ${a.y} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y}`
}

const FAULT_TREE_WIDTH = 460
const FAULT_TREE_HEIGHT = 260
const FAULT_TREE_PADDING = 40

function FaultTree({ whyNodes }: { whyNodes: WhyNode[] }) {
  const { nodes, edges } = buildTreeLayout(whyNodes)
  const xs = nodes.map((n) => n.position.x)
  const ys = nodes.map((n) => n.position.y)
  const minX = Math.min(...xs, 0)
  const maxX = Math.max(...xs, 0)
  const minY = Math.min(...ys, 0)
  const maxY = Math.max(...ys, 0)
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const scaleX = (FAULT_TREE_WIDTH - 2 * FAULT_TREE_PADDING) / spanX
  const scaleY = (FAULT_TREE_HEIGHT - 2 * FAULT_TREE_PADDING) / spanY

  const positioned = new Map(
    nodes.map((n) => [
      n.id,
      {
        x: FAULT_TREE_PADDING + (n.position.x - minX) * scaleX,
        y: FAULT_TREE_PADDING + (n.position.y - minY) * scaleY,
        node: n.data.node,
      },
    ]),
  )

  return (
    <div className="relative h-[290px] w-full rounded-control border border-border bg-surface-1">
      <svg
        width="100%"
        height="290"
        viewBox={`0 0 ${FAULT_TREE_WIDTH} ${FAULT_TREE_HEIGHT + FAULT_TREE_PADDING}`}
        className="absolute inset-0"
      >
        {edges.map((e) => {
          const from = positioned.get(e.source)
          const to = positioned.get(e.target)
          if (!from || !to) return null
          return (
            <path
              key={e.id}
              d={orthogonalPath(from, to)}
              fill="none"
              stroke="var(--color-border-strong)"
              strokeWidth={1.5}
            />
          )
        })}
      </svg>
      {Array.from(positioned.entries()).map(([id, { x, y, node }]) => (
        <div
          key={id}
          className="absolute flex w-[110px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-xs"
          style={{ left: x, top: y }}
        >
          <NodeStatusMarker status={deriveNodeStatus(node)} size={node.is_root_cause ? 32 : 26} />
          <span className="text-center text-xs text-text-secondary">{node.hypothesis}</span>
        </div>
      ))}
    </div>
  )
}

type ReportScreenProps = {
  projectId: string
  investigationId: string
}

export function ReportScreen({ projectId, investigationId }: ReportScreenProps) {
  const { data } = useInvestigationReport(projectId, investigationId)

  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="mb-xs text-xl font-medium text-text-primary">
          {data?.phenomenon || 'Investigation report'}
        </h1>
        <div className="flex flex-wrap gap-xs">
          {data?.domain && <Badge tone="neutral">{data.domain}</Badge>}
          <Badge tone="neutral">
            Depth {data?.why_nodes.reduce((max, n) => Math.max(max, n.depth), 0) ?? 0}
          </Badge>
        </div>
      </div>

      <div>
        <h2 className="mb-sm text-lg font-medium text-text-primary">Fault tree</h2>
        <FaultTree whyNodes={data?.why_nodes ?? []} />
      </div>

      <div className="grid grid-cols-2 gap-md">
        <Card elevation="sm">
          <div className="mb-sm flex items-center gap-sm">
            <NodeStatusMarker status="rootCause" size={20} />
            <span className="text-sm font-medium text-text-primary">Root cause</span>
          </div>
          <p data-testid="report-root-cause" className="text-sm text-text-secondary">
            {data?.root_cause || 'Not conclusively identified within the configured max depth.'}
          </p>
        </Card>
        <Card elevation="sm">
          <div className="mb-sm text-sm font-medium text-text-primary">Countermeasure</div>
          <p data-testid="report-countermeasure" className="font-voice text-sm text-text-primary">
            {data?.countermeasure || 'Not yet proposed.'}
          </p>
        </Card>
      </div>

      <div>
        <h2 className="mb-sm text-lg font-medium text-text-primary">Export</h2>
        <div className="flex flex-wrap gap-sm">
          <Button variant="primary">Download PDF</Button>
          <Button variant="secondary">Markdown</Button>
          <Button variant="secondary">AIAG 8D</Button>
          <Button variant="ghost">Download all (ZIP)</Button>
        </div>
      </div>
    </div>
  )
}
