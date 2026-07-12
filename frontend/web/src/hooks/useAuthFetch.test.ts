import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAuthFetch } from './useAuthFetch'

const getTokenMock = vi.fn()

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: getTokenMock }),
}))

describe('useAuthFetch', () => {
  it('attaches the Clerk bearer token to the request', async () => {
    getTokenMock.mockResolvedValue('test-token')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const { result } = renderHook(() => useAuthFetch())
    await result.current('/api/v1/dashboard/attention')

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/dashboard/attention', {
      headers: { Authorization: 'Bearer test-token' },
    })

    fetchSpy.mockRestore()
  })

  it('omits the Authorization header when there is no token', async () => {
    getTokenMock.mockResolvedValue(null)
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    const { result } = renderHook(() => useAuthFetch())
    await result.current('/api/v1/dashboard/attention')

    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/dashboard/attention', { headers: {} })

    fetchSpy.mockRestore()
  })

  it('throws on a non-ok response instead of returning the error body as data', async () => {
    getTokenMock.mockResolvedValue(null)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Not authenticated' }), { status: 401 }),
    )

    const { result } = renderHook(() => useAuthFetch())

    await expect(result.current('/api/v1/dashboard/attention')).rejects.toThrow('401')

    fetchSpy.mockRestore()
  })
})
