import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useConversation } from './useConversation'

const authFetchMock = vi.fn()

vi.mock('../../hooks/useAuthFetch', () => ({
  useAuthFetch: () => authFetchMock,
}))

beforeEach(() => {
  authFetchMock.mockReset()
})

describe('useConversation', () => {
  it('starts with no messages, shallow mode, and no investigation', () => {
    const { result } = renderHook(() => useConversation('proj-1'))
    expect(result.current.messages).toEqual([])
    expect(result.current.mode).toBe('shallow')
    expect(result.current.investigationId).toBeNull()
  })

  it('appends a user message immediately, then the assistant reply on response', async () => {
    authFetchMock.mockResolvedValue({
      response: 'Here is your answer',
      graph_invoked: false,
      thread_id: 'thread-1',
      active_mode: 'shallow',
    })
    const { result } = renderHook(() => useConversation('proj-1'))

    await act(async () => {
      await result.current.sendMessage('What happened?', false)
    })

    await waitFor(() =>
      expect(result.current.messages).toEqual([
        { type: 'shallow', role: 'user', content: 'What happened?' },
        { type: 'shallow', role: 'assistant', content: 'Here is your answer' },
      ]),
    )
  })

  it('posts the message with the current mode, thread id, and project id', async () => {
    authFetchMock.mockResolvedValue({
      response: 'ok',
      graph_invoked: false,
      thread_id: 'thread-1',
      active_mode: 'shallow',
    })
    const { result } = renderHook(() => useConversation('proj-1'))

    await act(async () => {
      await result.current.sendMessage('hello', false)
    })

    expect(authFetchMock).toHaveBeenCalledWith(
      '/api/v1/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          message: 'hello',
          mode: 'shallow',
          thread_id: 'default',
          project_id: 'proj-1',
        }),
      }),
    )
  })

  it('updates mode from the response active_mode when not manually overridden', async () => {
    authFetchMock.mockResolvedValue({
      response: 'switching to deep',
      graph_invoked: true,
      thread_id: 'thread-1',
      active_mode: 'deep',
    })
    const { result } = renderHook(() => useConversation('proj-1'))

    await act(async () => {
      await result.current.sendMessage('investigate this', false)
    })

    expect(result.current.mode).toBe('deep')
  })

  it('keeps the manually overridden mode even if the response suggests otherwise', async () => {
    authFetchMock.mockResolvedValue({
      response: 'ok',
      graph_invoked: false,
      thread_id: 'thread-1',
      active_mode: 'shallow',
    })
    const { result } = renderHook(() => useConversation('proj-1'))

    act(() => {
      result.current.overrideMode('deep')
    })
    expect(result.current.mode).toBe('deep')

    await act(async () => {
      await result.current.sendMessage('hello', false)
    })

    expect(result.current.mode).toBe('deep')
  })

  it('routes a btw exchange to btwMessages and opens the panel when in deep mode', async () => {
    authFetchMock.mockResolvedValue({
      response: 'quick answer',
      graph_invoked: false,
      thread_id: 'btw-thread-1',
      ephemeral: true,
      active_mode: 'deep',
    })
    const { result } = renderHook(() => useConversation('proj-1'))

    act(() => {
      result.current.overrideMode('deep')
    })

    await act(async () => {
      await result.current.sendMessage('/btw quick question', true)
    })

    await waitFor(() =>
      expect(result.current.btwMessages).toEqual([
        { type: 'shallow', role: 'user', content: '/btw quick question' },
        { type: 'shallow', role: 'assistant', content: 'quick answer' },
      ]),
    )
    expect(result.current.btwOpen).toBe(true)
    expect(result.current.messages).toEqual([])
  })

  it('treats a btw-prefixed message as normal when in shallow mode', async () => {
    authFetchMock.mockResolvedValue({
      response: 'normal answer',
      graph_invoked: false,
      thread_id: 'thread-1',
      active_mode: 'shallow',
    })
    const { result } = renderHook(() => useConversation('proj-1'))

    await act(async () => {
      await result.current.sendMessage('/btw quick question', true)
    })

    await waitFor(() =>
      expect(result.current.messages).toEqual([
        { type: 'shallow', role: 'user', content: '/btw quick question' },
        { type: 'shallow', role: 'assistant', content: 'normal answer' },
      ]),
    )
    expect(result.current.btwOpen).toBe(false)
    expect(result.current.btwMessages).toEqual([])
  })

  it('closeBtw sets btwOpen back to false', async () => {
    authFetchMock.mockResolvedValue({
      response: 'quick answer',
      graph_invoked: false,
      thread_id: 'btw-thread-1',
      ephemeral: true,
      active_mode: 'deep',
    })
    const { result } = renderHook(() => useConversation('proj-1'))

    act(() => {
      result.current.overrideMode('deep')
    })
    await act(async () => {
      await result.current.sendMessage('/btw quick question', true)
    })
    expect(result.current.btwOpen).toBe(true)

    act(() => {
      result.current.closeBtw()
    })

    expect(result.current.btwOpen).toBe(false)
  })

  it('startInvestigation posts action=start_investigation and stores the returned investigationId', async () => {
    authFetchMock.mockResolvedValue({
      response: null,
      graph_invoked: true,
      thread_id: 'thread-1',
      active_mode: 'deep',
      investigation_id: 'inv-1',
    })
    const { result } = renderHook(() => useConversation('proj-1'))

    await act(async () => {
      await result.current.startInvestigation('Glue tank overflowing')
    })

    expect(authFetchMock).toHaveBeenCalledWith(
      '/api/v1/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          message: 'Glue tank overflowing',
          mode: 'deep',
          thread_id: 'default',
          project_id: 'proj-1',
          action: 'start_investigation',
        }),
      }),
    )
    expect(result.current.investigationId).toBe('inv-1')
  })

  it('startInvestigation polls status and appends a hypothesis_review interrupt message', async () => {
    authFetchMock.mockResolvedValueOnce({
      response: null,
      graph_invoked: true,
      thread_id: 'thread-1',
      active_mode: 'deep',
      investigation_id: 'inv-1',
    })
    const hypotheses = [
      {
        hypothesis: 'seal wear',
        branch_path: 'root.h1',
        depth: 1,
        gemba_instructions: 'inspect seal',
      },
    ]
    authFetchMock.mockResolvedValueOnce({
      investigation_id: 'inv-1',
      status: 'awaiting_gemba',
      interrupt_type: 'hypothesis_review',
      pending_hypotheses: hypotheses,
      node: null,
    })
    const { result } = renderHook(() => useConversation('proj-1'))

    await act(async () => {
      await result.current.startInvestigation('Glue tank overflowing')
    })

    expect(authFetchMock).toHaveBeenLastCalledWith(
      '/api/v1/projects/proj-1/investigations/inv-1/status',
    )
    expect(result.current.messages).toEqual([
      { type: 'interrupt', interrupt_type: 'hypothesis_review', hypotheses },
    ])
  })

  it('submitHypothesisReview posts the edited hypotheses list', async () => {
    authFetchMock.mockResolvedValueOnce({
      response: null,
      graph_invoked: true,
      thread_id: 'thread-1',
      active_mode: 'deep',
      investigation_id: 'inv-1',
    })
    authFetchMock.mockResolvedValueOnce({
      investigation_id: 'inv-1',
      status: 'awaiting_gemba',
      interrupt_type: null,
      pending_hypotheses: [],
      node: null,
    })
    const { result } = renderHook(() => useConversation('proj-1'))
    await act(async () => {
      await result.current.startInvestigation('phenomenon')
    })

    authFetchMock.mockResolvedValueOnce({ status: 'awaiting_gemba' })
    authFetchMock.mockResolvedValueOnce({
      investigation_id: 'inv-1',
      status: 'awaiting_gemba',
      interrupt_type: null,
      pending_hypotheses: [],
      node: null,
    })
    const hypotheses = [
      {
        hypothesis: 'seal wear',
        branch_path: 'root.h1',
        depth: 1,
        gemba_instructions: 'inspect seal',
      },
    ]
    await act(async () => {
      await result.current.submitHypothesisReview(hypotheses)
    })

    expect(authFetchMock.mock.calls[2]).toEqual([
      '/api/v1/projects/proj-1/investigations/inv-1/hypothesis-review',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ hypotheses }),
      }),
    ])
  })

  it('submitValidatorReview posts user_override_root_cause from the override flag', async () => {
    authFetchMock.mockResolvedValueOnce({
      response: null,
      graph_invoked: true,
      thread_id: 'thread-1',
      active_mode: 'deep',
      investigation_id: 'inv-1',
    })
    authFetchMock.mockResolvedValueOnce({
      investigation_id: 'inv-1',
      status: 'awaiting_gemba',
      interrupt_type: null,
      pending_hypotheses: [],
      node: null,
    })
    const { result } = renderHook(() => useConversation('proj-1'))
    await act(async () => {
      await result.current.startInvestigation('phenomenon')
    })

    authFetchMock.mockResolvedValueOnce({ status: 'awaiting_gemba' })
    authFetchMock.mockResolvedValueOnce({
      investigation_id: 'inv-1',
      status: 'awaiting_gemba',
      interrupt_type: null,
      pending_hypotheses: [],
      node: null,
    })
    await act(async () => {
      await result.current.submitValidatorReview({ override: true })
    })

    expect(authFetchMock.mock.calls[2]).toEqual([
      '/api/v1/projects/proj-1/investigations/inv-1/validator-review',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ user_override_root_cause: true }),
      }),
    ])
  })

  it('submitCountermeasureReview posts the action payload as-is', async () => {
    authFetchMock.mockResolvedValueOnce({
      response: null,
      graph_invoked: true,
      thread_id: 'thread-1',
      active_mode: 'deep',
      investigation_id: 'inv-1',
    })
    authFetchMock.mockResolvedValueOnce({
      investigation_id: 'inv-1',
      status: 'awaiting_gemba',
      interrupt_type: null,
      pending_hypotheses: [],
      node: null,
    })
    const { result } = renderHook(() => useConversation('proj-1'))
    await act(async () => {
      await result.current.startInvestigation('phenomenon')
    })

    authFetchMock.mockResolvedValueOnce({ status: 'awaiting_gemba' })
    authFetchMock.mockResolvedValueOnce({
      investigation_id: 'inv-1',
      status: 'awaiting_gemba',
      interrupt_type: null,
      pending_hypotheses: [],
      node: null,
    })
    await act(async () => {
      await result.current.submitCountermeasureReview({
        accepted: true,
        edit: 'edited text',
      })
    })

    expect(authFetchMock.mock.calls[2]).toEqual([
      '/api/v1/projects/proj-1/investigations/inv-1/countermeasure-review',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ accepted: true, edit: 'edited text' }),
      }),
    ])
  })

  it('submitGembaResult posts a FormData body with the result and attachments', async () => {
    authFetchMock.mockResolvedValueOnce({
      response: null,
      graph_invoked: true,
      thread_id: 'thread-1',
      active_mode: 'deep',
      investigation_id: 'inv-1',
    })
    authFetchMock.mockResolvedValueOnce({
      investigation_id: 'inv-1',
      status: 'awaiting_gemba',
      interrupt_type: null,
      pending_hypotheses: [],
      node: null,
    })
    const { result } = renderHook(() => useConversation('proj-1'))
    await act(async () => {
      await result.current.startInvestigation('phenomenon')
    })

    authFetchMock.mockResolvedValueOnce({ status: 'awaiting_gemba' })
    authFetchMock.mockResolvedValueOnce({
      investigation_id: 'inv-1',
      status: 'awaiting_gemba',
      interrupt_type: null,
      pending_hypotheses: [],
      node: null,
    })
    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    await act(async () => {
      await result.current.submitGembaResult({ result: 'OK', attachments: [file] })
    })

    const call = authFetchMock.mock.calls[2]
    expect(call[0]).toBe('/api/v1/projects/proj-1/investigations/inv-1/gemba')
    const init = call[1] as RequestInit
    expect(init.method).toBe('POST')
    const body = init.body as FormData
    expect(body.get('result')).toBe('OK')
    expect(body.get('files')).toBe(file)
  })

  it('submitValidatorReview polls status and appends a countermeasure_review interrupt message with the returned node', async () => {
    authFetchMock.mockResolvedValueOnce({
      response: null,
      graph_invoked: true,
      thread_id: 'thread-1',
      active_mode: 'deep',
      investigation_id: 'inv-1',
    })
    authFetchMock.mockResolvedValueOnce({
      investigation_id: 'inv-1',
      status: 'awaiting_gemba',
      interrupt_type: null,
      pending_hypotheses: [],
      node: null,
    })
    const { result } = renderHook(() => useConversation('proj-1'))
    await act(async () => {
      await result.current.startInvestigation('phenomenon')
    })

    const node = {
      id: 'node-1',
      branch_path: 'root.h1',
      depth: 1,
      hypothesis: 'seal wear',
      gemba_result: 'NOK' as const,
      gemba_notes: 'cracked',
      is_root_cause: true,
      countermeasure: '',
    }
    authFetchMock.mockResolvedValueOnce({ status: 'awaiting_gemba' })
    authFetchMock.mockResolvedValueOnce({
      investigation_id: 'inv-1',
      status: 'awaiting_gemba',
      interrupt_type: 'countermeasure_review',
      pending_hypotheses: [],
      node,
    })
    await act(async () => {
      await result.current.submitValidatorReview({ override: true })
    })

    expect(result.current.messages).toEqual([
      { type: 'interrupt', interrupt_type: 'countermeasure_review', node },
    ])
  })
})
