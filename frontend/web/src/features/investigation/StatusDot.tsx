export type ProjectStatus = 'active' | 'closed' | 'draft'

type StatusDotProps = {
  status?: ProjectStatus
  size?: number
  withLabel?: boolean
}

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  active: 'bg-project-status-active border-project-status-active',
  closed: 'bg-transparent border-project-status-closed',
  draft: 'bg-project-status-draft border-project-status-draft',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  closed: 'Closed',
  draft: 'Draft',
}

export function StatusDot({ status = 'active', size = 10, withLabel = false }: StatusDotProps) {
  const dot = (
    <span
      data-testid="status-dot"
      data-status={status}
      className={`inline-block shrink-0 rounded-pill border-2 box-border ${STATUS_CLASSES[status]}`}
      style={{ width: size, height: size }}
    />
  )

  if (!withLabel) return dot

  return (
    <span className="inline-flex items-center gap-sm text-xs text-text-secondary">
      {dot}
      {STATUS_LABELS[status]}
    </span>
  )
}
