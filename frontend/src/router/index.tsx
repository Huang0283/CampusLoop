import { createBrowserRouter, Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import RequireAuth from './RequireAuth'
import RequireRole from './RequireRole'
<<<<<<< HEAD
import { NoPermission } from '../components'
import ProfilePage from '../pages/profile'
import { PageContainer } from '../components'
import AdminPage from '../pages/admin'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
=======
import { NoPermission, PageContainer } from '../components'

import PrototypeLoginPage from '../pages/PrototypeLoginPage'
import ChatListPage from '../pages/transaction/ChatListPage'
import ChatDetailPage from '../pages/transaction/ChatDetailPage'
import OrderListPage from '../pages/transaction/OrderListPage'
import OrderDetailPage from '../pages/transaction/OrderDetailPage'
import MeetupPage from '../pages/transaction/MeetupPage'
import NotificationPage from '../pages/transaction/NotificationPage'
import MyTransactionsPage from '../pages/transaction/MyTransactionsPage'
>>>>>>> 6d04b3101b5cc1527bcf0a0f6cb6d82ecf1ffa92

const Placeholder = ({ name }: { name: string }) => (
  <PageContainer title={name}>
    <div>{name} page placeholder</div>
  </PageContainer>
)

const authed = (element: ReactElement) => <RequireAuth>{element}</RequireAuth>

export const router = createBrowserRouter([
  {
<<<<<<< HEAD
  path: '/login',
  element: <LoginPage />,
},
{
  path: '/register',
  element: <RegisterPage />,
},
=======
    path: '/login',
    element: <PrototypeLoginPage />,
  },
  {
    path: '/register',
    element: <Placeholder name="Register" />,
  },
>>>>>>> 6d04b3101b5cc1527bcf0a0f6cb6d82ecf1ffa92
  {
    path: '/',
    element: authed(<Placeholder name="Home" />),
  },
  {
<<<<<<< HEAD
  path: '/profile',
  element: (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
},
=======
    path: '/profile',
    element: authed(<Placeholder name="Profile" />),
  },
>>>>>>> 6d04b3101b5cc1527bcf0a0f6cb6d82ecf1ffa92
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

  /* ---------- M4：交易流程前端 ---------- */
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
<<<<<<< HEAD
  path: '/admin',
  element: (
    <RequireAuth>
      <RequireRole role="admin">
        <AdminPage />
      </RequireRole>
    </RequireAuth>
  ),
},
=======
    path: '/profile/transactions',
    element: authed(<MyTransactionsPage />),
  },
  /* 旧路径兼容重定向 */
  { path: '/orders', element: <Navigate to="/transactions" replace /> },
  { path: '/meeting', element: <Navigate to="/transactions" replace /> },

  {
    path: '/admin',
    element: authed(
      <RequireRole role="admin">
        <Placeholder name="Admin" />
      </RequireRole>
    ),
  },
>>>>>>> 6d04b3101b5cc1527bcf0a0f6cb6d82ecf1ffa92
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
