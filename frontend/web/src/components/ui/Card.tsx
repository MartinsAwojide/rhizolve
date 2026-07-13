import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  elevation?: 'flat' | 'sm' | 'md' | 'lg'
  padded?: boolean
}

const ELEVATION_CLASSES = {
  flat: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
} as const

export function Card({ children, elevation = 'md', padded = true, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-card bg-surface-2 border border-border ${ELEVATION_CLASSES[elevation]} ${padded ? 'p-lg' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  )
}

type CardHeaderProps = {
  title: ReactNode
  meta?: ReactNode
  children?: ReactNode
}

export function CardHeader({ title, meta = null, children }: CardHeaderProps) {
  return (
    <div className="mb-md flex items-center justify-between gap-md">
      <div className="text-base font-medium">{title}</div>
      {meta}
      {children}
    </div>
  )
}
