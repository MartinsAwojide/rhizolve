import { useState } from 'react'

const TABS = ['why-tree', 'report'] as const
type Tab = (typeof TABS)[number]

export function InvestigationPanel() {
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
        {activeTab === 'why-tree' ? 'Why-tree graph placeholder' : 'Report placeholder'}
      </div>
    </div>
  )
}
