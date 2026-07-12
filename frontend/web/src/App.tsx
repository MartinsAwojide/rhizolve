import { useState } from 'react'
import { useParams } from 'react-router'
import { Button } from './components/ui/Button'
import { BtwThread } from './features/chat/BtwThread'
import { ChatInput } from './features/chat/ChatInput'
import { ChatThread } from './features/chat/ChatThread'
import { useConversation } from './features/chat/useConversation'
import { AppLayout } from './layouts/AppLayout'

function App() {
  const { id: projectId } = useParams<{ id: string }>()
  const conversation = useConversation(projectId ?? '')
  const [phenomenon, setPhenomenon] = useState('')

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
    >
      <div className="flex h-full flex-col gap-md p-md">
        {!conversation.investigationId && (
          <form onSubmit={handleStartInvestigation} className="flex flex-col gap-sm">
            <label htmlFor="phenomenon" className="text-sm text-text-secondary">
              What phenomenon are you investigating?
            </label>
            <input
              id="phenomenon"
              type="text"
              value={phenomenon}
              onChange={(e) => setPhenomenon(e.target.value)}
              className="rounded-control bg-surface-1 px-sm py-xs text-text-primary"
            />
            <Button type="submit">Start investigation</Button>
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
