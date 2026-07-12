import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ProjectCard } from './ProjectCard'
import type { ProjectCardData } from './ProjectCard'

const baseProject: ProjectCardData = {
  id: 'proj-1',
  name: 'Glue Line Investigations',
  domain: 'manufacturing',
  description: 'Line 3 glue tank overflow root causes',
  status: 'active',
  activeInvestigationCount: 2,
  maturityLevel: 3,
  memberCount: 5,
}

function renderCard(project: ProjectCardData) {
  return render(
    <MemoryRouter>
      <ProjectCard project={project} />
    </MemoryRouter>,
  )
}

describe('ProjectCard', () => {
  it('renders a status dot matching investigation state', () => {
    renderCard(baseProject)
    expect(screen.getByTestId('status-dot')).toHaveAttribute('data-status', 'active')
  })

  it('renders a closed status dot', () => {
    renderCard({ ...baseProject, status: 'closed' })
    expect(screen.getByTestId('status-dot')).toHaveAttribute('data-status', 'closed')
  })

  it('renders a draft status dot', () => {
    renderCard({ ...baseProject, status: 'draft' })
    expect(screen.getByTestId('status-dot')).toHaveAttribute('data-status', 'draft')
  })

  it('shows name, domain, description, and counts', () => {
    renderCard(baseProject)
    expect(screen.getByText('Glue Line Investigations')).toBeInTheDocument()
    expect(screen.getByText('manufacturing')).toBeInTheDocument()
    expect(
      screen.getByText('Line 3 glue tank overflow root causes'),
    ).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('links to the project detail route', () => {
    renderCard(baseProject)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/projects/proj-1')
  })
})
