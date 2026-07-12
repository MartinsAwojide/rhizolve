import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div className={`rounded-card bg-surface-2 p-md ${className}`.trim()} {...rest}>
      {children}
    </div>
  )
}
