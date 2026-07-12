import { useCallback, useRef, useState } from 'react'
import { useAuthFetch } from '../../hooks/useAuthFetch'
import type { ChatMessage, PendingHypothesis, WhyNode } from './types'

type ChatMode = 'shallow' | 'deep'

type ChatResponseBody = {
  response: string | null
  graph_invoked: boolean
  thread_id: string
  ephemeral?: boolean
  active_mode: ChatMode
  investigation_id?: string | null
}

type GembaResult = 'OK' | 'NOK' | 'ROOT_CAUSE'

type InvestigationStatusBody = {
  interrupt_type:
    | 'hypothesis_review'
    | 'gemba_result_review'
    | 'validator_review'
    | 'countermeasure_review'
    | null
  pending_hypotheses: PendingHypothesis[]
  node: WhyNode | null
}

export function useConversation(projectId: string) {
  const authFetch = useAuthFetch()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [btwMessages, setBtwMessages] = useState<ChatMessage[]>([])
  const [btwOpen, setBtwOpen] = useState(false)
  const [mode, setMode] = useState<ChatMode>('shallow')
  const [investigationId, setInvestigationId] = useState<string | null>(null)
  const overriddenRef = useRef(false)
  const threadIdRef = useRef('default')

  const overrideMode = useCallback((next: ChatMode) => {
    overriddenRef.current = true
    setMode(next)
  }, [])

  const closeBtw = useCallback(() => {
    setBtwOpen(false)
  }, [])

  const sendMessage = useCallback(
    async (text: string, isBtw: boolean) => {
      const routeToBtw = isBtw && mode === 'deep'

      if (routeToBtw) {
        setBtwMessages([{ type: 'shallow', role: 'user', content: text }])
      } else {
        setMessages((prev) => [...prev, { type: 'shallow', role: 'user', content: text }])
      }

      const data: ChatResponseBody = await authFetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode,
          thread_id: threadIdRef.current,
          project_id: projectId,
        }),
      })

      if (routeToBtw) {
        if (data.response) {
          setBtwMessages((prev) => [
            ...prev,
            { type: 'shallow', role: 'assistant', content: data.response as string },
          ])
        }
        setBtwOpen(true)
        return
      }

      threadIdRef.current = data.thread_id
      if (!overriddenRef.current) {
        setMode(data.active_mode)
      }
      if (data.response) {
        setMessages((prev) => [
          ...prev,
          { type: 'shallow', role: 'assistant', content: data.response as string },
        ])
      }
    },
    [authFetch, mode, projectId],
  )

  const pollStatus = useCallback(
    async (invId: string) => {
      const status: InvestigationStatusBody = await authFetch(
        `/api/v1/projects/${projectId}/investigations/${invId}/status`,
      )
      switch (status.interrupt_type) {
        case 'hypothesis_review':
          setMessages((prev) => [
            ...prev,
            {
              type: 'interrupt',
              interrupt_type: 'hypothesis_review',
              hypotheses: status.pending_hypotheses,
            },
          ])
          break
        case 'gemba_result_review': {
          const node = status.node
          if (node) {
            setMessages((prev) => [
              ...prev,
              { type: 'interrupt', interrupt_type: 'gemba_result_review', node },
            ])
          }
          break
        }
        case 'validator_review': {
          const node = status.node
          if (node) {
            setMessages((prev) => [
              ...prev,
              { type: 'interrupt', interrupt_type: 'validator_review', node },
            ])
          }
          break
        }
        case 'countermeasure_review': {
          const node = status.node
          if (node) {
            setMessages((prev) => [
              ...prev,
              { type: 'interrupt', interrupt_type: 'countermeasure_review', node },
            ])
          }
          break
        }
        default:
          break
      }
    },
    [authFetch, projectId],
  )

  const startInvestigation = useCallback(
    async (phenomenonMessage: string) => {
      const data: ChatResponseBody = await authFetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: phenomenonMessage,
          mode: 'deep',
          thread_id: threadIdRef.current,
          project_id: projectId,
          action: 'start_investigation',
        }),
      })
      if (data.investigation_id) {
        setInvestigationId(data.investigation_id)
        await pollStatus(data.investigation_id)
      }
    },
    [authFetch, projectId, pollStatus],
  )

  const submitHypothesisReview = useCallback(
    async (hypotheses: PendingHypothesis[]) => {
      if (!investigationId) return
      await authFetch(
        `/api/v1/projects/${projectId}/investigations/${investigationId}/hypothesis-review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hypotheses }),
        },
      )
      await pollStatus(investigationId)
    },
    [authFetch, projectId, investigationId, pollStatus],
  )

  const submitValidatorReview = useCallback(
    async (decision: { override: boolean }) => {
      if (!investigationId) return
      await authFetch(
        `/api/v1/projects/${projectId}/investigations/${investigationId}/validator-review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_override_root_cause: decision.override }),
        },
      )
      await pollStatus(investigationId)
    },
    [authFetch, projectId, investigationId, pollStatus],
  )

  const submitCountermeasureReview = useCallback(
    async (action: { accepted: boolean; edit?: string; feedback?: string }) => {
      if (!investigationId) return
      await authFetch(
        `/api/v1/projects/${projectId}/investigations/${investigationId}/countermeasure-review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        },
      )
      await pollStatus(investigationId)
    },
    [authFetch, projectId, investigationId, pollStatus],
  )

  const submitGembaResult = useCallback(
    async (payload: { result: GembaResult; attachments: File[] }) => {
      if (!investigationId) return
      const formData = new FormData()
      formData.set('result', payload.result)
      for (const file of payload.attachments) {
        formData.append('files', file)
      }
      await authFetch(
        `/api/v1/projects/${projectId}/investigations/${investigationId}/gemba`,
        {
          method: 'POST',
          body: formData,
        },
      )
      await pollStatus(investigationId)
    },
    [authFetch, projectId, investigationId, pollStatus],
  )

  return {
    messages,
    btwMessages,
    btwOpen,
    closeBtw,
    mode,
    overrideMode,
    sendMessage,
    investigationId,
    startInvestigation,
    submitHypothesisReview,
    submitValidatorReview,
    submitCountermeasureReview,
    submitGembaResult,
  }
}
