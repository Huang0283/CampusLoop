import { Suspense } from 'react'
import { AuthPage, ProfilePage, AdminLayout, AdminDashboardPage, AdminOrdersPage, AdminAuditLogPage, AdminProfilePage, AdminReportsPage, AdminProductsPage, AdminUsersPage, CatalogPage, ProductPage, ProductFormPage, WantedListPage, WantedDetailPage, WantedFormPage, MatchesPage, PricePage, ReportsPage, OrderListPage, OrderPage, MeetupPage, ReviewPage, NotificationsPage, ChatPage, ChatListPage } from './lazyPages'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { LoadingPage, MissingPage } from '../i18n/RouteStates'
import { Guard, Shell } from '../live/common'
import { RouteFailure } from '../live/ErrorBoundary'
import { HomePage } from '../landing/HomePage'

export const router = createBrowserRouter([{ element: <Shell />, errorElement: <RouteFailure />, children: [{ element: <Suspense fallback={<LoadingPage />}><Outlet /></Suspense>, errorElement: <RouteFailure />, children: [
  { path: '/', element: <HomePage /> },
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
  { path: '/admin', element: <Guard admin><AdminLayout /></Guard>, children: [
    { index: true, element: <AdminDashboardPage /> },
    { path: 'reports', element: <AdminReportsPage /> },
    { path: 'products', element: <AdminProductsPage /> },
    { path: 'orders', element: <AdminOrdersPage /> },
    { path: 'users', element: <AdminUsersPage /> },
    { path: 'audit', element: <AdminAuditLogPage /> },
    { path: 'profile', element: <AdminProfilePage /> },
  ] },
  { path: '*', element: <MissingPage /> },
] }] }])
