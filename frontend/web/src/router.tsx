import { createBrowserRouter, Navigate } from 'react-router'
import { SignIn, SignUp } from '@clerk/react'
import App from './App'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ProjectCreatePage } from './features/projects/ProjectCreatePage'
import { ProjectDashboardPage } from './features/projects/ProjectDashboardPage'
import { AuthLayout } from './layouts/AuthLayout'

const clerkAppearance = {
  variables: {
    colorPrimary: '#185FA5',
    colorBackground: '#FFFFFF',
    colorText: '#1C2024',
    colorInputBackground: '#F3EEE6',
    borderRadius: '8px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/projects" replace /> },
  {
    path: '/login/*',
    element: (
      <AuthLayout>
        <SignIn
          routing="path"
          path="/login"
          fallbackRedirectUrl="/projects"
          appearance={clerkAppearance}
        />
      </AuthLayout>
    ),
  },
  {
    path: '/register/*',
    element: (
      <AuthLayout>
        <SignUp
          routing="path"
          path="/register"
          fallbackRedirectUrl="/projects"
          appearance={clerkAppearance}
        />
      </AuthLayout>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/projects', element: <ProjectDashboardPage /> },
      { path: '/projects/new', element: <ProjectCreatePage /> },
      { path: '/projects/:id', element: <App /> },
    ],
  },
])
