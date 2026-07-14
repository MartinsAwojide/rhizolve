import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useAuthFetch } from '../../hooks/useAuthFetch'

interface AttentionConflict {
  id: number
  project_id: string
  investigation_id: string
  branch_path: string
}

interface AttentionQuorumItem {
  investigation_id: string
  project_id: string
  current_depth: number
}

interface AttentionData {
  assignedGemba: unknown[]
  conflicts: AttentionConflict[]
  quorum: AttentionQuorumItem[]
}

export function NeedsAttentionRail() {
  const authFetch = useAuthFetch()
  const { data } = useQuery({
    queryKey: ['dashboard', 'attention'],
    queryFn: () => authFetch('/api/v1/dashboard/attention') as Promise<AttentionData>,
  })

  return (
    <aside aria-label="Needs attention" className="flex w-64 shrink-0 flex-col gap-sm p-md">
      {data?.conflicts?.map((c) => (
        <Link
          key={`conflict-${c.id}`}
          to={`/projects/${c.project_id}`}
          className="truncate text-sm text-text-secondary"
        >
          Conflict on branch {c.branch_path} ({c.investigation_id})
        </Link>
      ))}
      {data?.quorum?.map((q) => (
        <Link
          key={`quorum-${q.investigation_id}`}
          to={`/projects/${q.project_id}`}
          className="truncate text-sm text-text-secondary"
        >
          Awaiting quorum: {q.investigation_id}
        </Link>
      ))}
    </aside>
  )
}
