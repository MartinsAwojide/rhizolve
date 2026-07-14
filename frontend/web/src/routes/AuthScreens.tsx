import { SignIn, SignUp } from '@clerk/react'
import { useClerkAppearance } from '../hooks/useClerkAppearance'
import { AuthLayout } from '../layouts/AuthLayout'

export function LoginScreen() {
  const appearance = useClerkAppearance()
  return (
    <AuthLayout>
      <SignIn
        routing="path"
        path="/login"
        fallbackRedirectUrl="/projects"
        appearance={appearance}
      />
    </AuthLayout>
  )
}

export function RegisterScreen() {
  const appearance = useClerkAppearance()
  return (
    <AuthLayout>
      <SignUp
        routing="path"
        path="/register"
        fallbackRedirectUrl="/projects"
        appearance={appearance}
      />
    </AuthLayout>
  )
}
