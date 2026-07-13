import { useState } from 'react'
import { useParams } from 'react-router'
import { Button } from './components/ui/Button'
import { Input } from './components/ui/Input'
import { BtwThread } from './features/chat/BtwThread'
import { ChatInput } from './features/chat/ChatInput'
import { ChatThread } from './features/chat/ChatThread'
import { PresenceBar } from './features/chat/PresenceBar'
import { useConversation } from './features/chat/useConversation'
import { usePresence } from './hooks/usePresence'
import { AppLayout } from './layouts/AppLayout'

function PresenceBarContainer({
  projectId,
  investigationId,
  onExportReport,
}: {
  projectId: string
  investigationId: string
  onExportReport: () => void
}) {
  const { participants, driver } = usePresence(projectId, investigationId)
  return <PresenceBar participants={participants} driver={driver} onExportReport={onExportReport} />
}

function App() {
  const { id: projectId } = useParams<{ id: string }>()
  const conversation = useConversation(projectId ?? '')
  const [phenomenon, setPhenomenon] = useState('')
  const [panelTab, setPanelTab] = useState<'why-tree' | 'report'>('why-tree')

  function handleNodeClick(nodeId: string) {
    const wrapper = document.querySelector(`[data-node-id="${nodeId}"]`)
    wrapper?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleStartInvestigation(event: React.FormEvent) {
    event.preventDefault()
    if (!phenomenon.trim()) return
    conversation.startInvestigation(phenomenon)
    setPhenomenon('')
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
      <div className="flex h-full flex-col gap-md p-md">
        {conversation.investigationId && (
          <PresenceBarContainer
            projectId={projectId ?? ''}
            investigationId={conversation.investigationId}
            onExportReport={() => setPanelTab('report')}
          />
        )}

        {!conversation.investigationId && (
          <form onSubmit={handleStartInvestigation} className="flex flex-col gap-sm">
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

        <ChatInput
          mode={conversation.mode}
          onSubmit={conversation.sendMessage}
          onOverride={conversation.overrideMode}
        />
      </div>
    </AppLayout>
  )
}

export default App
