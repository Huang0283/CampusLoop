import { createBrowserRouter, Navigate } from 'react-router-dom'
import RequireAuth from './RequireAuth'
import RequireRole from './RequireRole'
import { NoPermission } from '../components'
import ProfilePage from '../pages/profile'
import { PageContainer } from '../components'
import AdminPage from '../pages/admin'

const Placeholder = ({ name }: { name: string }) => (
  <PageContainer title={name}>
    <div>{name} page placeholder</div>
  </PageContainer>
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Placeholder name="Login" />,
  },
  {
    path: '/register',
    element: <Placeholder name="Register" />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Placeholder name="Home" />
      </RequireAuth>
    ),
  },
  {
  path: '/profile',
  element: (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
},
  {
    path: '/market',
    element: (
      <RequireAuth>
        <Placeholder name="Market" />
      </RequireAuth>
    ),
  },
  {
    path: '/product/:id',
    element: (
      <RequireAuth>
        <Placeholder name="Product Detail" />
      </RequireAuth>
    ),
  },
  {
    path: '/publish',
    element: (
      <RequireAuth>
        <Placeholder name="Publish Product" />
      </RequireAuth>
    ),
  },
  {
    path: '/my-products',
    element: (
      <RequireAuth>
        <Placeholder name="My Products" />
      </RequireAuth>
    ),
  },
  {
    path: '/favorites',
    element: (
      <RequireAuth>
        <Placeholder name="Favorites" />
      </RequireAuth>
    ),
  },
  {
    path: '/wanted',
    element: (
      <RequireAuth>
        <Placeholder name="Wanted Market" />
      </RequireAuth>
    ),
  },
  {
    path: '/chat',
    element: (
      <RequireAuth>
        <Placeholder name="Chat" />
      </RequireAuth>
    ),
  },
  {
    path: '/orders',
    element: (
      <RequireAuth>
        <Placeholder name="Orders" />
      </RequireAuth>
    ),
  },
  {
    path: '/meeting',
    element: (
      <RequireAuth>
        <Placeholder name="Meeting" />
      </RequireAuth>
    ),
  },
  {
    path: '/notifications',
    element: (
      <RequireAuth>
        <Placeholder name="Notifications" />
      </RequireAuth>
    ),
  },
  {
  path: '/admin',
  element: (
    <RequireAuth>
      <RequireRole role="admin">
        <AdminPage />
      </RequireRole>
    </RequireAuth>
  ),
},
  {
    path: '/403',
    element: <NoPermission />,
  },
  {
    path: '/404',
    element: <Placeholder name="Not Found" />,
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
])