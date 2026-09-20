import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

interface RequireRoleProps {
  role: string
  children: ReactNode
}

export default function RequireRole({ role, children }: RequireRoleProps) {
  const userRole = localStorage.getItem('role')

  if (userRole !== role) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}