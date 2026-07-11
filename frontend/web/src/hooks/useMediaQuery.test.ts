import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './useMediaQuery'

type Listener = (event: MediaQueryListEvent) => void

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<Listener>()
  const mql = {
    matches,
    media: '',
    addEventListener: vi.fn((_event: string, listener: Listener) => {
      listeners.add(listener)
    }),
    removeEventListener: vi.fn((_event: string, listener: Listener) => {
      listeners.delete(listener)
    }),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({ ...mql, media: query })),
  )
  return {
    change(next: boolean) {
      mql.matches = next
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent)
      }
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useMediaQuery', () => {
  it('returns the initial match state', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(min-width: 1280px)'))
    expect(result.current).toBe(true)
  })

  it('updates when the media query match changes', () => {
    const media = mockMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(min-width: 1280px)'))
    expect(result.current).toBe(false)

    act(() => media.change(true))

    expect(result.current).toBe(true)
  })
})
