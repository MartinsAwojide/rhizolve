import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ProtectedRoute } from './ProtectedRoute'

const useAuthMock = vi.fn()

vi.mock('@clerk/react', () => ({
  useAuth: () => useAuthMock(),
}))

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/projects" element={<div>Projects page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('renders nothing while auth is loading', () => {
    useAuthMock.mockReturnValue({ isLoaded: false, isSignedIn: false })
    renderAt('/projects')
    expect(screen.queryByText('Projects page')).not.toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('redirects to /login when signed out', () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false })
    renderAt('/projects')
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })

  it('renders the outlet when signed in', () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true })
    renderAt('/projects')
    expect(screen.getByText('Projects page')).toBeInTheDocument()
  })
})
