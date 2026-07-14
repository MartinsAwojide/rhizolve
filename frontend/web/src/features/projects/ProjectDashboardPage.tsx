import { useClerk, useUser } from '@clerk/react'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Logo } from '../../components/Logo'
import { MetricsRow } from './MetricsRow'
import { NeedsAttentionRail } from './NeedsAttentionRail'
import { ProjectCard, type ProjectCardData } from './ProjectCard'
import { useProjects, type ProjectListItem } from './useProjects'

function initials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?'
}

function toCardData(project: ProjectListItem): ProjectCardData {
  return {
    id: project.id,
    name: project.name,
    domain: project.domain,
    description: project.description,
    status: project.status,
    activeInvestigationCount: project.active_investigation_count,
    maturityLevel: project.maturity_level,
    memberCount: project.member_count,
  }
}

export function ProjectDashboardPage() {
  const { data: projects } = useProjects()
  const { user } = useUser()
  const { signOut } = useClerk()

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center gap-md border-b border-border bg-surface-0 px-lg py-sm">
        <Logo className="h-8" />
        <div className="ml-auto flex items-center gap-sm">
          <Button variant="secondary" size="sm" onClick={() => signOut()}>
            Sign out
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded-pill bg-accent-fill text-xs font-medium text-on-accent">
            {initials(user?.firstName, user?.lastName)}
          </div>
        </div>
      </div>
      <div className="flex gap-lg p-lg">
        <div className="flex min-w-0 flex-1 flex-col gap-lg">
          <MetricsRow />
          <div
            data-testid="project-card-grid"
            className="grid grid-cols-1 gap-md sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3"
          >
            {projects?.map((project) => (
              <ProjectCard key={project.id} project={toCardData(project)} />
            ))}
            <Link
              to="/projects/new"
              className="flex items-center justify-center rounded-card border border-dashed border-text-muted p-md text-text-muted"
            >
              New project
            </Link>
          </div>
        </div>
        <NeedsAttentionRail />
      </div>
    </div>
  )
}
