import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

type CommonProps = {
  label?: ReactNode
  hint?: ReactNode
  invalid?: boolean
}

type InputAsInput = CommonProps &
  InputHTMLAttributes<HTMLInputElement> & {
    as?: 'input'
  }

type InputAsTextarea = CommonProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: 'textarea'
  }

type InputProps = InputAsInput | InputAsTextarea

export function Input({ as = 'input', label, hint, invalid = false, className = '', ...rest }: InputProps) {
  const borderClass = invalid ? 'border-danger' : 'border-border-strong focus-within:border-ring'

  return (
    <label className="block font-sans">
      {label && <span className="mb-xs block text-xs font-medium text-text-secondary">{label}</span>}
      <span
        className={`flex items-center gap-sm rounded-control border bg-surface-2 px-md focus-within:ring-2 focus-within:ring-ring/40 ${borderClass}`}
      >
        {as === 'textarea' ? (
          <textarea
            className={`w-full flex-1 resize-y border-none bg-transparent py-sm text-base text-text-primary outline-none min-h-[72px] ${className}`.trim()}
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            className={`h-10 w-full flex-1 border-none bg-transparent text-base text-text-primary outline-none ${className}`.trim()}
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
      </span>
      {hint && <span className={`mt-xs block text-xs ${invalid ? 'text-danger' : 'text-text-muted'}`}>{hint}</span>}
    </label>
  )
}
