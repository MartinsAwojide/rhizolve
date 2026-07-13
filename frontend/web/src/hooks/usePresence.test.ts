import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePresence } from './usePresence'

const authFetchMock = vi.fn()

vi.mock('./useAuthFetch', () => ({
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

const snapshotUser = {
  user_id: 'u1',
  name: 'A. Rivera',
  role: 'owner',
  joined_at: '2026-01-01T00:00:00Z',
  editing: false,
  editing_node: null,
}

beforeEach(() => {
  authFetchMock.mockReset()
  authFetchMock.mockResolvedValue({ users: [] })
  FakeEventSource.instances = []
  vi.stubGlobal('EventSource', FakeEventSource)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePresence', () => {
  it('sends a heartbeat on mount', async () => {
    renderHook(() => usePresence('proj-1', 'inv-1'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(authFetchMock).toHaveBeenCalledWith(
      '/api/v1/projects/proj-1/investigations/inv-1/presence/heartbeat',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('repeats the heartbeat on an interval before the presence TTL expires', async () => {
    vi.useFakeTimers()
    renderHook(() => usePresence('proj-1', 'inv-1'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(authFetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })
    expect(authFetchMock).toHaveBeenCalledTimes(2)
  })

  it('updates participants from a presence_snapshot SSE event', async () => {
    const { result } = renderHook(() => usePresence('proj-1', 'inv-1'))
    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      FakeEventSource.instances[0].emit({
        type: 'presence_snapshot',
        payload: { users: [snapshotUser] },
      })
    })

    await waitFor(() => expect(result.current.participants).toEqual([snapshotUser]))
  })

  it('updates the driver from a driver_changed SSE event', async () => {
    const { result } = renderHook(() => usePresence('proj-1', 'inv-1'))
    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      FakeEventSource.instances[0].emit({
        type: 'driver_changed',
        payload: { driver: snapshotUser },
      })
    })

    await waitFor(() => expect(result.current.driver).toEqual(snapshotUser))
  })
})
