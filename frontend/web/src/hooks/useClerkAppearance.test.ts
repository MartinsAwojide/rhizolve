import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useClerkAppearance } from './useClerkAppearance'

function setPrefersDark(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('useClerkAppearance', () => {
  it('returns light-theme variables when the system prefers light', () => {
    setPrefersDark(false)
    const { result } = renderHook(() => useClerkAppearance())
    expect(result.current.variables.colorBackground).toBe('#FFFFFF')
    expect(result.current.variables.colorText).toBe('#1C2024')
  })

  it('returns dark-theme variables when the system prefers dark', () => {
    setPrefersDark(true)
    const { result } = renderHook(() => useClerkAppearance())
    expect(result.current.variables.colorBackground).toBe('#222833')
    expect(result.current.variables.colorText).toBe('#F4F1EC')
  })
})
