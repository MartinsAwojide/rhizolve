import { useState } from 'react'
import { WhyTree } from '../../features/investigation/WhyTree'

const TABS = ['why-tree', 'report'] as const
type Tab = (typeof TABS)[number]

type InvestigationPanelProps = {
  projectId: string
  investigationId: string | null
  onNodeClick?: (nodeId: string) => void
}

export function InvestigationPanel({
  projectId,
  investigationId,
  onNodeClick,
}: InvestigationPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('why-tree')

  return (
    <div className="flex h-full flex-col">
      <div role="tablist" aria-label="Investigation panel" className="flex gap-xs p-sm">
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
      <div role="tabpanel" className="flex-1 p-md text-text-muted">
        {activeTab === 'why-tree' ? (
          investigationId ? (
            <WhyTree
              projectId={projectId}
              investigationId={investigationId}
              onNodeClick={onNodeClick}
            />
          ) : (
            'Start an investigation to see the why-tree'
          )
        ) : (
          'Report placeholder'
        )}
      </div>
    </div>
  )
}
