import { useQuery } from '@tanstack/react-query'
import { useAuthFetch } from '../../hooks/useAuthFetch'
import type { ProjectCardData } from './ProjectCard'

export interface ProjectListItem {
  id: string
  name: string
  domain: string | null
  description: string | null
  status: ProjectCardData['status']
  active_investigation_count: number
  active_investigation_id: string | null
  maturity_level: number
  member_count: number
}

export function useProjects() {
  const authFetch = useAuthFetch()
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => authFetch('/api/v1/projects') as Promise<ProjectListItem[]>,
  })
}
