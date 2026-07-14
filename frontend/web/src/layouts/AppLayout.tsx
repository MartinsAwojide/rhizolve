import { type ReactNode, useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { ProjectSidebar } from '../components/Sidebar/ProjectSidebar'
import { InvestigationPanel } from '../components/InvestigationPanel/InvestigationPanel'

interface AppLayoutProps {
  children?: ReactNode
  hasActiveInvestigation?: boolean
  projectId?: string
  investigationId?: string | null
  onNodeClick?: (nodeId: string) => void
  investigationPanelTab?: 'why-tree' | 'report'
  onInvestigationPanelTabChange?: (tab: 'why-tree' | 'report') => void
}

export function AppLayout({
  children,
  hasActiveInvestigation = true,
  projectId = '',
  investigationId = null,
  onNodeClick,
  investigationPanelTab,
  onInvestigationPanelTabChange,
}: AppLayoutProps) {
  const isAtLeastTablet = useMediaQuery('(min-width: 768px)')
  const isDesktop = useMediaQuery('(min-width: 1280px)')
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false)
  const [panelDrawerOpen, setPanelDrawerOpen] = useState(false)

  const sidebarVisible = isAtLeastTablet || sidebarDrawerOpen
  const investigationPanelVisible =
    hasActiveInvestigation && (isDesktop || panelDrawerOpen)
  const investigationPanelCollapsible = hasActiveInvestigation && !isDesktop

  return (
    <div className="grid h-screen grid-cols-[auto_1fr_auto] bg-surface-0">
      {!isAtLeastTablet && (
        <button
          type="button"
          onClick={() => setSidebarDrawerOpen((open) => !open)}
          aria-label="Toggle project sidebar"
          className="fixed left-2 top-2 z-10 rounded-control bg-accent-fill px-sm py-xs text-on-accent"
        >
          Projects
        </button>
      )}
      <aside
        data-testid="sidebar"
        hidden={!sidebarVisible}
        className="w-[320px] overflow-y-auto bg-surface-1"
      >
        <ProjectSidebar currentProjectId={projectId} />
      </aside>

      <main className="overflow-hidden bg-surface-0">{children}</main>

      {investigationPanelCollapsible && (
        <button
          type="button"
          onClick={() => setPanelDrawerOpen((open) => !open)}
          aria-label="Toggle investigation panel"
          className="fixed right-2 top-2 z-10 rounded-control bg-accent-fill px-sm py-xs text-on-accent"
        >
          Why Tree
        </button>
      )}
      <aside
        data-testid="investigation-panel"
        hidden={!investigationPanelVisible}
        className="w-[400px] overflow-y-auto bg-surface-2"
      >
        <InvestigationPanel
          projectId={projectId}
          investigationId={investigationId}
          onNodeClick={onNodeClick}
          activeTab={investigationPanelTab}
          onTabChange={onInvestigationPanelTabChange}
        />
      </aside>
    </div>
  )
}
