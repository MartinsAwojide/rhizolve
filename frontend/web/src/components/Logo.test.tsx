import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Logo } from './Logo'

function mockPrefersDark(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('Logo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the light logo asset in light mode', () => {
    mockPrefersDark(false)
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Rhizolve' })).toHaveAttribute('src', '/brand/logo-light.svg')
  })

  it('renders the dark logo asset in dark mode', () => {
    mockPrefersDark(true)
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Rhizolve' })).toHaveAttribute('src', '/brand/logo-dark.svg')
  })
})
