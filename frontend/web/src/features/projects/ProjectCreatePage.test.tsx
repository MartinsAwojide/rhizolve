import { fireEvent, render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/msw/server'
import { ProjectCreatePage } from './ProjectCreatePage'

vi.mock('@clerk/react', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}))

const navigateMock = vi.fn()
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => navigateMock }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <ProjectCreatePage />
    </MemoryRouter>,
  )
}

describe('ProjectCreatePage', () => {
  it('posts the form values and navigates to the new project on success', async () => {
    server.use(
      http.post('/api/v1/projects', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        expect(body).toEqual({
          name: 'Glue Line Investigations',
          domain: 'manufacturing',
          visibility: 'private',
        })
        return HttpResponse.json({ id: 'proj-new' })
      }),
    )
    renderPage()

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Glue Line Investigations' },
    })
    fireEvent.change(screen.getByLabelText(/domain/i), {
      target: { value: 'manufacturing' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create project/i }))

    await vi.waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/projects/proj-new'))
  })
})
