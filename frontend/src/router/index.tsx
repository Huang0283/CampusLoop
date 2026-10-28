import { Suspense } from 'react'
import { AuthPage, ProfilePage, AdminPage, CatalogPage, ProductPage, ProductFormPage, WantedListPage, WantedDetailPage, WantedFormPage, MatchesPage, PricePage, ReportsPage, OrderListPage, OrderPage, MeetupPage, ReviewPage, NotificationsPage, ChatPage, ChatListPage } from './lazyPages'
import { createBrowserRouter, Link, Navigate, Outlet } from 'react-router-dom'
import { Result } from 'antd'
import { Guard, Shell } from '../live/common'
import { RouteFailure } from '../live/ErrorBoundary'
import { LandingPage } from '../landing/LandingPage'

export const router = createBrowserRouter([{ element: <Shell />, errorElement: <RouteFailure />, children: [{ element: <Suspense fallback={<div role="status" style={{ padding: 24 }}>正在加载页面…</div>}><Outlet /></Suspense>, errorElement: <RouteFailure />, children: [
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <AuthPage /> }, { path: '/register', element: <AuthPage registering /> },
  { path: '/profile', element: <Guard><ProfilePage /></Guard> },
  { path: '/market', element: <CatalogPage /> }, { path: '/product/:id', element: <ProductPage /> },
  { path: '/my-products', element: <Guard><CatalogPage mode="mine" /></Guard> },
  { path: '/favorites', element: <Guard><CatalogPage mode="favorites" /></Guard> },
  { path: '/publish', element: <Guard><ProductFormPage /></Guard> },
  { path: '/product/:id/edit', element: <Guard><ProductFormPage /></Guard> },
  { path: '/publish/price-advice', element: <Guard><PricePage /></Guard> },
  { path: '/wanted', element: <WantedListPage /> },
  { path: '/wanted/publish', element: <Guard><WantedFormPage /></Guard> },
  { path: '/wanted/:id/edit', element: <Guard><WantedFormPage /></Guard> },
  { path: '/wanted/:id', element: <WantedDetailPage /> },
  { path: '/wanted/:wantedId/matches', element: <Guard><MatchesPage /></Guard> },
  { path: '/chat', element: <Guard><ChatListPage /></Guard> }, { path: '/chat/:id', element: <Guard><ChatPage /></Guard> },
  { path: '/transactions', element: <Guard><OrderListPage /></Guard> },
  { path: '/transactions/:id', element: <Guard><OrderPage /></Guard> },
  { path: '/transactions/:id/meetup', element: <Guard><MeetupPage /></Guard> },
  { path: '/transactions/:id/review', element: <Guard><ReviewPage /></Guard> },
  { path: '/notifications', element: <Guard><NotificationsPage /></Guard> },
  { path: '/report', element: <Guard><ReportsPage /></Guard> },
  { path: '/orders', element: <Navigate to="/transactions" replace /> },
  { path: '/orders/:id', element: <Guard><OrderPage /></Guard> },
  { path: '/orders/:id/review', element: <Guard><ReviewPage /></Guard> },
  { path: '/profile/transactions', element: <Navigate to="/transactions" replace /> },
  { path: '/admin', element: <Guard admin><AdminPage /></Guard> },
  { path: '*', element: <Result status="404" title="页面不存在" extra={<Link to="/market">返回首页</Link>} /> },
] }] }])
