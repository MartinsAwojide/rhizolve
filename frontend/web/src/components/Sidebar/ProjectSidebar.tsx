import { Link } from 'react-router'
import { Logo } from '../Logo'
import { useProjects } from '../../features/projects/useProjects'

type ProjectSidebarProps = {
  currentProjectId?: string
}

export function ProjectSidebar({ currentProjectId }: ProjectSidebarProps) {
  const { data: projects } = useProjects()
  const current = projects?.find((project) => project.id === currentProjectId)

  return (
    <nav aria-label="Projects" className="flex h-full flex-col gap-sm p-md">
      <Link to="/projects" className="mb-md w-fit">
        <Logo className="h-7" />
      </Link>
      <span className="text-xs font-medium text-text-muted">Projects</span>
      <ul className="flex flex-col gap-[2px]">
        {projects?.map((project) => {
          const active = project.id === currentProjectId
          return (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className={`flex items-center gap-sm rounded-control px-sm py-xs ${
                  active ? 'border border-border bg-surface-2' : 'border border-transparent'
                }`}
              >
                <span
                  className={`h-[7px] w-[7px] shrink-0 rounded-pill ${active ? 'bg-node-active' : 'bg-border-strong'}`}
                />
                <span
                  className={`truncate text-sm ${active ? 'font-medium text-text-primary' : 'text-text-secondary'}`}
                >
                  {project.name}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
      <Link
        to="/projects/new"
        className="mt-xs inline-flex h-8 w-fit items-center justify-center gap-sm rounded-control border border-transparent bg-transparent px-sm text-sm text-accent"
      >
        + New project
      </Link>
      {current && (
        <span className="mt-auto font-mono text-xs text-text-muted">
          {current.id} · L{current.maturity_level} · {current.domain}
        </span>
      )}
    </nav>
  )
}
