import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { NodeStatusMarker, type NodeStatus } from './NodeStatusMarker'

// Illustrative/mock data only — this is a UI-shell (no live API calls). Real
// report generation (PDF/AIAG-8D/HMAC signing/audit trail) is the separate,
// unimplemented E08 epic (US-51-US-59); this component does not wire into it.
const MOCK_TREE_NODES: {
  id: string
  label: string
  status: NodeStatus
  x: number
  y: number
  size: number
  parent: string | null
}[] = [
  { id: '1', label: 'Line 3 stops mid-shift', status: 'confirmed', x: 210, y: 34, size: 34, parent: null },
  { id: '1.1', label: 'Belt slips', status: 'ruledOut', x: 96, y: 132, size: 26, parent: '1' },
  { id: '1.2', label: 'Motor overheats', status: 'confirmed', x: 324, y: 132, size: 30, parent: '1' },
  { id: '1.2.1', label: 'Coolant flow low', status: 'ruledOut', x: 244, y: 232, size: 26, parent: '1.2' },
  { id: '1.2.2', label: 'Worn conveyor seal', status: 'rootCause', x: 392, y: 232, size: 32, parent: '1.2' },
]

const MOCK_TLDR =
  'Line 3 stopped roughly twice per shift. Investigation traced the phenomenon through motor ' +
  'overheating to a worn conveyor seal at station 3, confirmed by an on-floor Gemba check. Belt ' +
  'slippage and low coolant flow were ruled out. The countermeasure — seal replacement plus a ' +
  'monthly wear inspection added to preventive maintenance — was accepted.'

const MOCK_ROOT_CAUSE =
  'Worn conveyor seal on line 3, station 3 — allowed debris ingress and drive-motor overheating.'

const MOCK_COUNTERMEASURE =
  'Replace the seal and add a monthly wear inspection to the preventive-maintenance schedule for line 3.'

function orthogonalPath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const midY = a.y + (b.y - a.y) / 2
  return `M ${a.x} ${a.y} L ${a.x} ${midY} L ${b.x} ${midY} L ${b.x} ${b.y}`
}

function FaultTree() {
  const byId = Object.fromEntries(MOCK_TREE_NODES.map((n) => [n.id, n]))
  const edges = MOCK_TREE_NODES.filter((n) => n.parent).map((n) => ({
    from: byId[n.parent as string],
    to: n,
  }))

  return (
    <div className="relative h-[290px] w-full rounded-control border border-border bg-surface-1">
      <svg width="100%" height="290" viewBox="0 20 490 280" className="absolute inset-0">
        {edges.map((e, i) => (
          <path key={i} d={orthogonalPath(e.from, e.to)} fill="none" stroke="var(--color-border-strong)" strokeWidth={1.5} />
        ))}
      </svg>
      {MOCK_TREE_NODES.map((n) => (
        <div
          key={n.id}
          className="absolute flex w-[110px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-xs"
          style={{ left: n.x, top: n.y }}
        >
          <NodeStatusMarker status={n.status} size={n.size} />
          <span className="text-center text-xs text-text-secondary">{n.label}</span>
        </div>
      ))}
    </div>
  )
}

export function ReportScreen() {
  return (
    <div className="flex flex-col gap-lg">
      <div>
        <h1 className="mb-xs text-xl font-medium text-text-primary">Line 3 seal failures</h1>
        <div className="flex flex-wrap gap-xs">
          <Badge tone="neutral">Manufacturing</Badge>
          <Badge tone="accent">ISO 9001</Badge>
          <Badge tone="neutral">Maturity L4</Badge>
          <Badge tone="neutral">Depth 3</Badge>
        </div>
      </div>

      <Card elevation="sm">
        <div className="mb-sm text-xs font-medium text-text-muted">Summary (TL;DR)</div>
        <p data-testid="report-tldr" className="font-voice text-base text-text-primary">
          {MOCK_TLDR}
        </p>
      </Card>

      <div>
        <h2 className="mb-sm text-lg font-medium text-text-primary">Fault tree</h2>
        <FaultTree />
      </div>

      <div className="grid grid-cols-2 gap-md">
        <Card elevation="sm">
          <div className="mb-sm flex items-center gap-sm">
            <NodeStatusMarker status="rootCause" size={20} />
            <span className="text-sm font-medium text-text-primary">Root cause</span>
          </div>
          <p className="text-sm text-text-secondary">{MOCK_ROOT_CAUSE}</p>
        </Card>
        <Card elevation="sm">
          <div className="mb-sm text-sm font-medium text-text-primary">Countermeasure</div>
          <p data-testid="report-countermeasure" className="font-voice text-sm text-text-primary">
            {MOCK_COUNTERMEASURE}
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

      <div
        data-testid="report-signature-footer"
        className="border-t border-border pt-sm font-mono text-xs leading-loose text-text-muted"
      >
        <div>investigation inv-8f21c-3a · model attribution: openrouter/anthropic + cactus (2 nodes)</div>
        <div>sha-256 a3f9e1c7b0d4…82ce · hmac signed · unverified (mock)</div>
      </div>
    </div>
  )
}
