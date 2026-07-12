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
  it('starts with no messages and shallow mode', () => {
    const { result } = renderHook(() => useConversation())
    expect(result.current.messages).toEqual([])
    expect(result.current.mode).toBe('shallow')
  })

  it('appends a user message immediately, then the assistant reply on response', async () => {
    authFetchMock.mockResolvedValue({
      response: 'Here is your answer',
      graph_invoked: false,
      thread_id: 'thread-1',
      active_mode: 'shallow',
    })
    const { result } = renderHook(() => useConversation())

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

  it('posts the message with the current mode and thread id', async () => {
    authFetchMock.mockResolvedValue({
      response: 'ok',
      graph_invoked: false,
      thread_id: 'thread-1',
      active_mode: 'shallow',
    })
    const { result } = renderHook(() => useConversation())

    await act(async () => {
      await result.current.sendMessage('hello', false)
    })

    expect(authFetchMock).toHaveBeenCalledWith(
      '/api/v1/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ message: 'hello', mode: 'shallow', thread_id: 'default' }),
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
    const { result } = renderHook(() => useConversation())

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
    const { result } = renderHook(() => useConversation())

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
    const { result } = renderHook(() => useConversation())

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
    const { result } = renderHook(() => useConversation())

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
    const { result } = renderHook(() => useConversation())

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
})
