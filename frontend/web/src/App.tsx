import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Button } from './components/ui/Button'
import { Input } from './components/ui/Input'
import { BtwThread } from './features/chat/BtwThread'
import { ChatInput } from './features/chat/ChatInput'
import { ChatThread } from './features/chat/ChatThread'
import { PresenceBar } from './features/chat/PresenceBar'
import { useConversation } from './features/chat/useConversation'
import { useProjects } from './features/projects/useProjects'
import { usePresence } from './hooks/usePresence'
import { AppLayout } from './layouts/AppLayout'

function PresenceBarContainer({
  title,
  projectId,
  investigationId,
  onExportReport,
}: {
  title?: string
  projectId: string
  investigationId: string
  onExportReport: () => void
}) {
  const { participants, driver } = usePresence(projectId, investigationId)
  return (
    <PresenceBar
      title={title}
      participants={participants}
      driver={driver}
      onExportReport={onExportReport}
    />
  )
}

function App() {
  const { id: projectId, investigationId: investigationIdParam } = useParams<{
    id: string
    investigationId?: string
  }>()
  const navigate = useNavigate()
  const conversation = useConversation(projectId ?? '', investigationIdParam ?? null)
  const { data: projects } = useProjects()
  const [phenomenon, setPhenomenon] = useState('')
  const [panelTab, setPanelTab] = useState<'why-tree' | 'report'>('why-tree')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversation.messages, conversation.btwOpen, conversation.btwMessages])

  useEffect(() => {
    if (investigationIdParam || !projectId) return
    const activeId = projects?.find((p) => p.id === projectId)?.active_investigation_id
    if (activeId) {
      navigate(`/projects/${projectId}/investigations/${activeId}`, { replace: true })
    }
  }, [investigationIdParam, projectId, projects, navigate])

  function handleNodeClick(nodeId: string) {
    const wrapper = document.querySelector(`[data-node-id="${nodeId}"]`)
    wrapper?.scrollIntoView({ behavior: 'smooth' })
  }

  async function handleStartInvestigation(event: React.FormEvent) {
    event.preventDefault()
    if (!phenomenon.trim()) return
    const newInvestigationId = await conversation.startInvestigation(phenomenon)
    setPhenomenon('')
    if (newInvestigationId && projectId) {
      navigate(`/projects/${projectId}/investigations/${newInvestigationId}`)
    }
  }

  return (
    <AppLayout
      hasActiveInvestigation={!!conversation.investigationId}
      projectId={projectId ?? ''}
      investigationId={conversation.investigationId}
      onNodeClick={handleNodeClick}
      investigationPanelTab={panelTab}
      onInvestigationPanelTabChange={setPanelTab}
    >
      <div className="flex h-full flex-col">
        {conversation.investigationId && (
          <div className="p-md">
            <PresenceBarContainer
              title={projects?.find((p) => p.id === projectId)?.name}
              projectId={projectId ?? ''}
              investigationId={conversation.investigationId}
              onExportReport={() => setPanelTab('report')}
            />
          </div>
        )}

        {!conversation.investigationId && (
          <form onSubmit={handleStartInvestigation} className="flex flex-col gap-sm p-md">
            <Input
              id="phenomenon"
              label="What phenomenon are you investigating?"
              value={phenomenon}
              onChange={(e) => setPhenomenon(e.target.value)}
            />
            <Button type="submit" className="w-fit">
              Start investigation
            </Button>
          </form>
        )}

        <div ref={scrollRef} data-testid="chat-thread-scroll" className="flex-1 overflow-y-auto p-md">
          <ChatThread
            messages={conversation.messages}
            onSubmitHypothesisReview={conversation.submitHypothesisReview}
            onSubmitGembaResult={conversation.submitGembaResult}
            onSubmitValidatorReview={conversation.submitValidatorReview}
            onSubmitCountermeasureReview={conversation.submitCountermeasureReview}
          />

          {conversation.btwOpen && (
            <BtwThread messages={conversation.btwMessages} onClose={conversation.closeBtw} />
          )}
        </div>

        <div data-testid="chat-composer" className="border-t border-border p-md">
          <ChatInput
            mode={conversation.mode}
            onSubmit={conversation.sendMessage}
            onOverride={conversation.overrideMode}
          />
        </div>
      </div>
    </AppLayout>
  )
}

export default App
