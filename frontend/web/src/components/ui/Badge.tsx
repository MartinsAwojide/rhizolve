import type { HTMLAttributes, ReactNode } from 'react'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'accent' | 'success' | 'danger' | 'warning'
  children: ReactNode
}

const TONE_CLASSES = {
  neutral: 'bg-surface-1 text-text-secondary border-border',
  accent: 'bg-surface-1 text-accent border-accent',
  success: 'bg-surface-1 text-success border-success',
  danger: 'bg-surface-1 text-danger border-danger',
  warning: 'bg-surface-1 text-warning border-warning',
} as const

export function Badge({ tone = 'neutral', className = '', children, ...rest }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-xs h-[22px] px-sm rounded-pill border text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </span>
  )
}
