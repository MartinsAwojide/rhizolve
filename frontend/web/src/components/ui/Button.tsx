import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const VARIANT_CLASSES = {
  primary: 'bg-accent-fill text-on-accent border border-transparent',
  secondary: 'bg-surface-2 text-text-primary border border-border-strong',
  ghost: 'bg-transparent text-accent border border-transparent',
  danger: 'bg-transparent text-danger border border-danger',
} as const

const SIZE_CLASSES = {
  sm: 'h-8 px-sm text-sm',
  md: 'h-10 px-md text-sm',
  lg: 'h-12 px-lg text-base',
} as const

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-sm rounded-control disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`.trim()}
      {...rest}
    />
  )
}
