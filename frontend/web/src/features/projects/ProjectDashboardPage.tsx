import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useAuthFetch } from '../../hooks/useAuthFetch'
import { MetricsRow } from './MetricsRow'
import { NeedsAttentionRail } from './NeedsAttentionRail'
import { ProjectCard, type ProjectCardData } from './ProjectCard'

interface ProjectListItem {
  id: string
  name: string
  domain: string | null
  description: string | null
  status: ProjectCardData['status']
  active_investigation_count: number
  maturity_level: number
  member_count: number
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
  const authFetch = useAuthFetch()
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => authFetch('/api/v1/projects') as Promise<ProjectListItem[]>,
  })

  return (
    <div className="flex gap-lg p-lg">
      <div className="flex flex-1 flex-col gap-lg">
        <MetricsRow />
        <div className="grid grid-cols-3 gap-md">
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
  )
}
