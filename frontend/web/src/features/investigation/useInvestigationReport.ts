import { useQuery } from '@tanstack/react-query'
import { useAuthFetch } from '../../hooks/useAuthFetch'
import type { WhyNode } from '../chat/types'

export interface InvestigationReport {
  investigation_id: string
  phenomenon: string
  domain: string
  why_nodes: WhyNode[]
  root_cause: string | null
  countermeasure: string | null
}

export function useInvestigationReport(projectId: string, investigationId: string) {
  const authFetch = useAuthFetch()
  return useQuery({
    queryKey: ['report', projectId, investigationId],
    queryFn: () =>
      authFetch(
        `/api/v1/projects/${projectId}/investigations/${investigationId}/report`,
      ) as Promise<InvestigationReport>,
    enabled: !!investigationId,
  })
}
