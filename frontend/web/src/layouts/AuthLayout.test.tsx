import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthLayout } from './AuthLayout'

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

describe('AuthLayout', () => {
  it('renders the brand logo', () => {
    render(
      <AuthLayout>
        <div>widget</div>
      </AuthLayout>,
    )
    expect(screen.getByRole('img', { name: 'Rhizolve' })).toBeInTheDocument()
  })

  it('renders the headline and serif tagline', () => {
    render(
      <AuthLayout>
        <div>widget</div>
      </AuthLayout>,
    )
    expect(screen.getByText('From observation to verified root cause.')).toBeInTheDocument()
    expect(
      screen.getByText(/structured 5 Whys investigation any team can trust/i),
    ).toHaveClass('font-voice')
  })

  it('renders the mono footer', () => {
    render(
      <AuthLayout>
        <div>widget</div>
      </AuthLayout>,
    )
    expect(screen.getByText('Internal enterprise tool · ISO 9001 output')).toHaveClass('font-mono')
  })

  it('renders the passed children in the right pane', () => {
    render(
      <AuthLayout>
        <div>Clerk widget goes here</div>
      </AuthLayout>,
    )
    expect(screen.getByText('Clerk widget goes here')).toBeInTheDocument()
  })
})
