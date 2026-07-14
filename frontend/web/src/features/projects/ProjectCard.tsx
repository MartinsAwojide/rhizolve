import { Link } from 'react-router'
import { MaturityMeter } from '../investigation/MaturityMeter'
import { StatusDot } from '../investigation/StatusDot'

export interface ProjectCardData {
  id: string
  name: string
  domain: string | null
  description: string | null
  status: 'active' | 'closed' | 'draft'
  activeInvestigationCount: number
  maturityLevel: number
  memberCount: number
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex flex-col gap-sm rounded-card bg-surface-2 p-md"
    >
      <div className="flex items-center justify-between gap-sm">
        <h3 className="text-text-primary">{project.name}</h3>
        <StatusDot status={project.status} />
      </div>
      {project.domain && (
        <span className="w-fit rounded-pill bg-surface-1 px-sm py-xs text-sm text-text-secondary">
          {project.domain}
        </span>
      )}
      {project.description && (
        <p className="text-sm text-text-secondary">{project.description}</p>
      )}
      <dl className="flex flex-wrap gap-x-md gap-y-xs text-sm text-text-muted">
        <div>
          <dt>Active investigations</dt>
          <dd>{project.activeInvestigationCount}</dd>
        </div>
        <div>
          <dt>Maturity</dt>
          <dd className="flex items-center gap-xs">
            {project.maturityLevel}
            <MaturityMeter level={project.maturityLevel} showLabel={false} />
          </dd>
        </div>
        <div>
          <dt>Members</dt>
          <dd>{project.memberCount}</dd>
        </div>
      </dl>
    </Link>
  )
}
