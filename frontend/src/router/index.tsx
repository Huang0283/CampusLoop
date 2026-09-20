import { createBrowserRouter, Navigate } from 'react-router-dom'
import type { ReactElement } from 'react'
import RequireAuth from './RequireAuth'
import RequireRole from './RequireRole'
import { NoPermission } from '../components'
import RoutePlaceholder from '../components/RoutePlaceholder'
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
import MarketPage from '../pages/market'
import ProductDetailPage from '../pages/market/ProductDetailPage'
import PublishProductPage from '../pages/market/PublishProductPage'
import WantedPage from '../pages/wanted'
import MatchResultPage from '../pages/wanted/MatchResultPage'
import MyProductsPage from '../pages/market/MyProductsPage'
import FavoritesPage from '../pages/market/FavoritesPage'
import PublishWantedPage from '../pages/wanted/PublishWantedPage'
import WantedDetailPage from '../pages/wanted/WantedDetailPage'
import PriceAdvicePage from '../pages/market/PriceAdvicePage'

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
    element: <Navigate to="/market" replace />,
  },
  {
    path: '/profile',
    element: authed(<ProfilePage />),
  },
  {
    path: '/market',
    element: authed(<MarketPage />),
  },
  {
    path: '/product/:id',
    element: authed(<ProductDetailPage />),
  },
  {
    path: '/publish',
    element: authed(<PublishProductPage />),
  },
  {
    path: '/publish/price-advice',
    element: authed(<PriceAdvicePage />),
  },
  {
    path: '/my-products',
    element: authed(<MyProductsPage />),
  },
  {
    path: '/favorites',
    element: authed(<FavoritesPage />),
  },
  {
    path: '/wanted',
    element: authed(<WantedPage />),
  },
  {
    path: '/wanted/matches',
    element: authed(<MatchResultPage />),
  },
  {
    path: '/wanted/publish',
    element: authed(<PublishWantedPage />),
  },
  {
    path: '/wanted/:id',
    element: authed(<WantedDetailPage />),
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
    element: <RoutePlaceholder name="Not Found" />,
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
])
