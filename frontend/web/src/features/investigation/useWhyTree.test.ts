import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useWhyTree } from './useWhyTree'
import type { WhyNode } from '../chat/types'

const authFetchMock = vi.fn()

vi.mock('../../hooks/useAuthFetch', () => ({
  useAuthFetch: () => authFetchMock,
}))

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onmessage: ((event: { data: string }) => void) | null = null
  url: string
  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }
  close() {}
  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
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
})
