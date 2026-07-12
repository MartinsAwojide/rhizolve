import { createBrowserRouter, Navigate } from 'react-router'
import { SignIn, SignUp } from '@clerk/react'
import App from './App'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ProjectDashboardPage } from './features/projects/ProjectDashboardPage'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/projects" replace /> },
  {
    path: '/login/*',
    element: <SignIn routing="path" path="/login" fallbackRedirectUrl="/projects" />,
  },
  {
    path: '/register/*',
    element: <SignUp routing="path" path="/register" fallbackRedirectUrl="/projects" />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/projects', element: <ProjectDashboardPage /> },
      { path: '/projects/:id', element: <App /> },
    ],
  },
])
