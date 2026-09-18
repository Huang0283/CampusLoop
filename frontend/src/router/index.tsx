import { createBrowserRouter, Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import RequireAuth from './RequireAuth'
import RequireRole from './RequireRole'
import { NoPermission, PageContainer } from '../components'
import ProfilePage from '../pages/profile'
import AdminPage from '../pages/admin'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import ChatListPage from '../pages/transaction/ChatListPage'
import ChatDetailPage from '../pages/transaction/ChatDetailPage'
import OrderListPage from '../pages/transaction/OrderListPage'
import OrderDetailPage from '../pages/transaction/OrderDetailPage'
import MeetupPage from '../pages/transaction/MeetupPage'
import NotificationPage from '../pages/transaction/NotificationPage'
import MyTransactionsPage from '../pages/transaction/MyTransactionsPage'

const Placeholder = ({ name }: { name: string }) => (
  <PageContainer title={name}>
    <div>{name} page placeholder</div>
  </PageContainer>
)

const authed = (element: ReactElement) => <RequireAuth>{element}</RequireAuth>

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: authed(<Placeholder name="Home" />),
  },
  {
    path: '/profile',
    element: authed(<ProfilePage />),
  },
  {
    path: '/market',
    element: authed(<Placeholder name="Market" />),
  },
  {
    path: '/product/:id',
    element: authed(<Placeholder name="Product Detail" />),
  },
  {
    path: '/publish',
    element: authed(<Placeholder name="Publish Product" />),
  },
  {
    path: '/my-products',
    element: authed(<Placeholder name="My Products" />),
  },
  {
    path: '/favorites',
    element: authed(<Placeholder name="Favorites" />),
  },
  {
    path: '/wanted',
    element: authed(<Placeholder name="Wanted Market" />),
  },

  /* ---------- M4: transaction flow ---------- */
  {
    path: '/chat',
    element: authed(<ChatListPage />),
  },
  {
    path: '/chat/:id',
    element: authed(<ChatDetailPage />),
  },
  {
    path: '/transactions',
    element: authed(<OrderListPage />),
  },
  {
    path: '/transactions/:id',
    element: authed(<OrderDetailPage />),
  },
  {
    path: '/transactions/:id/meetup',
    element: authed(<MeetupPage />),
  },
  {
    path: '/notifications',
    element: authed(<NotificationPage />),
  },
  {
    path: '/profile/transactions',
    element: authed(<MyTransactionsPage />),
  },

  /* legacy redirects */
  { path: '/orders', element: <Navigate to="/transactions" replace /> },
  { path: '/meeting', element: <Navigate to="/transactions" replace /> },

  {
    path: '/admin',
    element: authed(
      <RequireRole role="admin">
        <AdminPage />
      </RequireRole>
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