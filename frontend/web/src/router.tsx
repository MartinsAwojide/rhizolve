import { createBrowserRouter, Navigate } from 'react-router'
import App from './App'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ProjectCreatePage } from './features/projects/ProjectCreatePage'
import { ProjectDashboardPage } from './features/projects/ProjectDashboardPage'
import { LoginScreen, RegisterScreen } from './routes/AuthScreens'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/projects" replace /> },
  { path: '/login/*', element: <LoginScreen /> },
  { path: '/register/*', element: <RegisterScreen /> },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/projects', element: <ProjectDashboardPage /> },
      { path: '/projects/new', element: <ProjectCreatePage /> },
      { path: '/projects/:id', element: <App /> },
      { path: '/projects/:id/investigations/:investigationId', element: <App /> },
    ],
  },
])
