import type { ReactNode } from 'react'
import { Logo } from '../components/Logo'

type AuthLayoutProps = {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="grid h-screen grid-cols-[1.1fr_1fr] bg-surface-0">
      <div className="flex flex-col justify-between border-r border-border bg-surface-1 p-xl">
        <Logo className="h-10 w-fit" />
        <div>
          <h1 className="mb-md max-w-[420px] text-2xl font-medium text-text-primary">
            From observation to verified root cause.
          </h1>
          <p className="max-w-[400px] font-voice text-lg text-text-secondary">
            A structured 5 Whys investigation any team can trust — defensible regardless of who
            reviews it.
          </p>
        </div>
        <span className="font-mono text-xs text-text-muted">
          Internal enterprise tool · ISO 9001 output
        </span>
      </div>
      <div className="flex items-center justify-center p-xl">{children}</div>
    </div>
  )
}
