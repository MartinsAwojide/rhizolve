import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary'
}

const VARIANT_CLASSES = {
  primary: 'bg-accent-fill text-on-accent',
  secondary: 'bg-surface-1 text-text-primary',
} as const

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-control px-md py-sm disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`.trim()}
      {...rest}
    />
  )
}
