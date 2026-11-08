import { Navigate } from 'react-router-dom'
import { useSession } from '../live/session'
import { LandingPage } from './LandingPage'

export function HomePage() {
  const user = useSession((state) => state.user)
  return user?.role === 'ADMIN' ? <Navigate to="/admin" replace /> : <LandingPage />
}
