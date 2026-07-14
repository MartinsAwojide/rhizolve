import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useWhyTree } from './useWhyTree'
import type { WhyNode } from '../chat/types'

const authFetchMock = vi.fn()
let unstableAuthFetch = false

// useAuthFetch's identity can be unstable across renders in the real app (its
// useCallback dep chains through Clerk's useAuth). Toggled on only for the
// infinite-loop regression test below, which is what catches it.
vi.mock('../../hooks/useAuthFetch', () => ({
  useAuthFetch: () =>
    unstableAuthFetch
      ? (...args: Parameters<typeof authFetchMock>) => authFetchMock(...args)
      : authFetchMock,
}))

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  url: string
  closed = false
  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }
  close() {
    this.closed = true
  }
  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
  triggerError() {
    this.onerror?.()
  }
}

const baseNode: WhyNode = {
  id: 'n1',
  branch_path: 'root.h1',
  depth: 1,
  hypothesis: 'Belt worn out',
  gemba_result: 'pending',
  gemba_notes: '',
  is_root_cause: false,
  countermeasure: '',
}

beforeEach(() => {
  authFetchMock.mockReset()
  unstableAuthFetch = false
  FakeEventSource.instances = []
  vi.stubGlobal('EventSource', FakeEventSource)
})

describe('useWhyTree', () => {
  it('fetches the tree on mount', async () => {
    authFetchMock.mockResolvedValue([baseNode])
    const { result } = renderHook(() => useWhyTree('proj-1', 'inv-1'))

    await waitFor(() => expect(result.current.nodes).toEqual([baseNode]))
    expect(authFetchMock).toHaveBeenCalledWith(
      '/api/v1/projects/proj-1/investigations/inv-1/tree',
    )
  })

  it('upserts nodes in place when node_update carries updated_nodes', async () => {
    authFetchMock.mockResolvedValue([baseNode])
    const { result } = renderHook(() => useWhyTree('proj-1', 'inv-1'))
    await waitFor(() => expect(result.current.nodes).toEqual([baseNode]))

    const updatedNode = { ...baseNode, gemba_result: 'NOK' as const }
    act(() => {
      FakeEventSource.instances[0].emit({
        type: 'node_update',
        payload: { node: 'gemba_check', updated_nodes: [updatedNode] },
      })
    })

    await waitFor(() => expect(result.current.nodes).toEqual([updatedNode]))
    expect(authFetchMock).toHaveBeenCalledTimes(1)
  })

  it('refetches the tree when node_update has no updated_nodes', async () => {
    authFetchMock.mockResolvedValueOnce([baseNode])
    const { result } = renderHook(() => useWhyTree('proj-1', 'inv-1'))
    await waitFor(() => expect(result.current.nodes).toEqual([baseNode]))

    const refetchedNode = { ...baseNode, gemba_result: 'OK' as const }
    authFetchMock.mockResolvedValueOnce([refetchedNode])
    act(() => {
      FakeEventSource.instances[0].emit({
        type: 'node_update',
        payload: { node: 'why_generator' },
      })
    })

    await waitFor(() => expect(result.current.nodes).toEqual([refetchedNode]))
    expect(authFetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not fetch or open an EventSource when investigationId is empty', () => {
    renderHook(() => useWhyTree('proj-1', ''))
    expect(authFetchMock).not.toHaveBeenCalled()
    expect(FakeEventSource.instances).toHaveLength(0)
  })

  it('does not loop forever re-rendering when investigationId is empty and authFetch is unstable', async () => {
    unstableAuthFetch = true
    let renderCount = 0
    renderHook(() => {
      renderCount += 1
      return useWhyTree('proj-1', '')
    })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(renderCount).toBeLessThan(5)
  })

  it('refetches the tree via fallback when the EventSource errors', async () => {
    authFetchMock.mockResolvedValueOnce([baseNode])
    const { result } = renderHook(() => useWhyTree('proj-1', 'inv-1'))
    await waitFor(() => expect(result.current.nodes).toEqual([baseNode]))

    const recoveredNode = { ...baseNode, gemba_result: 'OK' as const }
    authFetchMock.mockResolvedValueOnce([recoveredNode])
    act(() => {
      FakeEventSource.instances[0].triggerError()
    })

    await waitFor(() => expect(result.current.nodes).toEqual([recoveredNode]))
    expect(authFetchMock).toHaveBeenCalledTimes(2)
  })
})
