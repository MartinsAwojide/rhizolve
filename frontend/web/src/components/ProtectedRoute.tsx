import { useAuth } from '@clerk/react'
import { Navigate, Outlet } from 'react-router'

export function ProtectedRoute() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return null
  if (!isSignedIn) return <Navigate to="/login" replace />
  return <Outlet />
}
