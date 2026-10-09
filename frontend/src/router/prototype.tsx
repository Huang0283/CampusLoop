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
import ReviewPage from '../pages/transaction/ReviewPage'

const authed = (element: ReactElement) => <RequireAuth>{element}</RequireAuth>
const student = (element: ReactElement) => authed(
  <RequireRole role="student">{element}</RequireRole>
)

export const prototypeRouter = createBrowserRouter([
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
    element: student(<ProfilePage />),
  },
  {
    path: '/market',
    element: (<MarketPage />),
  },
  {
    path: '/product/:id',
    element: (<ProductDetailPage />),
  },
  {
    path: '/publish',
    element: student(<PublishProductPage />),
  },
  {
    path: '/product/:id/edit',
    element: student(<PublishProductPage />),
  },
  {
    path: '/publish/price-advice',
    element: student(<PriceAdvicePage />),
  },
  {
    path: '/my-products',
    element: student(<MyProductsPage />),
  },
  {
    path: '/favorites',
    element: student(<FavoritesPage />),
  },
  {
    path: '/wanted',
    element: (<WantedPage />),
  },
  {
    path: '/wanted/matches',
    element: student(<Navigate to="/wanted" replace />),
  },
  {
    path: '/wanted/:wantedId/matches',
    element: student(<MatchResultPage />),
  },
  {
    path: '/wanted/publish',
    element: student(<PublishWantedPage />),
  },
  {
    path: '/wanted/:id/edit',
    element: student(<PublishWantedPage />),
  },
  {
    path: '/wanted/:id',
    element: (<WantedDetailPage />),
  },

  /* ---------- M4: transaction flow ---------- */
  {
    path: '/chat',
    element: student(<ChatListPage />),
  },
  {
    path: '/chat/:id',
    element: student(<ChatDetailPage />),
  },
  {
    path: '/transactions',
    element: student(<OrderListPage />),
  },
  {
    path: '/transactions/:id',
    element: student(<OrderDetailPage />),
  },
  {
    path: '/transactions/:id/meetup',
    element: student(<MeetupPage />),
  },
  {
    path: '/notifications',
    element: student(<NotificationPage />),
  },
  {
    // 兼容旧书签：个人交易中心已统一到订单列表，不让旧入口变成 404。
    path: '/profile/transactions',
    element: student(<Navigate to="/transactions" replace />),
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
  {
    path: '/transactions/:id/review',
    element: student(<ReviewPage />),
  },
])
