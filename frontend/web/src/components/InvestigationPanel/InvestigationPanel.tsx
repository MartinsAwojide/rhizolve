import { useState } from 'react'
import type { WhyNode } from '../../features/chat/types'
import { WhyTree } from '../../features/investigation/WhyTree'
import { useWhyTree } from '../../features/investigation/useWhyTree'
import { NodeStatusMarker, type NodeStatus } from '../../features/investigation/NodeStatusMarker'
import { ReportScreen } from '../../features/investigation/ReportScreen'

const TABS = ['why-tree', 'report'] as const
type Tab = (typeof TABS)[number]

const LEGEND: { status: NodeStatus; label: string }[] = [
  { status: 'active', label: 'Active' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'ruledOut', label: 'Ruled out' },
  { status: 'rootCause', label: 'Root cause' },
  { status: 'suspended', label: 'Suspended' },
  { status: 'conflict', label: 'Conflict' },
]

type InvestigationPanelProps = {
  projectId: string
  investigationId: string | null
  onNodeClick?: (nodeId: string) => void
  activeTab?: Tab
  onTabChange?: (tab: Tab) => void
}

export function InvestigationPanel({
  projectId,
  investigationId,
  onNodeClick,
  activeTab: controlledTab,
  onTabChange,
}: InvestigationPanelProps) {
  const [internalTab, setInternalTab] = useState<Tab>('why-tree')
  const [legendOpen, setLegendOpen] = useState(false)
  const activeTab = controlledTab ?? internalTab
  const { nodes } = useWhyTree(projectId, investigationId ?? '')
  const setActiveTab = (tab: Tab) => {
    if (onTabChange) {
      onTabChange(tab)
    } else {
      setInternalTab(tab)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-sm p-sm">
        <div role="tablist" aria-label="Investigation panel" className="flex gap-xs">
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className="rounded-control px-sm py-xs text-sm capitalize"
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setLegendOpen((open) => !open)}
          className="rounded-control px-sm py-xs text-xs text-text-secondary"
        >
          Legend
        </button>
      </div>

      {legendOpen && (
        <div className="flex flex-wrap gap-sm border-b border-border px-sm pb-sm">
          {LEGEND.map(({ status, label }) => (
            <span key={status} className="flex items-center gap-xs text-xs text-text-secondary">
              <NodeStatusMarker status={status} size={16} />
              {label}
            </span>
          ))}
        </div>
      )}

      <div role="tabpanel" className="flex-1 p-md text-text-muted">
        {activeTab === 'why-tree' ? (
          investigationId ? (
            <WhyTree nodes={nodes} onNodeClick={onNodeClick} />
          ) : (
            'Start an investigation to see the why-tree'
          )
        ) : (
          <ReportScreen />
        )}
      </div>

      {investigationId && <TreeFooter nodes={nodes} />}
    </div>
  )
}

function TreeFooter({ nodes }: { nodes: WhyNode[] }) {
  if (nodes.length === 0) return null

  const rootCauseCount = nodes.filter((n) => n.is_root_cause).length
  const maxDepth = nodes.reduce((max, n) => Math.max(max, n.depth), 0)

  return (
    <div className="border-t border-border p-sm font-mono text-xs text-text-muted">
      depth {maxDepth} · {nodes.length} nodes · {rootCauseCount} root cause
      {rootCauseCount === 1 ? '' : 's'}
    </div>
  )
}
