import { Link } from 'react-router'

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

const STATUS_DOT_CLASS: Record<ProjectCardData['status'], string> = {
  active: 'bg-project-status-active',
  closed: 'border border-project-status-closed bg-transparent',
  draft: 'bg-project-status-draft',
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex flex-col gap-sm rounded-card bg-surface-2 p-md"
    >
      <div className="flex items-center justify-between gap-sm">
        <h3 className="text-text-primary">{project.name}</h3>
        <span
          data-testid="status-dot"
          data-status={project.status}
          className={`h-3 w-3 rounded-pill ${STATUS_DOT_CLASS[project.status]}`}
        />
      </div>
      {project.domain && (
        <span className="w-fit rounded-pill bg-surface-1 px-sm py-xs text-sm text-text-secondary">
          {project.domain}
        </span>
      )}
      {project.description && (
        <p className="text-sm text-text-secondary">{project.description}</p>
      )}
      <dl className="flex gap-lg text-sm text-text-muted">
        <div>
          <dt>Active investigations</dt>
          <dd>{project.activeInvestigationCount}</dd>
        </div>
        <div>
          <dt>Maturity</dt>
          <dd>{project.maturityLevel}</dd>
        </div>
        <div>
          <dt>Members</dt>
          <dd>{project.memberCount}</dd>
        </div>
      </dl>
    </Link>
  )
}
