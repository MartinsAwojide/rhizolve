import { useQuery } from '@tanstack/react-query'
import { useAuthFetch } from '../../hooks/useAuthFetch'

interface DashboardMetrics {
  active_investigations: number
  root_causes_found: number
  average_depth_to_cause: number | null
  gemba_completion_rate: number | null
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xs rounded-card bg-surface-2 p-md">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-lg text-text-primary">{value}</span>
    </div>
  )
}

export function MetricsRow() {
  const authFetch = useAuthFetch()
  const { data } = useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => authFetch('/api/v1/dashboard/metrics') as Promise<DashboardMetrics>,
  })

  return (
    <div className="grid grid-cols-4 gap-md">
      <Stat label="Active investigations" value={String(data?.active_investigations ?? 0)} />
      <Stat label="Root causes found" value={String(data?.root_causes_found ?? 0)} />
      <Stat
        label="Average depth to cause"
        value={data?.average_depth_to_cause != null ? String(data.average_depth_to_cause) : '—'}
      />
      <Stat
        label="Gemba completion rate"
        value={
          data?.gemba_completion_rate != null
            ? `${Math.round(data.gemba_completion_rate * 100)}%`
            : '—'
        }
      />
    </div>
  )
}
